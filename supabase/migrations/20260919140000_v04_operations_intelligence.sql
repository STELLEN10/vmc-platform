-- VMC Platform v0.4.0 Operations Intelligence & Control Architecture Migration
-- Release target: v0.4.0 / v0.4.0-beta.1

-- 1. Ensure phone_number compatibility column exists on profiles
alter table public.profiles
  add column if not exists phone_number text;

-- Keep phone_number synced with phone
update public.profiles set phone_number = phone where phone_number is null and phone is not null;

-- 2. System Settings / Business Configuration Table
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  category text not null default 'general',
  description text,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.system_settings enable row level security;
revoke all on public.system_settings from anon;
grant select on public.system_settings to authenticated;
grant insert, update, delete on public.system_settings to authenticated;

-- Management read, Admin write
create policy "system_settings_select_authorized"
  on public.system_settings for select to authenticated
  using (public.is_management());

create policy "system_settings_write_admin"
  on public.system_settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Seed default business configuration settings
insert into public.system_settings (key, value, category, description)
values
  ('business_timezone', '"Africa/Johannesburg"'::jsonb, 'operational', 'Standard VMC business timezone for schedules and notifications'),
  ('standard_service_interval_km', '3000'::jsonb, 'service', 'Standard recurring service interval for HERO Eco 150 fleet in kilometers'),
  ('first_service_interval_km', '1000'::jsonb, 'service', 'First run-in service milestone for newly deployed motorcycles'),
  ('major_service_interval_km', '6000'::jsonb, 'service', 'Comprehensive major inspection milestone for drivetrain and chassis'),
  ('free_service_allowance', '3'::jsonb, 'service', 'Number of complimentary service vouchers allocated per standard lease contract'),
  ('default_low_stock_threshold', '5'::jsonb, 'inventory', 'Default threshold quantity to trigger low-stock alerts on parts'),
  ('emergency_hotline_phone', '"+27 11 888 0192"'::jsonb, 'emergency', 'VMC 24/7 central roadside emergency hotline'),
  ('emergency_whatsapp_number', '"+27 82 555 0192"'::jsonb, 'emergency', 'VMC roadside rapid response WhatsApp dispatch channel'),
  ('payment_grace_period_days', '2'::jsonb, 'finance', 'Grace period in days before a missed weekly payment transitions to overdue'),
  ('contract_default_weekly_amount', '650'::jsonb, 'finance', 'Default weekly rental amount in ZAR for standard driver contracts'),
  ('contract_default_total_weeks', '104'::jsonb, 'finance', 'Default rent-to-own contract duration in weeks (2 years)')
on conflict (key) do update set
  description = coalesce(excluded.description, public.system_settings.description);

-- 3. Relax management_notifications type constraint to allow all operational event types
do $$
begin
  if exists (
    select 1 from pg_constraint
    where conname = 'management_notifications_type_check'
      and conrelid = 'public.management_notifications'::regclass
  ) then
    alter table public.management_notifications drop constraint management_notifications_type_check;
  end if;
end;
$$;

-- Add extra metadata columns to management_notifications if not present
alter table public.management_notifications
  add column if not exists related_entity_type text,
  add column if not exists related_entity_id uuid,
  add column if not exists action_url text,
  add column if not exists severity text default 'normal';

-- Ensure notifications table (from core operations) has action_url and proper index
alter table public.notifications
  add column if not exists action_url text;

create index if not exists notifications_recipient_status_idx
  on public.notifications(recipient_profile_id, status, created_at desc);

create index if not exists management_notifications_read_created_idx
  on public.management_notifications(read_at, created_at desc);

-- 4. Notification Management Helper Functions (Security Definer)
create or replace function public.mark_notification_read(
  p_notification_id uuid,
  p_is_read boolean default true
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := (select auth.uid());
  is_mgmt boolean := public.is_management();
begin
  -- First attempt updating in public.notifications
  update public.notifications
  set status = case when p_is_read then 'read'::public.notification_status else 'unread'::public.notification_status end,
      read_at = case when p_is_read then now() else null end
  where id = p_notification_id
    and (recipient_profile_id = caller_id or is_mgmt);

  -- Next attempt updating in public.management_notifications if caller is management
  if is_mgmt then
    update public.management_notifications
    set read_at = case when p_is_read then now() else null end,
        read_by = case when p_is_read then caller_id else null end
    where id = p_notification_id;
  end if;
end;
$$;

create or replace function public.mark_all_notifications_read()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := (select auth.uid());
  is_mgmt boolean := public.is_management();
begin
  update public.notifications
  set status = 'read'::public.notification_status,
      read_at = now()
  where recipient_profile_id = caller_id
    and status != 'read';

  if is_mgmt then
    update public.management_notifications
    set read_at = now(),
        read_by = caller_id
    where read_at is null;
  end if;
end;
$$;

revoke all on function public.mark_notification_read(uuid, boolean) from public;
revoke all on function public.mark_all_notifications_read() from public;
grant execute on function public.mark_notification_read(uuid, boolean) to authenticated;
grant execute on function public.mark_all_notifications_read() to authenticated;

-- 5. Global Search Security Definer RPC for Management Command Palette
create or replace function public.search_global(p_query text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_query text := trim(p_query);
  pattern text;
  result jsonb := '{}'::jsonb;
  drivers_json jsonb := '[]'::jsonb;
  bikes_json jsonb := '[]'::jsonb;
  contracts_json jsonb := '[]'::jsonb;
  maintenance_json jsonb := '[]'::jsonb;
  emergencies_json jsonb := '[]'::jsonb;
  parts_json jsonb := '[]'::jsonb;
begin
  if not public.is_management() then
    raise exception 'Unauthorized: Global search is restricted to VMC Management';
  end if;

  if length(clean_query) < 2 then
    return jsonb_build_object(
      'drivers', '[]'::jsonb,
      'bikes', '[]'::jsonb,
      'contracts', '[]'::jsonb,
      'maintenance', '[]'::jsonb,
      'emergencies', '[]'::jsonb,
      'parts', '[]'::jsonb
    );
  end if;

  pattern := '%' || lower(clean_query) || '%';

  -- 1. Search Drivers (profiles & onboardings)
  select coalesce(jsonb_agg(d), '[]'::jsonb) into drivers_json
  from (
    select
      p.id,
      p.full_name as title,
      coalesce(p.email, p.phone, '') as subtitle,
      p.role,
      '/management/drivers/' || p.id as url
    from public.profiles p
    where p.role = 'driver'
      and (lower(p.full_name) like pattern or lower(coalesce(p.email, '')) like pattern or lower(coalesce(p.phone, '')) like pattern)
    limit 6
  ) d;

  -- 2. Search Bikes
  select coalesce(jsonb_agg(b), '[]'::jsonb) into bikes_json
  from (
    select
      bk.id,
      bk.model || ' (' || coalesce(bk.registration_number, 'Pending') || ')' as title,
      bk.brand || ' · ' || coalesce(bk.colour, 'Unknown') || ' · ' || bk.status::text as subtitle,
      '/management/bikes/' || bk.id as url
    from public.bikes bk
    where lower(bk.model) like pattern
       or lower(coalesce(bk.registration_number, '')) like pattern
       or lower(coalesce(bk.vin, '')) like pattern
       or lower(coalesce(bk.engine_number, '')) like pattern
    limit 6
  ) b;

  -- 3. Search Contracts
  select coalesce(jsonb_agg(c), '[]'::jsonb) into contracts_json
  from (
    select
      ct.id,
      'Contract: ' || p.full_name as title,
      'R' || ct.weekly_amount || '/wk · ' || ct.status::text as subtitle,
      '/management/drivers/' || p.id as url
    from public.contracts ct
    join public.drivers dr on dr.id = ct.driver_id
    join public.profiles p on p.id = dr.profile_id
    where lower(p.full_name) like pattern or lower(coalesce(p.email, '')) like pattern or ct.id::text like pattern
    limit 5
  ) c;

  -- 4. Search Maintenance
  select coalesce(jsonb_agg(m), '[]'::jsonb) into maintenance_json
  from (
    select
      mr.id,
      mr.title,
      mr.category::text || ' · ' || mr.status::text || ' · ' || mr.severity::text as subtitle,
      '/management/maintenance' as url
    from public.maintenance_requests mr
    where lower(mr.title) like pattern or lower(mr.description) like pattern
    limit 5
  ) m;

  -- 5. Search Emergencies
  select coalesce(jsonb_agg(e), '[]'::jsonb) into emergencies_json
  from (
    select
      er.id,
      'Emergency: ' || replace(er.emergency_type::text, '_', ' ') as title,
      er.severity::text || ' · ' || er.status::text || ' · ' || coalesce(er.location_description, '') as subtitle,
      '/management/emergency' as url
    from public.emergency_reports er
    where lower(er.description) like pattern or lower(coalesce(er.location_description, '')) like pattern or er.emergency_type::text like pattern
    limit 5
  ) e;

  -- 6. Search Parts
  select coalesce(jsonb_agg(pt), '[]'::jsonb) into parts_json
  from (
    select
      p.id,
      p.name as title,
      'SKU: ' || p.sku || ' · ' || p.status::text || ' · Stock: ' || p.quantity_in_stock as subtitle,
      '/management/inventory' as url
    from public.parts p
    where lower(p.name) like pattern or lower(p.sku) like pattern or lower(coalesce(p.category, '')) like pattern
    limit 5
  ) pt;

  return jsonb_build_object(
    'drivers', drivers_json,
    'bikes', bikes_json,
    'contracts', contracts_json,
    'maintenance', maintenance_json,
    'emergencies', emergencies_json,
    'parts', parts_json
  );
end;
$$;

revoke all on function public.search_global(text) from public;
grant execute on function public.search_global(text) to authenticated;

-- 6. Register v0.4 Release and Features in Modular Control Plane
insert into public.releases (version, channel, status, release_notes)
values
  ('v0.4.0', 'stable', 'draft', 'VMC Operations Intelligence Suite: Comprehensive Analytics, Global Search, Unified Documents, Audit Activity, Dynamic Settings, and Enhanced Driver Dashboard.'),
  ('v0.4.0-beta.1', 'beta', 'active', 'Beta channel for v0.4.0 Operations Intelligence Suite with live notification delivery, real-time metrics and document management.')
on conflict (version) do update set
  release_notes = coalesce(excluded.release_notes, public.releases.release_notes);

-- Seed feature flags for v0.4
insert into public.feature_flags (key, enabled, description)
values
  ('v0_4_operations_intelligence', false, 'Master flag for v0.4.0 Operations Intelligence & Analytics suite'),
  ('analytics_reporting', false, 'Fleet, driver, financial, and maintenance operational analytics reporting'),
  ('financial_operations', false, 'Unified financial dashboard, payment reconciliation, and contract balances'),
  ('documents_management', false, 'Central secure document registry for contracts, payment proofs, and incident attachments'),
  ('audit_activity_log', false, 'Unified audit trail and timeline across all VMC entities'),
  ('global_search', false, 'Cross-entity command palette and search bar for management'),
  ('management_settings', false, 'Dynamic business rules and operational settings control'),
  ('driver_dashboard_v2', false, 'Enhanced driver experience centering My Bike, active payments, and service tracking'),
  ('notification_system', false, 'Central notification center and real-time operational badges'),
  ('payment_reminders', false, 'Automated payment reminder delivery for upcoming and overdue periods')
on conflict (key) do update set
  description = coalesce(excluded.description, public.feature_flags.description);

-- Link features to releases in public.release_features
insert into public.release_features (release_id, feature_key)
select r.id, f.key
from public.releases r
cross join (
  values
    ('v0_4_operations_intelligence'),
    ('analytics_reporting'),
    ('financial_operations'),
    ('documents_management'),
    ('audit_activity_log'),
    ('global_search'),
    ('management_settings'),
    ('driver_dashboard_v2'),
    ('notification_system'),
    ('payment_reminders')
) as f(key)
where r.version in ('v0.4.0', 'v0.4.0-beta.1')
on conflict (release_id, feature_key) do nothing;

-- Enable feature flags in development and preview environments so testers can use them immediately,
-- while keeping production guarded until activated by admin.
insert into public.feature_flag_environments (feature_key, environment, enabled)
values
  ('v0_4_operations_intelligence', 'development', true),
  ('v0_4_operations_intelligence', 'preview', true),
  ('analytics_reporting', 'development', true),
  ('analytics_reporting', 'preview', true),
  ('financial_operations', 'development', true),
  ('financial_operations', 'preview', true),
  ('documents_management', 'development', true),
  ('documents_management', 'preview', true),
  ('audit_activity_log', 'development', true),
  ('audit_activity_log', 'preview', true),
  ('global_search', 'development', true),
  ('global_search', 'preview', true),
  ('management_settings', 'development', true),
  ('management_settings', 'preview', true),
  ('driver_dashboard_v2', 'development', true),
  ('driver_dashboard_v2', 'preview', true),
  ('notification_system', 'development', true),
  ('notification_system', 'preview', true),
  ('payment_reminders', 'development', true),
  ('payment_reminders', 'preview', true)
on conflict (feature_key, environment) do update set
  enabled = excluded.enabled;
