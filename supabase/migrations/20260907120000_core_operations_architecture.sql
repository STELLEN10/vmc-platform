-- VMC core operations architecture. All client access is deny-by-default and
-- policy checks use database-derived roles rather than submitted role values.

alter type public.bike_status add value if not exists 'repair';
alter type public.bike_status add value if not exists 'retired';

create type public.bike_assignment_status as enum ('assigned', 'returned', 'ended');
create type public.contract_status as enum ('draft', 'active', 'completed', 'cancelled', 'suspended');
create type public.payment_status as enum ('upcoming', 'due', 'submitted', 'awaiting_verification', 'verified', 'rejected', 'overdue');
create type public.payment_record_source as enum ('scheduled', 'historical', 'adjustment');
create type public.notification_channel as enum ('in_app');
create type public.notification_status as enum ('unread', 'read');
create type public.bike_report_category as enum ('engine', 'brakes', 'tyres', 'electrical', 'battery', 'lights', 'chain', 'suspension', 'body', 'other', 'emergency');
create type public.bike_report_severity as enum ('low', 'medium', 'high', 'emergency');
create type public.bike_report_status as enum ('reported', 'under_review', 'awaiting_part', 'repair_scheduled', 'in_repair', 'resolved', 'closed');
create type public.inventory_movement_type as enum ('opening_balance', 'adjustment', 'received', 'used', 'returned');
create type public.release_channel as enum ('stable', 'beta');
create type public.release_status as enum ('draft', 'testing', 'active', 'paused', 'rolled_back', 'retired');

create table public.bike_assignments (
  id uuid primary key default gen_random_uuid(),
  bike_id uuid not null references public.bikes(id) on delete restrict,
  driver_id uuid not null references public.drivers(id) on delete restrict,
  assigned_at date not null default current_date,
  ended_at date,
  status public.bike_assignment_status not null default 'assigned',
  assigned_by uuid references public.profiles(id) on delete set null,
  end_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'assigned' and ended_at is null) or (status <> 'assigned' and ended_at is not null))
);
create unique index bike_assignments_one_active_bike_idx on public.bike_assignments(bike_id) where status = 'assigned';
create unique index bike_assignments_one_active_driver_idx on public.bike_assignments(driver_id) where status = 'assigned';
create index bike_assignments_driver_history_idx on public.bike_assignments(driver_id, assigned_at desc);

create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete restrict,
  bike_id uuid not null references public.bikes(id) on delete restrict,
  start_date date not null,
  weekly_amount numeric(12, 2) not null check (weekly_amount > 0),
  total_weeks integer not null check (total_weeks > 0 and total_weeks <= 520),
  payment_weekday smallint not null check (payment_weekday between 0 and 6),
  status public.contract_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index contracts_one_active_driver_idx on public.contracts(driver_id) where status = 'active';
create index contracts_driver_status_idx on public.contracts(driver_id, status);

create table public.payment_periods (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.contracts(id) on delete restrict,
  period_number integer not null check (period_number > 0),
  due_date date not null,
  amount_due numeric(12, 2) not null check (amount_due > 0),
  status public.payment_status not null default 'upcoming',
  source public.payment_record_source not null default 'scheduled',
  original_payment_date date,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  verified_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  verified_by uuid references public.profiles(id) on delete set null,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, period_number)
);
create index payment_periods_contract_due_idx on public.payment_periods(contract_id, due_date);
create index payment_periods_status_due_idx on public.payment_periods(status, due_date);

create table public.payment_proofs (
  id uuid primary key default gen_random_uuid(),
  payment_period_id uuid not null references public.payment_periods(id) on delete restrict,
  storage_bucket text not null,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 10485760),
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);
create index payment_proofs_period_idx on public.payment_proofs(payment_period_id);

create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_period_id uuid not null references public.payment_periods(id) on delete restrict,
  actor_id uuid references public.profiles(id) on delete set null,
  previous_status public.payment_status,
  next_status public.payment_status not null,
  reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index payment_events_period_created_idx on public.payment_events(payment_period_id, created_at desc);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_profile_id uuid not null references public.profiles(id) on delete cascade,
  channel public.notification_channel not null default 'in_app',
  type text not null,
  title text not null,
  body text not null,
  status public.notification_status not null default 'unread',
  related_entity_type text,
  related_entity_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_recipient_status_idx on public.notifications(recipient_profile_id, status, created_at desc);

create table public.bike_reports (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete restrict,
  bike_id uuid references public.bikes(id) on delete set null,
  category public.bike_report_category not null,
  severity public.bike_report_severity not null default 'medium',
  description text not null check (char_length(trim(description)) >= 10),
  status public.bike_report_status not null default 'reported',
  location_description text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bike_reports_status_created_idx on public.bike_reports(status, created_at desc);

create table public.parts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sku text unique,
  compatible_model text,
  unit_price numeric(12, 2) check (unit_price is null or unit_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  minimum_stock_level integer not null default 0 check (minimum_stock_level >= 0),
  supplier text,
  status text not null default 'in_stock' check (status in ('in_stock', 'low_stock', 'out_of_stock', 'discontinued')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  part_id uuid not null references public.parts(id) on delete restrict,
  movement_type public.inventory_movement_type not null,
  quantity_delta integer not null check (quantity_delta <> 0),
  reason text,
  performed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index inventory_movements_part_created_idx on public.inventory_movements(part_id, created_at desc);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_entity_idx on public.audit_logs(entity_type, entity_id, created_at desc);

create table public.releases (
  id uuid primary key default gen_random_uuid(),
  version text not null unique,
  channel public.release_channel not null default 'stable',
  status public.release_status not null default 'draft',
  release_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  activated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feature_flags (
  id uuid primary key default gen_random_uuid(),
  key text not null unique check (key ~ '^[a-z][a-z0-9_]{2,80}$'),
  description text,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.release_assignments (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete cascade,
  role public.app_role,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (num_nonnulls(profile_id, role) = 1),
  unique nulls not distinct (release_id, profile_id, role)
);

create table public.release_events (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.releases(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  previous_status public.release_status,
  next_status public.release_status not null,
  note text,
  created_at timestamptz not null default now()
);

create trigger bike_assignments_set_updated_at before update on public.bike_assignments for each row execute procedure public.set_updated_at();
create trigger contracts_set_updated_at before update on public.contracts for each row execute procedure public.set_updated_at();
create trigger payment_periods_set_updated_at before update on public.payment_periods for each row execute procedure public.set_updated_at();
create trigger bike_reports_set_updated_at before update on public.bike_reports for each row execute procedure public.set_updated_at();
create trigger parts_set_updated_at before update on public.parts for each row execute procedure public.set_updated_at();
create trigger releases_set_updated_at before update on public.releases for each row execute procedure public.set_updated_at();
create trigger feature_flags_set_updated_at before update on public.feature_flags for each row execute procedure public.set_updated_at();

create or replace function public.is_driver_owner(p_driver_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.drivers where id = p_driver_id and profile_id = (select auth.uid()))
$$;

create or replace function public.log_payment_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or old.status is distinct from new.status then
    insert into public.payment_events(payment_period_id, actor_id, previous_status, next_status, reason)
    values (new.id, (select auth.uid()), case when tg_op = 'INSERT' then null else old.status end, new.status, new.rejection_reason);
  end if;
  return new;
end;
$$;
create trigger payment_periods_status_event after insert or update of status on public.payment_periods for each row execute procedure public.log_payment_status_change();

create or replace function public.generate_contract_payment_schedule(p_contract_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare contract_row public.contracts%rowtype;
begin
  if not public.is_management() then raise exception 'Only VMC management can generate payment schedules'; end if;
  select * into contract_row from public.contracts where id = p_contract_id;
  if not found then raise exception 'Contract not found'; end if;
  insert into public.payment_periods(contract_id, period_number, due_date, amount_due)
  select contract_row.id, item, contract_row.start_date + ((item - 1) * 7), contract_row.weekly_amount
  from generate_series(1, contract_row.total_weeks) item
  on conflict (contract_id, period_number) do nothing;
  return contract_row.total_weeks;
end;
$$;

create or replace function public.transition_payment_period(
  p_payment_period_id uuid,
  p_status public.payment_status,
  p_reason text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_management() then raise exception 'Only VMC management can verify payments'; end if;
  if p_status not in ('due', 'awaiting_verification', 'verified', 'rejected', 'overdue') then raise exception 'Invalid management payment status'; end if;
  update public.payment_periods set
    status = p_status,
    reviewed_at = case when p_status in ('awaiting_verification', 'rejected') then now() else reviewed_at end,
    reviewed_by = case when p_status in ('awaiting_verification', 'rejected') then (select auth.uid()) else reviewed_by end,
    verified_at = case when p_status = 'verified' then now() else verified_at end,
    verified_by = case when p_status = 'verified' then (select auth.uid()) else verified_by end,
    rejection_reason = case when p_status = 'rejected' then nullif(trim(p_reason), '') else null end
  where id = p_payment_period_id;
  if not found then raise exception 'Payment period not found'; end if;
end;
$$;

create or replace function public.create_release(
  p_version text,
  p_channel public.release_channel,
  p_release_notes text default null
) returns uuid language plpgsql security definer set search_path = public as $$
declare release_id uuid;
begin
  if not public.is_admin() then raise exception 'Only VMC administrators can create releases'; end if;
  insert into public.releases(version, channel, release_notes, created_by)
  values (nullif(trim(p_version), ''), p_channel, nullif(trim(p_release_notes), ''), (select auth.uid()))
  returning id into release_id;
  insert into public.release_events(release_id, actor_id, next_status, note)
  values (release_id, (select auth.uid()), 'draft', 'Release created');
  return release_id;
end;
$$;

create or replace function public.transition_release(
  p_release_id uuid,
  p_status public.release_status,
  p_note text default null
) returns void language plpgsql security definer set search_path = public as $$
declare previous public.release_status;
begin
  if not public.is_admin() then raise exception 'Only VMC administrators can control releases'; end if;
  select status into previous from public.releases where id = p_release_id for update;
  if not found then raise exception 'Release not found'; end if;
  update public.releases
  set status = p_status,
      activated_at = case when p_status = 'active' then now() else activated_at end
  where id = p_release_id;
  insert into public.release_events(release_id, actor_id, previous_status, next_status, note)
  values (p_release_id, (select auth.uid()), previous, p_status, nullif(trim(p_note), ''));
end;
$$;

create or replace function public.set_feature_flag(
  p_key text,
  p_enabled boolean,
  p_description text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Only VMC administrators can change feature flags'; end if;
  insert into public.feature_flags(key, enabled, description)
  values (lower(trim(p_key)), p_enabled, nullif(trim(p_description), ''))
  on conflict (key) do update set enabled = excluded.enabled, description = coalesce(excluded.description, public.feature_flags.description);
end;
$$;

-- RLS and privileges. Management mutations happen through server actions/RPCs;
-- drivers can read their own domain and create only their own bike reports.
alter table public.bike_assignments enable row level security;
alter table public.contracts enable row level security;
alter table public.payment_periods enable row level security;
alter table public.payment_proofs enable row level security;
alter table public.payment_events enable row level security;
alter table public.notifications enable row level security;
alter table public.bike_reports enable row level security;
alter table public.parts enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.audit_logs enable row level security;
alter table public.releases enable row level security;
alter table public.feature_flags enable row level security;
alter table public.release_assignments enable row level security;
alter table public.release_events enable row level security;
revoke all on public.bike_assignments, public.contracts, public.payment_periods, public.payment_proofs, public.payment_events, public.notifications, public.bike_reports, public.parts, public.inventory_movements, public.audit_logs, public.releases, public.feature_flags, public.release_assignments, public.release_events from anon;
grant select, insert, update, delete on public.bike_assignments, public.contracts, public.payment_periods, public.payment_proofs, public.payment_events, public.notifications, public.bike_reports, public.parts, public.inventory_movements, public.audit_logs, public.releases, public.feature_flags, public.release_assignments, public.release_events to authenticated;

create policy "bike_assignments_select_authorized" on public.bike_assignments for select to authenticated using (public.is_management() or public.is_driver_owner(driver_id));
create policy "contracts_select_authorized" on public.contracts for select to authenticated using (public.is_management() or public.is_driver_owner(driver_id));
create policy "payment_periods_select_authorized" on public.payment_periods for select to authenticated using (public.is_management() or exists (select 1 from public.contracts c where c.id = payment_periods.contract_id and public.is_driver_owner(c.driver_id)));
create policy "payment_proofs_select_authorized" on public.payment_proofs for select to authenticated using (public.is_management() or exists (select 1 from public.payment_periods pp join public.contracts c on c.id = pp.contract_id where pp.id = payment_proofs.payment_period_id and public.is_driver_owner(c.driver_id)));
create policy "payment_events_select_management" on public.payment_events for select to authenticated using (public.is_management());
create policy "notifications_select_own" on public.notifications for select to authenticated using (recipient_profile_id = (select auth.uid()) or public.is_management());
create policy "notifications_update_own" on public.notifications for update to authenticated using (recipient_profile_id = (select auth.uid())) with check (recipient_profile_id = (select auth.uid()));
create policy "bike_reports_select_authorized" on public.bike_reports for select to authenticated using (public.is_management() or public.is_driver_owner(driver_id));
create policy "bike_reports_insert_own" on public.bike_reports for insert to authenticated with check (public.is_driver_owner(driver_id) and created_by = (select auth.uid()) and status = 'reported');
create policy "parts_select_management" on public.parts for select to authenticated using (public.is_management());
create policy "inventory_movements_select_management" on public.inventory_movements for select to authenticated using (public.is_management());
create policy "audit_logs_select_admin" on public.audit_logs for select to authenticated using (public.is_admin());
create policy "releases_select_management" on public.releases for select to authenticated using (public.is_management());
create policy "feature_flags_select_admin" on public.feature_flags for select to authenticated using (public.is_admin());
create policy "release_assignments_select_admin" on public.release_assignments for select to authenticated using (public.is_admin());
create policy "release_events_select_management" on public.release_events for select to authenticated using (public.is_management());

revoke all on function public.is_driver_owner(uuid) from public;
revoke all on function public.generate_contract_payment_schedule(uuid) from public;
revoke all on function public.transition_payment_period(uuid, public.payment_status, text) from public;
revoke all on function public.create_release(text, public.release_channel, text) from public;
revoke all on function public.transition_release(uuid, public.release_status, text) from public;
revoke all on function public.set_feature_flag(text, boolean, text) from public;
grant execute on function public.is_driver_owner(uuid), public.generate_contract_payment_schedule(uuid), public.transition_payment_period(uuid, public.payment_status, text), public.create_release(text, public.release_channel, text), public.transition_release(uuid, public.release_status, text), public.set_feature_flag(text, boolean, text) to authenticated;
