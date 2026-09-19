-- Migration: 20260918140000_fix_driver_onboarding_review.sql
-- Fixes management driver review failure:
-- 1. Updates public.review_driver_onboarding to explicitly set reviewed_at and reviewed_by inside its SECURITY DEFINER context.
-- 2. Updates public.enforce_driver_onboarding_submission trigger function to be SECURITY DEFINER and guard reviewed_at/reviewed_by assignment.
-- 3. Locks down execution privileges so only authenticated users with management roles can review.

-- 1. Fix trigger function to be SECURITY DEFINER and avoid overwriting existing review fields
create or replace function public.enforce_driver_onboarding_submission()
returns trigger
language plpgsql
security definer
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

  if new.onboarding_status in ('approved', 'active', 'changes_requested', 'rejected', 'suspended', 'under_review') then
    if new.reviewed_at is null then
      new.reviewed_at = now();
    end if;
    if new.reviewed_by is null then
      new.reviewed_by = (select auth.uid());
    end if;
  end if;

  return new;
end;
$$;

-- 2. Fix review_driver_onboarding to explicitly manage reviewed_at and reviewed_by in SECURITY DEFINER
create or replace function public.review_driver_onboarding(
  p_profile_id uuid,
  p_status public.driver_onboarding_status,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reviewer_id uuid;
begin
  if not public.is_management() then
    raise exception 'Only VMC management can review driver onboarding';
  end if;

  if p_status not in ('under_review', 'approved', 'active', 'changes_requested', 'rejected', 'suspended') then
    raise exception 'Invalid management onboarding status';
  end if;

  v_reviewer_id := (select auth.uid());

  update public.driver_onboardings
  set onboarding_status = p_status,
      review_note = nullif(trim(p_review_note), ''),
      reviewed_at = now(),
      reviewed_by = v_reviewer_id
  where profile_id = p_profile_id;

  if not found then
    raise exception 'Driver onboarding record not found';
  end if;
end;
$$;

-- 3. Lock down execution permissions
revoke execute on function public.review_driver_onboarding(uuid, public.driver_onboarding_status, text) from public;
revoke execute on function public.review_driver_onboarding(uuid, public.driver_onboarding_status, text) from anon;
grant execute on function public.review_driver_onboarding(uuid, public.driver_onboarding_status, text) to authenticated;

revoke execute on function public.enforce_driver_onboarding_submission() from public;
revoke execute on function public.enforce_driver_onboarding_submission() from anon;
