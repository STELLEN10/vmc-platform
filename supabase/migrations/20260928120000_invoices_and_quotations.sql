-- ============================================================================
-- Migration: Invoices, Quotations, and PDF Receipts
-- ============================================================================

create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  document_type text not null default 'invoice' check (document_type in ('invoice', 'quotation', 'receipt')),
  invoice_number text not null unique,
  driver_id uuid references public.drivers(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  recipient_name text not null,
  recipient_email text,
  recipient_phone text,
  recipient_address text,
  bike_reference text,
  issue_date date not null default current_date,
  due_date date,
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(10, 2) not null default 0,
  vat_rate numeric(5, 2) not null default 15,
  vat_amount numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0,
  status text not null default 'issued' check (status in ('draft', 'issued', 'paid', 'cancelled')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes
create index if not exists idx_invoices_driver_id on public.invoices(driver_id);
create index if not exists idx_invoices_profile_id on public.invoices(profile_id);
create index if not exists idx_invoices_document_type on public.invoices(document_type);
create index if not exists idx_invoices_status on public.invoices(status);
create index if not exists idx_invoices_created_at on public.invoices(created_at desc);

-- RLS
alter table public.invoices enable row level security;

-- Management full access
create policy "management_full_invoices"
  on public.invoices
  for all
  to authenticated
  using (public.current_app_role() in ('admin', 'staff'))
  with check (public.current_app_role() in ('admin', 'staff'));

-- Drivers can view their own invoices/quotations
create policy "drivers_view_own_invoices"
  on public.invoices
  for select
  to authenticated
  using (
    profile_id = auth.uid() or
    driver_id in (select id from public.drivers where profile_id = auth.uid())
  );
