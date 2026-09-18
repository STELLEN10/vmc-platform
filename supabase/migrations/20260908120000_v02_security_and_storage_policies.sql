-- VMC v0.2 Security Hardening: Storage Policies, RLS Policies, and Bike State Integrity Guard

-- 1. Payment proofs table RLS INSERT policy
create policy "payment_proofs_insert_authorized" on public.payment_proofs
for insert to authenticated
with check (
  public.is_management()
  or (
    submitted_by = (select auth.uid())
    and storage_bucket = 'vmc-application-documents'
    and storage_path like 'payment_proofs/' || (select auth.uid())::text || '/%'
    and exists (
      select 1 from public.payment_periods pp
      join public.contracts c on c.id = pp.contract_id
      where pp.id = payment_proofs.payment_period_id
        and public.is_driver_owner(c.driver_id)
    )
  )
);

-- 2. Payment periods table RLS UPDATE policy for driver submitting proof
create policy "payment_periods_driver_update_status" on public.payment_periods
for update to authenticated
using (
  exists (
    select 1 from public.contracts c
    where c.id = payment_periods.contract_id
      and public.is_driver_owner(c.driver_id)
  )
)
with check (
  exists (
    select 1 from public.contracts c
    where c.id = payment_periods.contract_id
      and public.is_driver_owner(c.driver_id)
  )
  and status = 'awaiting_verification'
);

-- 3. Storage policies for private bucket 'vmc-application-documents'
-- Ensure RLS is active on storage.objects
alter table storage.objects enable row level security;

-- Authorized select: Management can view all documents, drivers can view only their own payment proofs
create policy "vmc_documents_select_authorized" on storage.objects
for select to authenticated
using (
  bucket_id = 'vmc-application-documents' and (
    public.is_management()
    or (
      split_part(name, '/', 1) = 'payment_proofs'
      and split_part(name, '/', 2) = (select auth.uid())::text
    )
  )
);

-- Authorized insert: Management can insert any document, drivers can insert only under their own profile ID folder
create policy "vmc_documents_insert_authorized" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vmc-application-documents' and (
    public.is_management()
    or (
      split_part(name, '/', 1) = 'payment_proofs'
      and split_part(name, '/', 2) = (select auth.uid())::text
    )
  )
);

-- Update and delete: Restricted to management only
create policy "vmc_documents_management_update" on storage.objects
for update to authenticated
using (bucket_id = 'vmc-application-documents' and public.is_management())
with check (bucket_id = 'vmc-application-documents' and public.is_management());

create policy "vmc_documents_management_delete" on storage.objects
for delete to authenticated
using (bucket_id = 'vmc-application-documents' and public.is_management());

-- 4. Bike status consistency guard:
-- Prevents a bike with an active assignment from being manually changed to an incompatible status
create or replace function public.enforce_bike_assignment_status_integrity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status <> 'assigned' and exists (
    select 1 from public.bike_assignments
    where bike_id = new.id and status = 'assigned'
  ) then
    raise exception 'Cannot change status of an actively assigned bike. Unassign the bike first.';
  end if;
  return new;
end;
$$;

revoke execute on function public.enforce_bike_assignment_status_integrity() from public;
revoke execute on function public.enforce_bike_assignment_status_integrity() from anon;

drop trigger if exists bikes_status_integrity_guard on public.bikes;
create trigger bikes_status_integrity_guard
before update of status on public.bikes
for each row
execute procedure public.enforce_bike_assignment_status_integrity();
