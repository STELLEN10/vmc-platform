-- Driver self-registration support. Auth users remain created by Supabase Auth;
-- public clients never receive a database role or a privileged API key.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'driver_onboarding_status') then
    create type public.driver_onboarding_status as enum (
      'pending',
      'incomplete',
      'submitted',
      'under_review',
      'approved',
      'active',
      'changes_requested',
      'rejected',
      'suspended'
    );
  end if;
end $$;

create table public.driver_onboardings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  emergency_contact_name text,
  emergency_contact_phone text,
  residential_address text,
  delivery_platforms text[] not null default '{}',
  onboarding_status public.driver_onboarding_status not null default 'pending',
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  contract_start_date date,
  usual_payment_day smallint check (usual_payment_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint delivery_platforms_are_known check (
    delivery_platforms <@ array['uber_eats', 'checkers_sixty60', 'mr_d', 'takealot']::text[]
  )
);

create table public.management_notifications (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('driver_onboarding_submitted')),
  driver_profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  read_by uuid references public.profiles(id) on delete set null
);

create index driver_onboardings_status_created_at_idx
  on public.driver_onboardings(onboarding_status, created_at desc);
create index management_notifications_created_at_idx
  on public.management_notifications(created_at desc);

create trigger driver_onboardings_set_updated_at before update on public.driver_onboardings
  for each row execute procedure public.set_updated_at();

-- The existing Auth trigger always creates a profile with role driver. This
-- companion trigger initializes the editable onboarding record in the database.
create or replace function public.initialize_driver_onboarding()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.role = 'driver' then
    insert into public.driver_onboardings (profile_id)
    values (new.id)
    on conflict (profile_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger profiles_initialize_driver_onboarding
  after insert on public.profiles
  for each row execute procedure public.initialize_driver_onboarding();

insert into public.driver_onboardings (profile_id)
select id from public.profiles where role = 'driver'
on conflict (profile_id) do nothing;

-- Enforce the submission transition in the database. A browser cannot skip the
-- required editable fields by directly calling the Data API.
create or replace function public.enforce_driver_onboarding_submission()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.onboarding_status = 'submitted'
    and old.onboarding_status is distinct from 'submitted' then
    if nullif(trim(new.emergency_contact_name), '') is null
      or nullif(trim(new.emergency_contact_phone), '') is null
      or nullif(trim(new.residential_address), '') is null
      or cardinality(new.delivery_platforms) = 0 then
      raise exception 'Complete all required onboarding details before submitting for review';
    end if;

    new.submitted_at = now();
    new.reviewed_at = null;
    new.reviewed_by = null;
    new.review_note = null;
  end if;

  if new.onboarding_status in ('approved', 'active', 'changes_requested', 'rejected', 'suspended', 'under_review')
    and old.onboarding_status is distinct from new.onboarding_status then
    new.reviewed_at = now();
    new.reviewed_by = (select auth.uid());
  end if;

  return new;
end;
$$;

create trigger driver_onboardings_enforce_submission
  before insert or update on public.driver_onboardings
  for each row execute procedure public.enforce_driver_onboarding_submission();

-- Internal database notification created only for a genuine transition to
-- submitted. This is an extension point for later email/WhatsApp delivery.
create or replace function public.notify_management_of_driver_submission()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  driver_name text;
begin
  if new.onboarding_status = 'submitted'
    and old.onboarding_status is distinct from 'submitted' then
    select full_name into driver_name from public.profiles where id = new.profile_id;

    insert into public.management_notifications (type, driver_profile_id, title, body)
    values (
      'driver_onboarding_submitted',
      new.profile_id,
      'New driver application',
      coalesce(nullif(driver_name, ''), 'A driver') || ' completed their VMC Driver profile and submitted it for review.'
    );
  end if;
  return new;
end;
$$;

create trigger driver_onboardings_notify_management
  after update on public.driver_onboardings
  for each row execute procedure public.notify_management_of_driver_submission();

revoke all on function public.initialize_driver_onboarding() from public;
revoke all on function public.enforce_driver_onboarding_submission() from public;
revoke all on function public.notify_management_of_driver_submission() from public;

-- The current onboarding state is database-owned. A driver may edit only while
-- their existing record is pending, incomplete, or returned for changes.
create or replace function public.driver_can_edit_onboarding(p_profile_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1
    from public.driver_onboardings
    where profile_id = p_profile_id
      and profile_id = (select auth.uid())
      and onboarding_status in ('pending', 'incomplete', 'changes_requested')
  )
$$;

revoke all on function public.driver_can_edit_onboarding(uuid) from public;
grant execute on function public.driver_can_edit_onboarding(uuid) to authenticated;

-- Review data is VMC-managed. This narrowly scoped function is the only path
-- for management to update it; it checks the caller's database role itself.
create or replace function public.review_driver_onboarding(
  p_profile_id uuid,
  p_status public.driver_onboarding_status,
  p_review_note text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if not public.is_management() then
    raise exception 'Only VMC management can review driver onboarding';
  end if;

  if p_status not in ('under_review', 'approved', 'active', 'changes_requested', 'rejected', 'suspended') then
    raise exception 'Invalid management onboarding status';
  end if;

  update public.driver_onboardings
  set onboarding_status = p_status,
      review_note = nullif(trim(p_review_note), '')
  where profile_id = p_profile_id;

  if not found then
    raise exception 'Driver onboarding record not found';
  end if;
end;
$$;

revoke all on function public.review_driver_onboarding(uuid, public.driver_onboarding_status, text) from public;
grant execute on function public.review_driver_onboarding(uuid, public.driver_onboarding_status, text) to authenticated;

alter table public.driver_onboardings enable row level security;
alter table public.management_notifications enable row level security;

revoke all on public.driver_onboardings, public.management_notifications from anon;
grant select, insert, update, delete on public.driver_onboardings, public.management_notifications to authenticated;

-- RLS controls rows; column privileges make the driver/VMC ownership boundary
-- explicit even for deliberately crafted Data API update payloads.
revoke update on public.driver_onboardings from authenticated;
grant update (
  emergency_contact_name,
  emergency_contact_phone,
  residential_address,
  delivery_platforms,
  onboarding_status
) on public.driver_onboardings to authenticated;

-- A driver can only read/edit their own application. The check excludes all
-- management-only status values, contract fields and reviewer columns.
create policy "driver_onboardings_select_authorized"
  on public.driver_onboardings for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_management());

create policy "driver_onboardings_insert_own"
  on public.driver_onboardings for insert to authenticated
  with check (
    profile_id = (select auth.uid())
    and onboarding_status in ('pending', 'incomplete', 'submitted')
    and reviewed_at is null
    and reviewed_by is null
    and review_note is null
    and contract_start_date is null
    and usual_payment_day is null
  );

create policy "driver_onboardings_update_own"
  on public.driver_onboardings for update to authenticated
  using (public.driver_can_edit_onboarding(profile_id))
  with check (
    profile_id = (select auth.uid())
    and onboarding_status in ('pending', 'incomplete', 'submitted')
    and reviewed_at is null
    and reviewed_by is null
    and review_note is null
    and contract_start_date is null
    and usual_payment_day is null
  );

create policy "management_notifications_management_access"
  on public.management_notifications for all to authenticated
  using (public.is_management())
  with check (public.is_management());
