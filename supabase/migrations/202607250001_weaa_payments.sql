create table if not exists public.service_payments (
  id uuid primary key default gen_random_uuid(),
  service_slug text not null,
  service_title text not null,
  amount_sar integer not null check (amount_sar > 0),
  currency text not null default 'sar',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  customer_email text,
  status text not null default 'checkout_created',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists service_payments_created_at_idx
on public.service_payments (created_at desc);

create index if not exists service_payments_status_idx
on public.service_payments (status);

create index if not exists service_payments_service_slug_idx
on public.service_payments (service_slug);

alter table public.service_payments enable row level security;

drop policy if exists "authenticated can read service payments" on public.service_payments;
create policy "authenticated can read service payments"
on public.service_payments
for select
to authenticated
using (true);

drop policy if exists "authenticated can update service payments" on public.service_payments;
create policy "authenticated can update service payments"
on public.service_payments
for update
to authenticated
using (true)
with check (true);
