-- VMC Platform: secure application foundation
-- Apply with the Supabase CLI or SQL editor before using authenticated routes.

create type public.app_role as enum ('admin', 'staff', 'driver');
create type public.driver_status as enum ('active', 'inactive', 'suspended');
create type public.bike_status as enum ('available', 'assigned', 'maintenance', 'inactive');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  role public.app_role not null default 'driver',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bikes (
  id uuid primary key default gen_random_uuid(),
  model text not null,
  brand text not null default 'HERO',
  colour text,
  registration_number text unique,
  vin text unique,
  engine_number text unique,
  licence_disc_information text,
  status public.bike_status not null default 'available',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  bike_id uuid unique references public.bikes(id) on delete set null,
  status public.driver_status not null default 'active',
  start_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_profiles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index drivers_profile_id_idx on public.drivers(profile_id);
create index drivers_bike_id_idx on public.drivers(bike_id);
create index bikes_status_idx on public.bikes(status);
create index profiles_role_idx on public.profiles(role);

-- A profile is created by the database only. The role deliberately does not read
-- user metadata, so a browser cannot self-assign admin or staff privileges.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), ''),
    new.email,
    nullif(trim(new.raw_user_meta_data ->> 'phone'), ''),
    'driver'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger drivers_set_updated_at before update on public.drivers
  for each row execute procedure public.set_updated_at();
create trigger bikes_set_updated_at before update on public.bikes
  for each row execute procedure public.set_updated_at();
create trigger staff_profiles_set_updated_at before update on public.staff_profiles
  for each row execute procedure public.set_updated_at();

-- Security-definer helpers avoid recursive RLS evaluation. Their only output is
-- the authenticated caller's own role, and they are unavailable to anon users.
create or replace function public.current_app_role()
returns public.app_role
language sql
stable
security definer set search_path = public
as $$
  select role from public.profiles where id = (select auth.uid())
$$;

create or replace function public.is_management()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select public.current_app_role() in ('admin', 'staff')), false)
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select public.current_app_role() = 'admin'), false)
$$;

revoke all on function public.current_app_role() from public;
revoke all on function public.is_management() from public;
revoke all on function public.is_admin() from public;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_management() to authenticated;
grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.drivers enable row level security;
alter table public.bikes enable row level security;
alter table public.staff_profiles enable row level security;

-- Explicit table privileges plus RLS make the public API deny-by-default.
revoke all on public.profiles, public.drivers, public.bikes, public.staff_profiles from anon;
grant select, insert, update, delete on public.profiles, public.drivers, public.bikes, public.staff_profiles to authenticated;

-- Profiles: users see themselves; staff see driver profiles; admins see all.
create policy "profiles_select_authorized"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or public.is_admin()
    or (public.is_management() and role = 'driver')
  );

-- A user may update own contact details, but the RLS check compares any proposed
-- role to the server-side database role. Role promotion is therefore impossible
-- from the browser. Only an existing admin can manage profile roles.
create policy "profiles_update_own_without_role_change"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role = public.current_app_role());

create policy "profiles_admin_write"
  on public.profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Driver records: drivers see only their own record. Management can operate on
-- records whose linked profile is actually a driver, never staff/admin profiles.
create policy "drivers_select_authorized"
  on public.drivers for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_management());

create policy "drivers_management_write"
  on public.drivers for all to authenticated
  using (
    public.is_management()
    and exists (select 1 from public.profiles where profiles.id = drivers.profile_id and profiles.role = 'driver')
  )
  with check (
    public.is_management()
    and exists (select 1 from public.profiles where profiles.id = drivers.profile_id and profiles.role = 'driver')
  );

-- Bikes: management can operate on the fleet. A driver can only read the bike
-- assigned through their own driver record.
create policy "bikes_select_authorized"
  on public.bikes for select to authenticated
  using (
    public.is_management()
    or exists (
      select 1 from public.drivers
      where drivers.bike_id = bikes.id and drivers.profile_id = (select auth.uid())
    )
  );

create policy "bikes_management_write"
  on public.bikes for all to authenticated
  using (public.is_management())
  with check (public.is_management());

-- Staff profile records are private to their owner and administrators. Drivers
-- and ordinary staff cannot enumerate employees or administrators.
create policy "staff_profiles_select_authorized"
  on public.staff_profiles for select to authenticated
  using (profile_id = (select auth.uid()) or public.is_admin());

create policy "staff_profiles_admin_write"
  on public.staff_profiles for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Development records are intentionally not seeded. Create only clearly named
-- test accounts through Supabase Auth and then set roles server-side/database-side:
--   Test Admin, Test Staff, Test Driver, Test HERO Bike.
-- Never insert production rider data in development or migration files.
