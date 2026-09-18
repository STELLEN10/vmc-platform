-- VMC Contract PDF Documents Migration
-- Adds contract document storage columns and security policies

-- 1. Add contract document columns to public.contracts
alter table public.contracts
  add column if not exists document_storage_path text,
  add column if not exists document_file_name text,
  add column if not exists document_uploaded_at timestamptz,
  add column if not exists document_file_size_bytes bigint,
  add column if not exists document_mime_type text;

-- 2. Management update policy on public.contracts (if not already existing)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'contracts'
      and schemaname = 'public'
      and policyname = 'contracts_management_update'
  ) then
    create policy "contracts_management_update" on public.contracts
      for update to authenticated
      using (public.is_management())
      with check (public.is_management());
  end if;
end;
$$;

-- 3. Storage SELECT policy for drivers accessing their own contract document in vmc-application-documents
-- Note: Management already has full SELECT, INSERT, UPDATE, DELETE permissions on vmc-application-documents via 20260908120000_v02_security_and_storage_policies.sql
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'objects'
      and schemaname = 'storage'
      and policyname = 'vmc_documents_contracts_driver_select'
  ) then
    create policy "vmc_documents_contracts_driver_select" on storage.objects
      for select to authenticated
      using (
        bucket_id = 'vmc-application-documents'
        and split_part(name, '/', 1) = 'contracts'
        and split_part(name, '/', 2) = (select auth.uid())::text
      );
  end if;
end;
$$;
