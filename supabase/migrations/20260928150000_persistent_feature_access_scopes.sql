-- VMC persistent feature access.
-- Management/global state lives in feature_flags.enabled.
-- Driver-facing state lives in feature_flags.driver_enabled.
-- This removes runtime dependence on a local JSON file and allows a driver
-- feature to be hidden/blocked without disabling the corresponding management UI.

alter table public.feature_flags
  add column if not exists driver_enabled boolean not null default true;

-- Preserve the existing effective state for all pre-existing features.
update public.feature_flags
set driver_enabled = enabled
where driver_enabled is distinct from enabled;

create or replace function public.feature_is_enabled(
  p_key text,
  p_environment public.feature_environment default 'production'
) returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.feature_flags f
    join public.feature_flag_environments fe
      on fe.feature_flag_id = f.id
     and fe.environment = p_environment
    join public.release_features rf
      on rf.feature_flag_id = f.id
    join public.releases r
      on r.id = rf.release_id
     and r.status = 'active'
    where f.key = lower(trim(p_key))
      and f.enabled
      and fe.enabled
      and (
        public.current_app_role() is distinct from 'driver'
        or f.driver_enabled
      )
      and (
        not exists (
          select 1
          from public.feature_flag_assignments a
          where a.feature_flag_id = f.id
        )
        or exists (
          select 1
          from public.feature_flag_assignments a
          where a.feature_flag_id = f.id
            and (
              a.profile_id = (select auth.uid())
              or a.role = public.current_app_role()
            )
        )
      )
  );
$$;

revoke all on function public.feature_is_enabled(text, public.feature_environment) from public;
grant execute on function public.feature_is_enabled(text, public.feature_environment) to authenticated;

-- Keep the legacy mutation RPC compatible with the new column.
-- Existing flags keep their driver override when the management/global state
-- is changed; Release Control uses its privileged server action for explicit
-- driver-scope changes.
create or replace function public.set_feature_flag(
  p_key text,
  p_enabled boolean,
  p_description text default null
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  flag_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only VMC administrators can change feature flags';
  end if;

  if lower(trim(p_key)) = 'core_platform' and not p_enabled then
    raise exception 'The core platform cannot be disabled';
  end if;

  insert into public.feature_flags(key, enabled, driver_enabled, description)
  values (
    lower(trim(p_key)),
    p_enabled,
    p_enabled,
    nullif(trim(p_description), '')
  )
  on conflict (key) do update set
    enabled = excluded.enabled,
    description = coalesce(nullif(trim(p_description), ''), public.feature_flags.description)
  returning id into flag_id;

  insert into public.feature_flag_environments(feature_flag_id, environment, enabled, updated_by)
  select
    flag_id,
    e.environment,
    p_enabled,
    (select auth.uid())
  from (
    values
      ('development'::public.feature_environment),
      ('preview'::public.feature_environment),
      ('production'::public.feature_environment)
  ) e(environment)
  on conflict (feature_flag_id, environment) do update set
    enabled = excluded.enabled,
    updated_by = excluded.updated_by,
    updated_at = now();
end;
$$;

revoke all on function public.set_feature_flag(text, boolean, text) from public;
grant execute on function public.set_feature_flag(text, boolean, text) to authenticated;


-- Scheduled payment reminders are driver-facing even though their dispatch
-- control lives in VMC Management. Keep the management page/action available,
-- but stop delivery when driver access for the reminder feature is OFF.
create or replace function public.dispatch_payment_reminders()
returns table (
  processed_count integer,
  upcoming_count integer,
  due_count integer,
  overdue_count integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_processed integer := 0;
  v_upcoming integer := 0;
  v_due integer := 0;
  v_overdue integer := 0;
  v_reminder_type text;
  v_title text;
  v_body text;
  v_notif_id uuid;
  v_driver_reminders_enabled boolean;
begin
  if not public.is_management() then
    raise exception 'Only VMC management can dispatch payment reminders';
  end if;

  select exists (
    select 1
    from public.feature_flags f
    join public.feature_flag_environments fe
      on fe.feature_flag_id = f.id
     and fe.environment = 'production'
    join public.release_features rf
      on rf.feature_flag_id = f.id
    join public.releases rel
      on rel.id = rf.release_id
     and rel.status = 'active'
    where f.key = 'payment_reminders'
      and f.enabled
      and f.driver_enabled
      and fe.enabled
  )
  into v_driver_reminders_enabled;

  if not coalesce(v_driver_reminders_enabled, false) then
    return query select 0, 0, 0, 0;
    return;
  end if;

  for r in
    select
      pp.id as period_id,
      pp.contract_id,
      pp.period_number,
      pp.due_date,
      pp.amount_due,
      pp.status as payment_status,
      c.driver_id,
      d.profile_id,
      p.full_name as driver_name,
      b.registration as bike_registration
    from public.payment_periods pp
    join public.contracts c on c.id = pp.contract_id
    join public.drivers d on d.id = c.driver_id
    join public.profiles p on p.id = d.profile_id
    left join public.bikes b on b.id = c.bike_id
    where c.status = 'active'
      and pp.status in ('due', 'overdue')
      and pp.due_date <= (current_date + interval '3 days')
  loop
    if r.due_date < current_date then
      v_reminder_type := 'payment_overdue';
      v_title := 'Payment Overdue (Week ' || r.period_number || ')';
      v_body := 'Your weekly payment of R' || r.amount_due || ' was due on ' || r.due_date || '. Please upload proof of payment immediately to keep your motorcycle active.';
      v_overdue := v_overdue + 1;
    elsif r.due_date = current_date then
      v_reminder_type := 'payment_due_today';
      v_title := 'Payment Due Today (Week ' || r.period_number || ')';
      v_body := 'Your weekly rent-to-own payment of R' || r.amount_due || ' is due today (' || r.due_date || '). Please submit proof of payment.';
      v_due := v_due + 1;
    else
      v_reminder_type := 'payment_upcoming';
      v_title := 'Upcoming Payment (Week ' || r.period_number || ')';
      v_body := 'Reminder: Weekly payment of R' || r.amount_due || ' is due on ' || r.due_date || '.';
      v_upcoming := v_upcoming + 1;
    end if;

    if not exists (
      select 1 from public.notifications
      where recipient_profile_id = r.profile_id
        and related_entity_id = r.period_id
        and created_at >= (now() - interval '24 hours')
    ) then
      insert into public.notifications (
        recipient_profile_id,
        channel,
        type,
        title,
        body,
        status,
        related_entity_type,
        related_entity_id
      ) values (
        r.profile_id,
        'in_app',
        v_reminder_type,
        v_title,
        v_body,
        'unread',
        'payment_period',
        r.period_id
      ) returning id into v_notif_id;

      insert into public.notification_deliveries (
        notification_id,
        channel,
        status,
        scheduled_for,
        sent_at,
        metadata
      ) values (
        v_notif_id,
        'in_app',
        'sent',
        now(),
        now(),
        jsonb_build_object(
          'contract_id', r.contract_id,
          'period_number', r.period_number,
          'due_date', r.due_date,
          'amount_due', r.amount_due
        )
      );

      v_processed := v_processed + 1;
    end if;
  end loop;

  return query select v_processed, v_upcoming, v_due, v_overdue;
end;
$$;

revoke all on function public.dispatch_payment_reminders() from public;
grant execute on function public.dispatch_payment_reminders() to authenticated;
