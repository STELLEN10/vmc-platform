-- ============================================================================
-- VMC PLATFORM VERSION 0.3.0 MIGRATION
-- Operations: Maintenance, Parts Inventory, Emergency Support, Service Booking
-- ============================================================================

-- 1. FLEET ODOMETER & SERVICE SCHEDULING ENHANCEMENTS
alter table public.bikes
  add column if not exists current_mileage_km integer not null default 0 check (current_mileage_km >= 0),
  add column if not exists next_service_due_km integer default 3000 check (next_service_due_km is null or next_service_due_km >= 0);

-- 2. ENHANCE PARTS INVENTORY FOR LIVE DATABASE SOURCE OF TRUTH
alter table public.parts
  add column if not exists part_number text,
  add column if not exists category text not null default 'General',
  add column if not exists description text,
  add column if not exists storage_location text,
  add column if not exists image_storage_path text;

-- Populate part_number from sku where empty
update public.parts set part_number = sku where part_number is null and sku is not null;

-- Ensure part_number is searchable
create index if not exists parts_part_number_idx on public.parts(part_number);
create index if not exists parts_category_idx on public.parts(category);

-- 3. PARTS RLS: ALLOW DRIVERS TO BROWSE ACTIVE PARTS FOR THEIR BIKE
-- Management can do all operations; authenticated drivers can read active catalog parts
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parts' and schemaname = 'public' and policyname = 'parts_select_driver'
  ) then
    create policy "parts_select_driver" on public.parts
      for select to authenticated
      using (status <> 'discontinued');
  end if;
end;
$$;

-- Allow management to insert, update and delete parts
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'parts' and schemaname = 'public' and policyname = 'parts_management_insert'
  ) then
    create policy "parts_management_insert" on public.parts
      for insert to authenticated
      with check (public.is_management());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'parts' and schemaname = 'public' and policyname = 'parts_management_update'
  ) then
    create policy "parts_management_update" on public.parts
      for update to authenticated
      using (public.is_management())
      with check (public.is_management());
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'parts' and schemaname = 'public' and policyname = 'parts_management_delete'
  ) then
    create policy "parts_management_delete" on public.parts
      for delete to authenticated
      using (public.is_management());
  end if;
end;
$$;

-- Inventory movements management mutation policies
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'inventory_movements' and schemaname = 'public' and policyname = 'inventory_movements_management_insert'
  ) then
    create policy "inventory_movements_management_insert" on public.inventory_movements
      for insert to authenticated
      with check (public.is_management());
  end if;
end;
$$;

-- 4. MAINTENANCE REQUESTS TABLE & POLICIES
create table if not exists public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete restrict,
  bike_id uuid not null references public.bikes(id) on delete restrict,
  category text not null check (category in ('engine', 'brakes', 'tyres', 'electrical', 'battery', 'lights', 'chain', 'suspension', 'body', 'oil_service', 'other')),
  title text not null check (char_length(trim(title)) >= 3),
  description text not null check (char_length(trim(description)) >= 10),
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'scheduled', 'in_progress', 'awaiting_parts', 'resolved', 'cancelled')),
  management_notes text,
  submitted_at timestamptz not null default now(),
  scheduled_for timestamptz,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists maintenance_requests_driver_idx on public.maintenance_requests(driver_id, created_at desc);
create index if not exists maintenance_requests_bike_idx on public.maintenance_requests(bike_id, status);
create index if not exists maintenance_requests_status_idx on public.maintenance_requests(status, severity, created_at desc);

create trigger maintenance_requests_set_updated_at
  before update on public.maintenance_requests
  for each row execute procedure public.set_updated_at();

alter table public.maintenance_requests enable row level security;
revoke all on public.maintenance_requests from anon;
grant select, insert, update on public.maintenance_requests to authenticated;

create policy "maintenance_requests_select_authorized" on public.maintenance_requests
  for select to authenticated
  using (public.is_management() or public.is_driver_owner(driver_id));

create policy "maintenance_requests_insert_own" on public.maintenance_requests
  for insert to authenticated
  with check (
    public.is_driver_owner(driver_id)
    and created_by = (select auth.uid())
    and status = 'submitted'
    and exists (
      select 1 from public.bike_assignments ba
      where ba.driver_id = maintenance_requests.driver_id
        and ba.bike_id = maintenance_requests.bike_id
        and ba.status = 'assigned'
    )
  );

create policy "maintenance_requests_update_management" on public.maintenance_requests
  for update to authenticated
  using (public.is_management())
  with check (public.is_management());

-- 5. MAINTENANCE ATTACHMENTS TABLE & POLICIES
create table if not exists public.maintenance_attachments (
  id uuid primary key default gen_random_uuid(),
  maintenance_request_id uuid not null references public.maintenance_requests(id) on delete cascade,
  storage_bucket text not null default 'vmc-application-documents',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists maintenance_attachments_req_idx on public.maintenance_attachments(maintenance_request_id);

alter table public.maintenance_attachments enable row level security;
revoke all on public.maintenance_attachments from anon;
grant select, insert on public.maintenance_attachments to authenticated;

create policy "maintenance_attachments_select_authorized" on public.maintenance_attachments
  for select to authenticated
  using (
    public.is_management()
    or exists (
      select 1 from public.maintenance_requests mr
      where mr.id = maintenance_attachments.maintenance_request_id
        and public.is_driver_owner(mr.driver_id)
    )
  );

create policy "maintenance_attachments_insert_authorized" on public.maintenance_attachments
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.is_management()
      or exists (
        select 1 from public.maintenance_requests mr
        where mr.id = maintenance_attachments.maintenance_request_id
          and public.is_driver_owner(mr.driver_id)
      )
    )
  );

-- 6. EMERGENCY REPORTS TABLE & POLICIES
create table if not exists public.emergency_reports (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete restrict,
  bike_id uuid not null references public.bikes(id) on delete restrict,
  emergency_type text not null check (emergency_type in ('accident', 'bike_breakdown', 'safety_issue', 'medical_emergency', 'other')),
  description text not null check (char_length(trim(description)) >= 5),
  severity text not null default 'critical' check (severity in ('medium', 'high', 'critical')),
  location_description text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'responding', 'resolved', 'cancelled')),
  management_notes text,
  acknowledged_at timestamptz,
  acknowledged_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists emergency_reports_status_idx on public.emergency_reports(status, created_at desc);
create index if not exists emergency_reports_driver_idx on public.emergency_reports(driver_id, created_at desc);
create index if not exists emergency_reports_bike_idx on public.emergency_reports(bike_id, status);

create trigger emergency_reports_set_updated_at
  before update on public.emergency_reports
  for each row execute procedure public.set_updated_at();

alter table public.emergency_reports enable row level security;
revoke all on public.emergency_reports from anon;
grant select, insert, update on public.emergency_reports to authenticated;

create policy "emergency_reports_select_authorized" on public.emergency_reports
  for select to authenticated
  using (public.is_management() or public.is_driver_owner(driver_id));

create policy "emergency_reports_insert_own" on public.emergency_reports
  for insert to authenticated
  with check (
    public.is_driver_owner(driver_id)
    and created_by = (select auth.uid())
    and status = 'open'
    and exists (
      select 1 from public.bike_assignments ba
      where ba.driver_id = emergency_reports.driver_id
        and ba.bike_id = emergency_reports.bike_id
        and ba.status = 'assigned'
    )
  );

create policy "emergency_reports_update_management" on public.emergency_reports
  for update to authenticated
  using (public.is_management())
  with check (public.is_management());

-- 7. EMERGENCY ATTACHMENTS TABLE & POLICIES
create table if not exists public.emergency_attachments (
  id uuid primary key default gen_random_uuid(),
  emergency_report_id uuid not null references public.emergency_reports(id) on delete cascade,
  storage_bucket text not null default 'vmc-application-documents',
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0 and file_size_bytes <= 52428800),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (storage_bucket, storage_path)
);

create index if not exists emergency_attachments_rep_idx on public.emergency_attachments(emergency_report_id);

alter table public.emergency_attachments enable row level security;
revoke all on public.emergency_attachments from anon;
grant select, insert on public.emergency_attachments to authenticated;

create policy "emergency_attachments_select_authorized" on public.emergency_attachments
  for select to authenticated
  using (
    public.is_management()
    or exists (
      select 1 from public.emergency_reports er
      where er.id = emergency_attachments.emergency_report_id
        and public.is_driver_owner(er.driver_id)
    )
  );

create policy "emergency_attachments_insert_authorized" on public.emergency_attachments
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      public.is_management()
      or exists (
        select 1 from public.emergency_reports er
        where er.id = emergency_attachments.emergency_report_id
          and public.is_driver_owner(er.driver_id)
      )
    )
  );

-- 8. SERVICE REQUESTS / BOOKING TABLE & POLICIES
create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  driver_id uuid not null references public.drivers(id) on delete restrict,
  bike_id uuid not null references public.bikes(id) on delete restrict,
  service_type text not null default 'scheduled_service' check (service_type in ('standard_service', 'first_service_1000km', 'scheduled_service_3000km', 'major_service_6000km', 'oil_change', 'brake_tyre_inspection', 'other')),
  preferred_date date not null,
  preferred_time text not null,
  odometer_reading_km integer check (odometer_reading_km is null or odometer_reading_km >= 0),
  driver_notes text,
  status text not null default 'requested' check (status in ('requested', 'confirmed', 'rescheduled', 'completed', 'cancelled', 'no_show')),
  confirmed_date date,
  confirmed_time text,
  management_notes text,
  completed_at timestamptz,
  completed_by uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_requests_driver_idx on public.service_requests(driver_id, created_at desc);
create index if not exists service_requests_bike_idx on public.service_requests(bike_id, status);
create index if not exists service_requests_status_idx on public.service_requests(status, preferred_date);

create trigger service_requests_set_updated_at
  before update on public.service_requests
  for each row execute procedure public.set_updated_at();

alter table public.service_requests enable row level security;
revoke all on public.service_requests from anon;
grant select, insert, update on public.service_requests to authenticated;

create policy "service_requests_select_authorized" on public.service_requests
  for select to authenticated
  using (public.is_management() or public.is_driver_owner(driver_id));

create policy "service_requests_insert_own" on public.service_requests
  for insert to authenticated
  with check (
    public.is_driver_owner(driver_id)
    and created_by = (select auth.uid())
    and status = 'requested'
    and exists (
      select 1 from public.bike_assignments ba
      where ba.driver_id = service_requests.driver_id
        and ba.bike_id = service_requests.bike_id
        and ba.status = 'assigned'
    )
  );

create policy "service_requests_update_management" on public.service_requests
  for update to authenticated
  using (public.is_management())
  with check (public.is_management());

-- 9. STORAGE POLICIES FOR MAINTENANCE AND EMERGENCY FILES
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and schemaname = 'storage' and policyname = 'vmc_documents_maintenance_driver_select'
  ) then
    create policy "vmc_documents_maintenance_driver_select" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'vmc-application-documents'
        and split_part(name, '/', 1) = 'maintenance'
        and split_part(name, '/', 2) = (select auth.uid())::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and schemaname = 'storage' and policyname = 'vmc_documents_maintenance_driver_insert'
  ) then
    create policy "vmc_documents_maintenance_driver_insert" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'vmc-application-documents'
        and split_part(name, '/', 1) = 'maintenance'
        and split_part(name, '/', 2) = (select auth.uid())::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and schemaname = 'storage' and policyname = 'vmc_documents_emergency_driver_select'
  ) then
    create policy "vmc_documents_emergency_driver_select" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'vmc-application-documents'
        and split_part(name, '/', 1) = 'emergency'
        and split_part(name, '/', 2) = (select auth.uid())::text
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where tablename = 'objects' and schemaname = 'storage' and policyname = 'vmc_documents_emergency_driver_insert'
  ) then
    create policy "vmc_documents_emergency_driver_insert" on storage.objects
      for insert to authenticated
      with check (
        bucket_id = 'vmc-application-documents'
        and split_part(name, '/', 1) = 'emergency'
        and split_part(name, '/', 2) = (select auth.uid())::text
      );
  end if;
end;
$$;

-- 10. RPC: SECURE TRANSITIONS FOR MAINTENANCE REQUESTS
create or replace function public.transition_maintenance_request(
  p_request_id uuid,
  p_status text,
  p_management_notes text default null,
  p_scheduled_for timestamptz default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  req_record public.maintenance_requests%rowtype;
  driver_prof_id uuid;
begin
  if not public.is_management() then
    raise exception 'Only VMC management can update maintenance status';
  end if;

  select * into req_record from public.maintenance_requests where id = p_request_id for update;
  if not found then
    raise exception 'Maintenance request not found';
  end if;

  update public.maintenance_requests set
    status = p_status,
    management_notes = coalesce(nullif(trim(p_management_notes), ''), management_notes),
    scheduled_for = coalesce(p_scheduled_for, scheduled_for),
    resolved_at = case when p_status = 'resolved' then now() else resolved_at end,
    resolved_by = case when p_status = 'resolved' then (select auth.uid()) else resolved_by end
  where id = p_request_id;

  -- Create driver notification
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
      'Your report "' || req_record.title || '" is now ' || replace(p_status, '_', ' ') || '.',
      'maintenance_request',
      p_request_id
    );
  end if;
end;
$$;

-- 11. RPC: SECURE TRANSITIONS FOR EMERGENCY REPORTS
create or replace function public.transition_emergency_report(
  p_emergency_id uuid,
  p_status text,
  p_management_notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  emerg_record public.emergency_reports%rowtype;
  driver_prof_id uuid;
begin
  if not public.is_management() then
    raise exception 'Only VMC management can update emergency reports';
  end if;

  select * into emerg_record from public.emergency_reports where id = p_emergency_id for update;
  if not found then
    raise exception 'Emergency report not found';
  end if;

  update public.emergency_reports set
    status = p_status,
    management_notes = coalesce(nullif(trim(p_management_notes), ''), management_notes),
    acknowledged_at = case when p_status in ('acknowledged', 'responding', 'resolved') and acknowledged_at is null then now() else acknowledged_at end,
    acknowledged_by = case when p_status in ('acknowledged', 'responding', 'resolved') and acknowledged_by is null then (select auth.uid()) else acknowledged_by end,
    resolved_at = case when p_status = 'resolved' then now() else resolved_at end,
    resolved_by = case when p_status = 'resolved' then (select auth.uid()) else resolved_by end
  where id = p_emergency_id;

  -- Create driver notification
  select profile_id into driver_prof_id from public.drivers where id = emerg_record.driver_id;
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
      'emergency_update',
      'Emergency response update: ' || replace(p_status, '_', ' '),
      'Your emergency report (' || emerg_record.emergency_type || ') has been updated to: ' || replace(p_status, '_', ' ') || '.',
      'emergency_report',
      p_emergency_id
    );
  end if;
end;
$$;

-- 12. RPC: SECURE TRANSITIONS FOR SERVICE REQUESTS
create or replace function public.transition_service_request(
  p_request_id uuid,
  p_status text,
  p_confirmed_date date default null,
  p_confirmed_time text default null,
  p_management_notes text default null
) returns void language plpgsql security definer set search_path = public as $$
declare
  serv_record public.service_requests%rowtype;
  driver_prof_id uuid;
begin
  if not public.is_management() then
    raise exception 'Only VMC management can update service requests';
  end if;

  select * into serv_record from public.service_requests where id = p_request_id for update;
  if not found then
    raise exception 'Service request not found';
  end if;

  update public.service_requests set
    status = p_status,
    confirmed_date = coalesce(p_confirmed_date, confirmed_date),
    confirmed_time = coalesce(p_confirmed_time, confirmed_time),
    management_notes = coalesce(nullif(trim(p_management_notes), ''), management_notes),
    completed_at = case when p_status = 'completed' then now() else completed_at end,
    completed_by = case when p_status = 'completed' then (select auth.uid()) else completed_by end
  where id = p_request_id;

  -- Create driver notification
  select profile_id into driver_prof_id from public.drivers where id = serv_record.driver_id;
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
      'service_update',
      'Service booking update: ' || replace(p_status, '_', ' '),
      case
        when p_status = 'confirmed' then 'Your service booking has been confirmed for ' || coalesce(p_confirmed_date::text, serv_record.preferred_date::text) || '.'
        when p_status = 'rescheduled' then 'Your service booking has been rescheduled to ' || coalesce(p_confirmed_date::text, serv_record.preferred_date::text) || '.'
        when p_status = 'completed' then 'Your motorcycle service has been marked completed by VMC.'
        else 'Your service booking status is now ' || replace(p_status, '_', ' ') || '.'
      end,
      'service_request',
      p_request_id
    );
  end if;
end;
$$;

-- 13. NOTIFICATION TRIGGER ON EMERGENCY CREATION FOR MANAGEMENT
create or replace function public.notify_management_on_emergency()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  driver_prof_id uuid;
  bike_reg text;
begin
  select profile_id into driver_prof_id from public.drivers where id = new.driver_id;
  select coalesce(registration_number, model) into bike_reg from public.bikes where id = new.bike_id;

  insert into public.management_notifications (
    title,
    body,
    driver_profile_id
  ) values (
    'EMERGENCY REPORT: ' || upper(replace(new.emergency_type, '_', ' ')),
    'Motorcycle ' || coalesce(bike_reg, 'N/A') || ' reported: ' || substring(new.description from 1 for 120),
    driver_prof_id
  );
  return new;
end;
$$;

create or replace trigger emergency_reports_notify_management
  after insert on public.emergency_reports
  for each row execute procedure public.notify_management_on_emergency();

-- 14. GRANT EXECUTE ON NEW RPCs TO AUTHENTICATED
revoke all on function public.transition_maintenance_request(uuid, text, text, timestamptz) from public;
revoke all on function public.transition_emergency_report(uuid, text, text) from public;
revoke all on function public.transition_service_request(uuid, text, date, text, text) from public;

grant execute on function public.transition_maintenance_request(uuid, text, text, timestamptz) to authenticated;
grant execute on function public.transition_emergency_report(uuid, text, text) to authenticated;
grant execute on function public.transition_service_request(uuid, text, date, text, text) to authenticated;
