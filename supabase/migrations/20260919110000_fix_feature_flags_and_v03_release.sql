-- ============================================================================
-- VMC PLATFORM: FIX FEATURE FLAGS & RELEASE LINKING FOR VERSION 0.3.0
-- Ensures service_requests exists, links features to v0.3.0 / v0.3.0-beta.1,
-- synchronizes feature_flag_environments, and updates RPCs for resilient resolution.
-- ============================================================================

-- 1. Ensure service_requests exists in feature_flags
insert into public.feature_flags (key, description, enabled)
values
  ('service_requests', 'Scheduled and requested bike service bookings.', true),
  ('new_maintenance', 'Driver issue reporting and repair workflow.', true),
  ('parts_inventory', 'Parts and stock management.', true),
  ('emergency_bike_support', 'Emergency motorcycle support workflow.', true)
on conflict (key) do update set
  enabled = true,
  description = coalesce(excluded.description, public.feature_flags.description);

-- 2. Ensure both 'v0.3.0' and 'v0.3.0-beta.1' exist in releases with 'active' status
insert into public.releases (version, channel, status, release_notes, activated_at)
values
  ('v0.3.0', 'stable', 'active', 'Operations: Maintenance, Parts Inventory, Emergency Support, Service Booking.', now()),
  ('v0.3.0-beta.1', 'beta', 'active', 'Operations beta suite.', now())
on conflict (version) do update set
  status = 'active',
  activated_at = coalesce(public.releases.activated_at, now());

-- 3. Link all v0.3.0 feature flags into release_features for both releases
insert into public.release_features (release_id, feature_flag_id)
select r.id, f.id
from public.releases r
cross join public.feature_flags f
where r.version in ('v0.3.0', 'v0.3.0-beta.1')
  and f.key in ('new_maintenance', 'parts_inventory', 'emergency_bike_support', 'service_requests')
on conflict (release_id, feature_flag_id) do nothing;

-- 4. Synchronize feature_flag_environments for all environments
insert into public.feature_flag_environments (feature_flag_id, environment, enabled)
select f.id, e.environment, f.enabled
from public.feature_flags f
cross join (values ('development'::public.feature_environment), ('preview'::public.feature_environment), ('production'::public.feature_environment)) as e(environment)
on conflict (feature_flag_id, environment) do update set
  enabled = excluded.enabled,
  updated_at = now();

-- 5. UPDATE RPC: set_feature_flag
-- Automatically keeps feature_flag_environments in sync across all environments
create or replace function public.set_feature_flag(
  p_key text,
  p_enabled boolean,
  p_description text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  flag_id uuid;
  previous_enabled boolean;
  mapped_release_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only VMC administrators can change feature flags';
  end if;
  if lower(trim(p_key)) = 'core_platform' and not p_enabled then
    raise exception 'The core platform cannot be disabled';
  end if;

  -- Upsert feature flag
  insert into public.feature_flags (key, enabled, description)
  values (lower(trim(p_key)), p_enabled, nullif(trim(p_description), ''))
  on conflict (key) do update set
    enabled = excluded.enabled,
    description = coalesce(nullif(trim(p_description), ''), public.feature_flags.description)
  returning id, enabled into flag_id, previous_enabled;

  -- Synchronize all environments
  insert into public.feature_flag_environments (feature_flag_id, environment, enabled)
  select flag_id, e.environment, p_enabled
  from (values ('development'::public.feature_environment), ('preview'::public.feature_environment), ('production'::public.feature_environment)) as e(environment)
  on conflict (feature_flag_id, environment) do update set
    enabled = excluded.enabled,
    updated_at = now();

  -- Link to release_features if release exists
  insert into public.release_features (release_id, feature_flag_id)
  select r.id, flag_id
  from public.releases r
  where (
    (lower(trim(p_key)) in ('new_maintenance', 'parts_inventory', 'emergency_bike_support', 'service_requests') and r.version in ('v0.3.0', 'v0.3.0-beta.1')) or
    (lower(trim(p_key)) in ('new_payment_engine', 'historical_payments', 'payment_proof_upload', 'payment_verification') and r.version in ('v0.2.0', 'v0.2.0-beta.1')) or
    (lower(trim(p_key)) in ('core_platform') and r.version in ('v0.1.0'))
  )
  on conflict (release_id, feature_flag_id) do nothing;

  select release_id into mapped_release_id from public.release_features where feature_flag_id = flag_id limit 1;
  if mapped_release_id is not null then
    insert into public.release_events(release_id, actor_id, action, feature_flag_id, previous_value, new_value, note)
    values (mapped_release_id, (select auth.uid()), 'feature_flag_changed', flag_id, jsonb_build_object('enabled', previous_enabled), jsonb_build_object('enabled', p_enabled), nullif(trim(p_description), ''));
  end if;

  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_values, new_values)
  values ((select auth.uid()), 'feature_flag_changed', 'feature_flag', flag_id, jsonb_build_object('enabled', previous_enabled), jsonb_build_object('enabled', p_enabled));
end;
$$;

-- 6. UPDATE RPC: create_release
-- Automatically links features matching the release version
create or replace function public.create_release(
  p_version text,
  p_channel public.release_channel,
  p_release_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare
  release_id uuid;
  clean_version text;
begin
  if not public.is_admin() then
    raise exception 'Only VMC administrators can create releases';
  end if;

  clean_version := nullif(trim(p_version), '');

  insert into public.releases (version, channel, release_notes, created_by)
  values (clean_version, p_channel, nullif(trim(p_release_notes), ''), (select auth.uid()))
  on conflict (version) do update set
    channel = excluded.channel,
    release_notes = coalesce(excluded.release_notes, public.releases.release_notes)
  returning id into release_id;

  insert into public.release_events (release_id, actor_id, next_status, note)
  values (release_id, (select auth.uid()), 'draft', 'Release created');

  -- Auto-map feature flags to this release
  if clean_version like 'v0.1%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('core_platform')
    on conflict do nothing;
  elsif clean_version like 'v0.2%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('new_payment_engine', 'historical_payments', 'payment_proof_upload', 'payment_verification')
    on conflict do nothing;
  elsif clean_version like 'v0.3%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('new_maintenance', 'parts_inventory', 'emergency_bike_support', 'service_requests')
    on conflict do nothing;
  elsif clean_version like 'v0.4%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('notification_system', 'payment_reminders')
    on conflict do nothing;
  elsif clean_version like 'v0.5%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('driver_referrals')
    on conflict do nothing;
  elsif clean_version like 'v0.6%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('application_system', 'new_onboarding', 'ai_document_check')
    on conflict do nothing;
  elsif clean_version like 'v0.7%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('ai_parts_assistant')
    on conflict do nothing;
  elsif clean_version like 'v0.8%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('invoice_integration', 'mpg_integration')
    on conflict do nothing;
  elsif clean_version like 'v0.9%' then
    insert into public.release_features (release_id, feature_flag_id)
    select release_id, id from public.feature_flags where key in ('whatsapp_notifications', 'email_notifications', 'sms_notifications', 'push_notifications')
    on conflict do nothing;
  end if;

  return release_id;
end;
$$;

-- 7. UPDATE RPC: feature_is_enabled
-- Resilient resolution: supports matching release prefixes and coalesce on environment
create or replace function public.feature_is_enabled(
  p_key text,
  p_environment public.feature_environment default 'production'
) returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from public.feature_flags f
    join public.release_features rf on rf.feature_flag_id = f.id
    join public.releases r on r.id = rf.release_id and r.status = 'active'
    left join public.feature_flag_environments fe on fe.feature_flag_id = f.id and fe.environment = p_environment
    where f.key = lower(trim(p_key))
      and f.enabled
      and coalesce(fe.enabled, true)
      and (
        not exists (select 1 from public.feature_flag_assignments a where a.feature_flag_id = f.id)
        or exists (
          select 1 from public.feature_flag_assignments a
          where a.feature_flag_id = f.id
            and (a.profile_id = (select auth.uid()) or a.role = public.current_app_role())
        )
      )
  )
$$;

-- Re-grant execute privileges to authenticated
grant execute on function public.feature_is_enabled(text, public.feature_environment) to authenticated;
grant execute on function public.set_feature_flag(text, boolean, text) to authenticated;
grant execute on function public.create_release(text, public.release_channel, text) to authenticated;
