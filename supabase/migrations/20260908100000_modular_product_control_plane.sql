-- VMC modular product control plane. Future product domains are present but
-- remain inaccessible until an administrator enables their deployed feature.

create type public.feature_environment as enum ('development', 'preview', 'production');
create type public.application_status as enum ('draft', 'submitted', 'ai_check', 'human_review', 'changes_requested', 'approved', 'rejected', 'scheduled', 'completed');
create type public.service_area_status as enum ('within_service_area', 'outside_service_area', 'needs_review');
create type public.document_status as enum ('uploaded', 'ai_pending', 'ai_checked', 'human_review', 'accepted', 'rejected');
create type public.referral_status as enum ('created', 'applied', 'qualified', 'reward_pending', 'rewarded', 'cancelled');
create type public.reminder_status as enum ('scheduled', 'sent', 'cancelled', 'failed');

create table public.release_features (
  release_id uuid not null references public.releases(id) on delete cascade,
  feature_flag_id uuid not null references public.feature_flags(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (release_id, feature_flag_id)
);

create table public.feature_flag_environments (
  feature_flag_id uuid not null references public.feature_flags(id) on delete cascade,
  environment public.feature_environment not null,
  enabled boolean not null default false,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (feature_flag_id, environment)
);

create table public.feature_flag_assignments (
  id uuid primary key default gen_random_uuid(),
  feature_flag_id uuid not null references public.feature_flags(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role public.app_role,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(profile_id, role) = 1),
  unique nulls not distinct (feature_flag_id, profile_id, role)
);

alter table public.release_events add column if not exists action text not null default 'release_status_changed';
alter table public.release_events add column if not exists feature_flag_id uuid references public.feature_flags(id) on delete set null;
alter table public.release_events add column if not exists previous_value jsonb;
alter table public.release_events add column if not exists new_value jsonb;
alter table public.release_events add column if not exists metadata jsonb not null default '{}'::jsonb;

create table public.driver_applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status public.application_status not null default 'draft',
  full_name text not null default '',
  email text,
  phone text,
  residential_address text,
  delivery_platforms text[] not null default '{}',
  service_area_status public.service_area_status not null default 'needs_review',
  referral_code text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint application_platforms_known check (delivery_platforms <@ array['uber_eats', 'checkers_sixty60', 'mr_d', 'takealot']::text[]),
  unique (profile_id)
);
create index driver_applications_status_created_idx on public.driver_applications(status, created_at desc);

create table public.application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.driver_applications(id) on delete cascade,
  document_type text not null check (document_type in ('identity_document', 'driver_licence', 'proof_of_address', 'other')),
  storage_bucket text not null,
  storage_path text not null,
  original_file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  status public.document_status not null default 'uploaded',
  ai_result jsonb,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);
create index application_documents_application_idx on public.application_documents(application_id, created_at desc);

create table public.bike_report_media (
  id uuid primary key default gen_random_uuid(),
  bike_report_id uuid not null references public.bike_reports(id) on delete cascade,
  storage_bucket text not null,
  storage_path text not null,
  mime_type text not null check (mime_type like 'image/%' or mime_type like 'video/%'),
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create table public.driver_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_driver_id uuid not null references public.drivers(id) on delete restrict,
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{6,20}$'),
  referred_application_id uuid references public.driver_applications(id) on delete set null,
  status public.referral_status not null default 'created',
  qualification_note text,
  qualified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index driver_referrals_open_code_idx on public.driver_referrals(referrer_driver_id) where status not in ('cancelled', 'rewarded');

create table public.referral_rewards (
  id uuid primary key default gen_random_uuid(),
  referral_id uuid not null unique references public.driver_referrals(id) on delete restrict,
  amount numeric(12,2) not null default 250.00 check (amount >= 0),
  status public.referral_status not null default 'reward_pending' check (status in ('reward_pending', 'rewarded', 'cancelled')),
  paid_at timestamptz,
  processed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications(id) on delete cascade,
  provider text not null check (provider in ('in_app', 'email', 'whatsapp', 'sms', 'push')),
  status public.reminder_status not null default 'scheduled',
  scheduled_for timestamptz,
  sent_at timestamptz,
  provider_reference text,
  failure_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notification_deliveries_pending_idx on public.notification_deliveries(status, scheduled_for) where status = 'scheduled';

create table public.integration_connections (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique check (provider in ('invoice_system', 'mpg', 'ai', 'email', 'whatsapp', 'sms', 'push')),
  state text not null default 'not_connected' check (state in ('not_connected', 'configured', 'unavailable', 'mock_mode')),
  display_name text not null,
  configuration_note text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- The bucket is intentionally private. Object upload/download policies are
-- added alongside the document-upload service, which will enforce a scoped
-- application path. Until then, Storage's deny-by-default RLS exposes nothing.
insert into storage.buckets (id, name, public)
values ('vmc-application-documents', 'vmc-application-documents', false)
on conflict (id) do update set public = false;

create trigger feature_flag_environments_set_updated_at before update on public.feature_flag_environments for each row execute procedure public.set_updated_at();
create trigger driver_applications_set_updated_at before update on public.driver_applications for each row execute procedure public.set_updated_at();
create trigger application_documents_set_updated_at before update on public.application_documents for each row execute procedure public.set_updated_at();
create trigger driver_referrals_set_updated_at before update on public.driver_referrals for each row execute procedure public.set_updated_at();
create trigger referral_rewards_set_updated_at before update on public.referral_rewards for each row execute procedure public.set_updated_at();
create trigger notification_deliveries_set_updated_at before update on public.notification_deliveries for each row execute procedure public.set_updated_at();
create trigger integration_connections_set_updated_at before update on public.integration_connections for each row execute procedure public.set_updated_at();

-- A safe resolver: it returns only the caller's allowed state for one key.
-- No client can mutate a flag, target itself, or bypass release activation.
create or replace function public.feature_is_enabled(p_key text, p_environment public.feature_environment default 'production')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.feature_flags f
    join public.feature_flag_environments fe on fe.feature_flag_id = f.id and fe.environment = p_environment
    join public.release_features rf on rf.feature_flag_id = f.id
    join public.releases r on r.id = rf.release_id and r.status = 'active'
    where f.key = lower(trim(p_key))
      and f.enabled
      and fe.enabled
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

create or replace function public.set_feature_flag(
  p_key text,
  p_enabled boolean,
  p_description text default null
) returns void language plpgsql security definer set search_path = public as $$
declare flag_id uuid;
declare previous_enabled boolean;
declare mapped_release_id uuid;
begin
  if not public.is_admin() then raise exception 'Only VMC administrators can change feature flags'; end if;
  if lower(trim(p_key)) = 'core_platform' and not p_enabled then raise exception 'The core platform cannot be disabled'; end if;
  select id, enabled into flag_id, previous_enabled from public.feature_flags where key = lower(trim(p_key)) for update;
  if not found then raise exception 'Unknown VMC feature flag'; end if;
  update public.feature_flags set enabled = p_enabled, description = coalesce(nullif(trim(p_description), ''), description) where id = flag_id;
  select release_id into mapped_release_id from public.release_features where feature_flag_id = flag_id limit 1;
  if mapped_release_id is not null then
    insert into public.release_events(release_id, actor_id, action, feature_flag_id, previous_value, new_value, note)
    values (mapped_release_id, (select auth.uid()), 'feature_flag_changed', flag_id, jsonb_build_object('enabled', previous_enabled), jsonb_build_object('enabled', p_enabled), nullif(trim(p_description), ''));
  end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, old_values, new_values)
  values ((select auth.uid()), 'feature_flag_changed', 'feature_flag', flag_id, jsonb_build_object('enabled', previous_enabled), jsonb_build_object('enabled', p_enabled));
end;
$$;

create or replace function public.assign_feature_flag_tester(
  p_key text,
  p_profile_id uuid default null,
  p_role public.app_role default null
) returns void language plpgsql security definer set search_path = public as $$
declare flag_id uuid;
begin
  if not public.is_admin() then raise exception 'Only VMC administrators can assign beta access'; end if;
  if num_nonnulls(p_profile_id, p_role) <> 1 then raise exception 'Choose exactly one user or role target'; end if;
  select id into flag_id from public.feature_flags where key = lower(trim(p_key));
  if not found then raise exception 'Unknown VMC feature flag'; end if;
  insert into public.feature_flag_assignments(feature_flag_id, profile_id, role, created_by)
  values (flag_id, p_profile_id, p_role, (select auth.uid()))
  on conflict (feature_flag_id, profile_id, role) do nothing;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, new_values)
  values ((select auth.uid()), 'feature_beta_tester_assigned', 'feature_flag', flag_id, jsonb_build_object('profile_id', p_profile_id, 'role', p_role));
end;
$$;

alter table public.release_features enable row level security;
alter table public.feature_flag_environments enable row level security;
alter table public.feature_flag_assignments enable row level security;
alter table public.driver_applications enable row level security;
alter table public.application_documents enable row level security;
alter table public.bike_report_media enable row level security;
alter table public.driver_referrals enable row level security;
alter table public.referral_rewards enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.integration_connections enable row level security;

revoke all on public.release_features, public.feature_flag_environments, public.feature_flag_assignments, public.driver_applications, public.application_documents, public.bike_report_media, public.driver_referrals, public.referral_rewards, public.notification_deliveries, public.integration_connections from anon;
grant select, insert, update, delete on public.release_features, public.feature_flag_environments, public.feature_flag_assignments, public.driver_applications, public.application_documents, public.bike_report_media, public.driver_referrals, public.referral_rewards, public.notification_deliveries, public.integration_connections to authenticated;

create policy "release_features_select_management" on public.release_features for select to authenticated using (public.is_management());
create policy "release_features_admin_write" on public.release_features for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "flag_environments_select_management" on public.feature_flag_environments for select to authenticated using (public.is_management());
create policy "flag_environments_admin_write" on public.feature_flag_environments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "flag_assignments_select_admin" on public.feature_flag_assignments for select to authenticated using (public.is_admin());
create policy "flag_assignments_admin_write" on public.feature_flag_assignments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "applications_select_authorized" on public.driver_applications for select to authenticated using (profile_id = (select auth.uid()) or public.is_management());
create policy "applications_insert_own" on public.driver_applications for insert to authenticated with check (profile_id = (select auth.uid()) and status = 'draft');
create policy "applications_update_own_draft" on public.driver_applications for update to authenticated using (profile_id = (select auth.uid()) and status in ('draft', 'changes_requested')) with check (profile_id = (select auth.uid()) and status in ('draft', 'submitted'));
create policy "applications_management_write" on public.driver_applications for all to authenticated using (public.is_management()) with check (public.is_management());
create policy "application_documents_select_authorized" on public.application_documents for select to authenticated using (public.is_management() or exists (select 1 from public.driver_applications a where a.id = application_documents.application_id and a.profile_id = (select auth.uid())));
create policy "application_documents_insert_own" on public.application_documents for insert to authenticated with check (exists (select 1 from public.driver_applications a where a.id = application_documents.application_id and a.profile_id = (select auth.uid()) and a.status in ('draft', 'changes_requested')));
create policy "application_documents_management_write" on public.application_documents for all to authenticated using (public.is_management()) with check (public.is_management());
create policy "bike_report_media_select_authorized" on public.bike_report_media for select to authenticated using (public.is_management() or exists (select 1 from public.bike_reports b where b.id = bike_report_media.bike_report_id and public.is_driver_owner(b.driver_id)));
create policy "bike_report_media_insert_own" on public.bike_report_media for insert to authenticated with check (created_by = (select auth.uid()) and exists (select 1 from public.bike_reports b where b.id = bike_report_media.bike_report_id and public.is_driver_owner(b.driver_id)));
create policy "referrals_select_authorized" on public.driver_referrals for select to authenticated using (public.is_management() or public.is_driver_owner(referrer_driver_id));
create policy "referrals_management_write" on public.driver_referrals for all to authenticated using (public.is_management()) with check (public.is_management());
create policy "rewards_select_authorized" on public.referral_rewards for select to authenticated using (public.is_management() or exists (select 1 from public.driver_referrals r where r.id = referral_rewards.referral_id and public.is_driver_owner(r.referrer_driver_id)));
create policy "rewards_management_write" on public.referral_rewards for all to authenticated using (public.is_management()) with check (public.is_management());
create policy "deliveries_select_management" on public.notification_deliveries for select to authenticated using (public.is_management());
create policy "deliveries_management_write" on public.notification_deliveries for all to authenticated using (public.is_management()) with check (public.is_management());
create policy "integration_connections_admin_only" on public.integration_connections for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on function public.feature_is_enabled(text, public.feature_environment) from public;
revoke all on function public.assign_feature_flag_tester(text, uuid, public.app_role) from public;
grant execute on function public.feature_is_enabled(text, public.feature_environment) to authenticated;
grant execute on function public.assign_feature_flag_tester(text, uuid, public.app_role) to authenticated;

-- Release catalogue. Only the stable core is enabled; every future domain is
-- compiled/schema-ready but locked until an explicit administrative action.
insert into public.releases(version, channel, status, release_notes, activated_at)
values
  ('v0.1.0', 'stable', 'active', 'Secure VMC platform foundation.', now()),
  ('v0.2.0-beta.1', 'beta', 'paused', 'Fleet and payments beta.'),
  ('v0.3.0-beta.1', 'beta', 'paused', 'Maintenance and parts beta.'),
  ('v0.4.0-beta.1', 'beta', 'paused', 'Notifications beta.'),
  ('v0.5.0-beta.1', 'beta', 'paused', 'Referrals beta.'),
  ('v0.6.0-beta.1', 'beta', 'paused', 'Applications beta.'),
  ('v0.7.0-beta.1', 'beta', 'paused', 'AI parts beta.'),
  ('v0.8.0-beta.1', 'beta', 'paused', 'Integrations beta.'),
  ('v0.9.0-beta.1', 'beta', 'paused', 'Communications beta.')
on conflict (version) do nothing;

insert into public.feature_flags(key, description, enabled) values
  ('core_platform', 'Authentication, authorization and secure VMC foundation.', true),
  ('new_payment_engine', 'Weekly payments, schedules and payment state.', false),
  ('historical_payments', 'Historical and adjusted payment records.', false),
  ('payment_proof_upload', 'Private payment proof submission.', false),
  ('payment_verification', 'Management payment verification workflow.', false),
  ('new_maintenance', 'Driver issue reporting and repair workflow.', false),
  ('parts_inventory', 'Parts and stock management.', false),
  ('emergency_bike_support', 'Emergency motorcycle support workflow.', false),
  ('notification_system', 'Internal notification delivery.', false),
  ('payment_reminders', 'Scheduled payment reminders.', false),
  ('driver_referrals', 'Driver referral and reward workflow.', false),
  ('application_system', 'Driver applications and human review.', false),
  ('new_onboarding', 'Extended onboarding workflow.', false),
  ('ai_document_check', 'AI-assisted document pre-check.', false),
  ('ai_parts_assistant', 'AI-assisted parts lookup.', false),
  ('invoice_integration', 'Approved invoice-system integration.', false),
  ('mpg_integration', 'Approved MPG integration.', false),
  ('whatsapp_notifications', 'WhatsApp notification provider.', false),
  ('email_notifications', 'Email notification provider.', false),
  ('sms_notifications', 'SMS notification provider.', false),
  ('push_notifications', 'Push notification provider.', false)
on conflict (key) do nothing;

insert into public.release_features(release_id, feature_flag_id)
select r.id, f.id from public.releases r join public.feature_flags f on (
  (r.version = 'v0.1.0' and f.key = 'core_platform') or
  (r.version = 'v0.2.0-beta.1' and f.key in ('new_payment_engine', 'historical_payments', 'payment_proof_upload', 'payment_verification')) or
  (r.version = 'v0.3.0-beta.1' and f.key in ('new_maintenance', 'parts_inventory', 'emergency_bike_support')) or
  (r.version = 'v0.4.0-beta.1' and f.key in ('notification_system', 'payment_reminders')) or
  (r.version = 'v0.5.0-beta.1' and f.key = 'driver_referrals') or
  (r.version = 'v0.6.0-beta.1' and f.key in ('application_system', 'new_onboarding', 'ai_document_check')) or
  (r.version = 'v0.7.0-beta.1' and f.key = 'ai_parts_assistant') or
  (r.version = 'v0.8.0-beta.1' and f.key in ('invoice_integration', 'mpg_integration')) or
  (r.version = 'v0.9.0-beta.1' and f.key in ('whatsapp_notifications', 'email_notifications', 'sms_notifications', 'push_notifications'))
) on conflict do nothing;

insert into public.feature_flag_environments(feature_flag_id, environment, enabled)
select f.id, e.environment, f.key = 'core_platform'
from public.feature_flags f cross join (values ('development'::public.feature_environment), ('preview'::public.feature_environment), ('production'::public.feature_environment)) as e(environment)
on conflict (feature_flag_id, environment) do nothing;

insert into public.integration_connections(provider, display_name, state) values
  ('invoice_system', 'Invoice system', 'not_connected'), ('mpg', 'MPG', 'not_connected'),
  ('ai', 'AI provider', 'not_connected'), ('email', 'Email provider', 'not_connected'),
  ('whatsapp', 'WhatsApp provider', 'not_connected'), ('sms', 'SMS provider', 'not_connected'), ('push', 'Push provider', 'not_connected')
on conflict (provider) do nothing;
