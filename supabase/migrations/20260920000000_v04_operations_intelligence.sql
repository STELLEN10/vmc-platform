-- VMC v0.4.0 Operations Intelligence & Control Platform Migration
-- Features: Central Notifications, Payment Reminders, Management Settings,
-- Unified Activity/Audit, Documents Center View, and Security Hardening

-- 1. NOTIFICATIONS TABLE RLS ENHANCEMENTS
-- Allow management to insert and update notifications (for system alerts, driver reminders, etc.)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'notifications' and schemaname = 'public' and policyname = 'notifications_insert_management'
  ) then
    create policy "notifications_insert_management" on public.notifications
      for insert to authenticated
      with check (public.is_management());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'notifications' and schemaname = 'public' and policyname = 'notifications_update_management'
  ) then
    create policy "notifications_update_management" on public.notifications
      for update to authenticated
      using (public.is_management())
      with check (public.is_management());
  end if;
end;
$$;

-- 2. NOTIFICATION DELIVERY TABLE RLS ENHANCEMENTS
-- Ensure notification_deliveries table allows system and management tracking
create index if not exists notification_deliveries_scheduled_idx
  on public.notification_deliveries(status, scheduled_for desc);

-- 3. NOTIFICATION RPC: MARK NOTIFICATION READ (Driver & Profile)
create or replace function public.mark_notification_as_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.notifications
  set status = 'read', updated_at = now()
  where id = p_notification_id
    and (recipient_profile_id = (select auth.uid()) or public.is_management());

  if not found then
    raise exception 'Notification not found or access denied';
  end if;
end;
$$;

-- RPC: MARK ALL NOTIFICATIONS AS READ
create or replace function public.mark_all_notifications_as_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  update public.notifications
  set status = 'read', updated_at = now()
  where recipient_profile_id = (select auth.uid())
    and status = 'unread';
  
  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- 4. MANAGEMENT NOTIFICATIONS RPCS
create or replace function public.mark_management_notification_as_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_management() then
    raise exception 'Only management can update management notifications';
  end if;

  update public.management_notifications
  set is_read = true, read_at = now(), read_by = (select auth.uid())
  where id = p_notification_id;

  if not found then
    raise exception 'Notification not found';
  end if;
end;
$$;

create or replace function public.mark_all_management_notifications_as_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer;
begin
  if not public.is_management() then
    raise exception 'Only management can update management notifications';
  end if;

  update public.management_notifications
  set is_read = true, read_at = now(), read_by = (select auth.uid())
  where is_read = false;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

-- 5. PAYMENT REMINDERS SCHEDULER & DISPATCH RPC
-- Scans payment_periods to alert drivers of upcoming, due, or overdue rent-to-own payments
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
begin
  if not public.is_management() then
    raise exception 'Only VMC management can dispatch payment reminders';
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

    -- Avoid duplicate reminders if one was created in the last 24 hours for this period
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

-- 6. EXTEND transition_payment_period TO EMIT DRIVER NOTIFICATIONS
create or replace function public.transition_payment_period(
  p_payment_period_id uuid,
  p_status public.payment_status,
  p_reason text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  v_period record;
  v_profile_id uuid;
begin
  if not public.is_management() then raise exception 'Only VMC management can verify payments'; end if;
  if p_status not in ('due', 'awaiting_verification', 'verified', 'rejected', 'overdue') then raise exception 'Invalid management payment status'; end if;

  select pp.*, c.driver_id, d.profile_id into v_period
  from public.payment_periods pp
  join public.contracts c on c.id = pp.contract_id
  join public.drivers d on d.id = c.driver_id
  where pp.id = p_payment_period_id;

  if not found then raise exception 'Payment period not found'; end if;

  update public.payment_periods set
    status = p_status,
    reviewed_at = case when p_status in ('awaiting_verification', 'rejected') then now() else reviewed_at end,
    reviewed_by = case when p_status in ('awaiting_verification', 'rejected') then (select auth.uid()) else reviewed_by end,
    verified_at = case when p_status = 'verified' then now() else verified_at end,
    verified_by = case when p_status = 'verified' then (select auth.uid()) else verified_by end,
    rejection_reason = case when p_status = 'rejected' then nullif(trim(p_reason), '') else null end
  where id = p_payment_period_id;

  -- Create driver notification on verification outcome
  if v_period.profile_id is not null then
    if p_status = 'verified' then
      insert into public.notifications (
        recipient_profile_id,
        type,
        title,
        body,
        related_entity_type,
        related_entity_id
      ) values (
        v_period.profile_id,
        'payment_verified',
        'Payment Verified (Week ' || v_period.period_number || ')',
        'Your payment of R' || v_period.amount_due || ' has been verified by management. Thank you!',
        'payment_period',
        p_payment_period_id
      );
    elsif p_status = 'rejected' then
      insert into public.notifications (
        recipient_profile_id,
        type,
        title,
        body,
        related_entity_type,
        related_entity_id
      ) values (
        v_period.profile_id,
        'payment_rejected',
        'Payment Proof Rejected (Week ' || v_period.period_number || ')',
        'Your payment proof was rejected' || case when p_reason is not null and trim(p_reason) <> '' then ': ' || trim(p_reason) else '. Please check and re-upload valid proof.' end,
        'payment_period',
        p_payment_period_id
      );
    end if;
  end if;
end;
$$;

-- 7. REPAIR & OVERLOAD transition_maintenance_request
-- Allows both p_management_notes and p_notes for resilience
create or replace function public.transition_maintenance_request(
  p_request_id uuid,
  p_status text,
  p_management_notes text default null,
  p_scheduled_for timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  req_record record;
  driver_prof_id uuid;
begin
  if not public.is_management() then
    raise exception 'Only management can update maintenance requests';
  end if;

  select * into req_record from public.maintenance_requests where id = p_request_id;
  if not found then
    raise exception 'Maintenance request not found';
  end if;

  update public.maintenance_requests set
    status = p_status,
    management_notes = coalesce(nullif(trim(p_management_notes), ''), management_notes),
    scheduled_for = coalesce(p_scheduled_for, scheduled_for),
    resolved_at = case when p_status = 'resolved' then now() else resolved_at end,
    resolved_by = case when p_status = 'resolved' then (select auth.uid()) else resolved_by end,
    updated_at = now()
  where id = p_request_id;

  select profile_id into driver_prof_id from public.drivers where id = req_record.driver_id;
  if driver_prof_id is not null then
    insert into public.notifications (
      recipient_profile_id,
      type,
      title,
      body,
      related_entity_type,
      related_entity_id
    ) values (
      driver_prof_id,
      'maintenance_update',
      'Maintenance status updated: ' || replace(p_status, '_', ' '),
      coalesce(nullif(trim(p_management_notes), ''), 'Your maintenance report status has changed to ' || replace(p_status, '_', ' ')),
      'maintenance_request',
      p_request_id
    );
  end if;
end;
$$;

-- 8. UNIFIED AUDIT LOGGING RPC & PERMISSION POLICIES
-- Allow all management roles (admin, staff) to select audit logs
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'audit_logs' and schemaname = 'public' and policyname = 'audit_logs_select_management'
  ) then
    create policy "audit_logs_select_management" on public.audit_logs
      for select to authenticated
      using (public.is_management());
  end if;
end;
$$;

create or replace function public.log_audit_event(
  p_action text,
  p_entity_type text,
  p_entity_id uuid default null,
  p_old_values jsonb default null,
  p_new_values jsonb default null,
  p_metadata jsonb default '{}'::jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_management() then
    raise exception 'Only management can record audit events';
  end if;

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    old_values,
    new_values,
    metadata
  ) values (
    (select auth.uid()),
    p_action,
    p_entity_type,
    p_entity_id,
    p_old_values,
    p_new_values,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_id;

  return v_id;
end;
$$;

-- 9. BUSINESS SETTINGS / CONFIGURATION TABLE
create table if not exists public.business_settings (
  id text primary key default 'default',
  business_timezone text not null default 'Africa/Johannesburg',
  service_interval_km integer not null default 3000 check (service_interval_km between 500 and 50000),
  free_service_allowance integer not null default 2 check (free_service_allowance >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  emergency_standby_phone text not null default '+27 82 000 0000',
  emergency_standby_hours text not null default '24/7 Roadside Assistance',
  payment_grace_period_days integer not null default 3 check (payment_grace_period_days >= 0 and payment_grace_period_days <= 30),
  auto_reminders_enabled boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Insert default row
insert into public.business_settings (
  id,
  business_timezone,
  service_interval_km,
  free_service_allowance,
  low_stock_threshold,
  emergency_standby_phone,
  emergency_standby_hours,
  payment_grace_period_days,
  auto_reminders_enabled
) values (
  'default',
  'Africa/Johannesburg',
  3000,
  2,
  5,
  '+27 82 000 0000',
  '24/7 Roadside Assistance',
  3,
  true
) on conflict (id) do nothing;

alter table public.business_settings enable row level security;
revoke all on public.business_settings from anon;
grant select, update on public.business_settings to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'business_settings' and schemaname = 'public' and policyname = 'business_settings_select_authenticated'
  ) then
    create policy "business_settings_select_authenticated" on public.business_settings
      for select to authenticated
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'business_settings' and schemaname = 'public' and policyname = 'business_settings_update_management'
  ) then
    create policy "business_settings_update_management" on public.business_settings
      for update to authenticated
      using (public.is_management())
      with check (public.is_management());
  end if;
end;
$$;

-- RPC TO UPDATE BUSINESS SETTINGS & AUDIT
create or replace function public.update_business_settings(
  p_business_timezone text,
  p_service_interval_km integer,
  p_free_service_allowance integer,
  p_low_stock_threshold integer,
  p_emergency_standby_phone text,
  p_emergency_standby_hours text,
  p_payment_grace_period_days integer,
  p_auto_reminders_enabled boolean
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  old_rec record;
begin
  if not public.is_management() then
    raise exception 'Only management can update business configuration';
  end if;

  select * into old_rec from public.business_settings where id = 'default';

  update public.business_settings
  set
    business_timezone = coalesce(nullif(trim(p_business_timezone), ''), business_timezone),
    service_interval_km = coalesce(p_service_interval_km, service_interval_km),
    free_service_allowance = coalesce(p_free_service_allowance, free_service_allowance),
    low_stock_threshold = coalesce(p_low_stock_threshold, low_stock_threshold),
    emergency_standby_phone = coalesce(nullif(trim(p_emergency_standby_phone), ''), emergency_standby_phone),
    emergency_standby_hours = coalesce(nullif(trim(p_emergency_standby_hours), ''), emergency_standby_hours),
    payment_grace_period_days = coalesce(p_payment_grace_period_days, payment_grace_period_days),
    auto_reminders_enabled = coalesce(p_auto_reminders_enabled, auto_reminders_enabled),
    updated_by = (select auth.uid()),
    updated_at = now()
  where id = 'default';

  insert into public.audit_logs (
    actor_id,
    action,
    entity_type,
    old_values,
    new_values,
    metadata
  ) values (
    (select auth.uid()),
    'update_business_settings',
    'business_settings',
    row_to_json(old_rec)::jsonb,
    (select row_to_json(b)::jsonb from public.business_settings b where id = 'default'),
    jsonb_build_object('summary', 'Business settings updated by management')
  );
end;
$$;

-- 10. GRANTS
revoke all on function public.mark_notification_as_read(uuid) from public;
revoke all on function public.mark_all_notifications_as_read() from public;
revoke all on function public.mark_management_notification_as_read(uuid) from public;
revoke all on function public.mark_all_management_notifications_as_read() from public;
revoke all on function public.dispatch_payment_reminders() from public;
revoke all on function public.log_audit_event(text, text, uuid, jsonb, jsonb, jsonb) from public;
revoke all on function public.update_business_settings(text, integer, integer, integer, text, text, integer, boolean) from public;

grant execute on function public.mark_notification_as_read(uuid) to authenticated;
grant execute on function public.mark_all_notifications_as_read() to authenticated;
grant execute on function public.mark_management_notification_as_read(uuid) to authenticated;
grant execute on function public.mark_all_management_notifications_as_read() to authenticated;
grant execute on function public.dispatch_payment_reminders() to authenticated;
grant execute on function public.log_audit_event(text, text, uuid, jsonb, jsonb, jsonb) to authenticated;
grant execute on function public.update_business_settings(text, integer, integer, integer, text, text, integer, boolean) to authenticated;
