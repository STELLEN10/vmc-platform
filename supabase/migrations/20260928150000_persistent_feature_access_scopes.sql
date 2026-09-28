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
