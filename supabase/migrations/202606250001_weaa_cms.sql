create extension if not exists pgcrypto;

create table if not exists public.cms_content (
  id text primary key,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_requests (
  id uuid primary key default gen_random_uuid(),
  service_slug text not null,
  service_title text not null,
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  details text not null default '',
  status text not null default 'طلب جديد',
  created_at_label text not null default 'الآن',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.cms_content (id, content)
values ('main', '{}'::jsonb)
on conflict (id) do nothing;

alter table public.cms_content enable row level security;
alter table public.service_requests enable row level security;

drop policy if exists "public can read cms content" on public.cms_content;
create policy "public can read cms content"
on public.cms_content
for select
to anon, authenticated
using (true);

drop policy if exists "authenticated can insert cms content" on public.cms_content;
create policy "authenticated can insert cms content"
on public.cms_content
for insert
to authenticated
with check (true);

drop policy if exists "authenticated can update cms content" on public.cms_content;
create policy "authenticated can update cms content"
on public.cms_content
for update
to authenticated
using (true)
with check (true);

drop policy if exists "public can create service requests" on public.service_requests;
create policy "public can create service requests"
on public.service_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "authenticated can read service requests" on public.service_requests;
create policy "authenticated can read service requests"
on public.service_requests
for select
to authenticated
using (true);

drop policy if exists "authenticated can update service requests" on public.service_requests;
create policy "authenticated can update service requests"
on public.service_requests
for update
to authenticated
using (true)
with check (true);
