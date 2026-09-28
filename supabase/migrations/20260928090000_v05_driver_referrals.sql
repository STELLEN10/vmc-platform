-- VMC v0.5 Driver Referrals
-- The referral schema already exists in the modular control plane.
-- This migration adds the secure driver-facing lifecycle and a direct
-- reference to the referred driver record used by the current VMC onboarding flow.

alter table public.driver_referrals
  add column if not exists referred_driver_id uuid references public.drivers(id) on delete set null;

create index if not exists driver_referrals_referred_driver_idx
  on public.driver_referrals(referred_driver_id);

-- One open referral relationship per referred driver.
create unique index if not exists driver_referrals_one_open_referred_driver_idx
  on public.driver_referrals(referred_driver_id)
  where referred_driver_id is not null
    and status not in ('cancelled', 'rewarded');

create or replace function public.create_driver_referral()
returns table(referral_id uuid, referral_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_driver_id uuid;
  v_existing public.driver_referrals%rowtype;
  v_code text;
  v_id uuid;
begin
  if public.current_app_role() <> 'driver' then
    raise exception 'Only VMC drivers can create referral codes';
  end if;

  select id into v_driver_id
  from public.drivers
  where profile_id = auth.uid()
    and status = 'active'
  limit 1;

  if v_driver_id is null then
    raise exception 'An active VMC driver record is required before creating referrals';
  end if;

  select *
  into v_existing
  from public.driver_referrals
  where referrer_driver_id = v_driver_id
    and status not in ('cancelled', 'rewarded')
  order by created_at desc
  limit 1;

  if found then
    return query select v_existing.id, v_existing.referral_code;
    return;
  end if;

  loop
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    exit when not exists (
      select 1 from public.driver_referrals where driver_referrals.referral_code = v_code
    );
  end loop;

  insert into public.driver_referrals(referrer_driver_id, referral_code, status)
  values (v_driver_id, v_code, 'created')
  returning id into v_id;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, new_values)
  values (
    auth.uid(),
    'driver_referral_created',
    'driver_referral',
    v_id,
    jsonb_build_object('referral_code', v_code)
  );

  return query select v_id, v_code;
end;
$$;

create or replace function public.claim_referral_for_driver(
  p_referred_driver_id uuid,
  p_referral_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.driver_referrals%rowtype;
begin
  if not public.is_management() then
    raise exception 'Only VMC management can attach referral relationships';
  end if;

  if p_referred_driver_id is null or nullif(trim(p_referral_code), '') is null then
    raise exception 'Referred driver and referral code are required';
  end if;

  select r.*
  into v_referral
  from public.driver_referrals r
  where upper(r.referral_code) = upper(trim(p_referral_code))
    and r.status = 'created'
  for update;

  if not found then
    raise exception 'Referral code is invalid, already used, or no longer active';
  end if;

  if v_referral.referrer_driver_id = p_referred_driver_id then
    raise exception 'A driver cannot refer themselves';
  end if;

  if not exists (
    select 1
    from public.drivers d
    join public.profiles p on p.id = d.profile_id
    where d.id = p_referred_driver_id
      and p.role = 'driver'
  ) then
    raise exception 'Referred driver record could not be verified';
  end if;

  update public.driver_referrals
  set referred_driver_id = p_referred_driver_id,
      status = 'applied',
      updated_at = now()
  where id = v_referral.id;

  return v_referral.id;
end;
$$;

create or replace function public.qualify_driver_referral(
  p_referral_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_referral public.driver_referrals%rowtype;
begin
  if not public.is_management() then
    raise exception 'Only VMC management can qualify referrals';
  end if;

  select *
  into v_referral
  from public.driver_referrals
  where id = p_referral_id
  for update;

  if not found then
    raise exception 'Referral not found';
  end if;

  if v_referral.status in ('cancelled', 'rewarded') then
    raise exception 'This referral can no longer be qualified';
  end if;

  if v_referral.referred_driver_id is null then
    raise exception 'The referred driver has not been linked yet';
  end if;

  update public.driver_referrals
  set status = 'qualified',
      qualification_note = nullif(trim(p_note), ''),
      qualified_at = coalesce(qualified_at, now()),
      updated_at = now()
  where id = p_referral_id;

  insert into public.referral_rewards(referral_id, amount, status)
  values (p_referral_id, 250.00, 'reward_pending')
  on conflict (referral_id) do update
    set amount = 250.00,
        status = case
          when public.referral_rewards.status = 'rewarded' then public.referral_rewards.status
          else 'reward_pending'
        end,
        updated_at = now();
end;
$$;

create or replace function public.cancel_driver_referral(
  p_referral_id uuid,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_management() then
    raise exception 'Only VMC management can cancel referrals';
  end if;

  update public.driver_referrals
  set status = 'cancelled',
      qualification_note = nullif(trim(p_note), ''),
      updated_at = now()
  where id = p_referral_id
    and status not in ('cancelled', 'rewarded');

  if not found then
    raise exception 'Referral not found or no longer cancellable';
  end if;

  update public.referral_rewards
  set status = 'cancelled',
      updated_at = now()
  where referral_id = p_referral_id
    and status <> 'rewarded';
end;
$$;

create or replace function public.reward_driver_referral(
  p_referral_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward public.referral_rewards%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only VMC administrators can mark referral rewards as paid';
  end if;

  select *
  into v_reward
  from public.referral_rewards
  where referral_id = p_referral_id
  for update;

  if not found then
    raise exception 'Referral reward not found';
  end if;

  if v_reward.status <> 'reward_pending' then
    raise exception 'Referral reward is not pending';
  end if;

  update public.referral_rewards
  set status = 'rewarded',
      paid_at = now(),
      processed_by = auth.uid(),
      updated_at = now()
  where id = v_reward.id;

  update public.driver_referrals
  set status = 'rewarded',
      updated_at = now()
  where id = p_referral_id;
end;
$$;

revoke all on function public.create_driver_referral() from public;
revoke all on function public.claim_referral_for_driver(uuid, text) from public;
revoke all on function public.qualify_driver_referral(uuid, text) from public;
revoke all on function public.cancel_driver_referral(uuid, text) from public;
revoke all on function public.reward_driver_referral(uuid) from public;

grant execute on function public.create_driver_referral() to authenticated;
grant execute on function public.claim_referral_for_driver(uuid, text) to authenticated;
grant execute on function public.qualify_driver_referral(uuid, text) to authenticated;
grant execute on function public.cancel_driver_referral(uuid, text) to authenticated;
grant execute on function public.reward_driver_referral(uuid) to authenticated;
