create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  form_slug text not null,
  form_title text not null default '',
  name text not null default '',
  phone text not null default '',
  email text not null default '',
  fields jsonb not null default '{}'::jsonb,
  attachment_path text,
  status text not null default 'طلب جديد',
  created_at_label text not null default 'الآن',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.join_requests enable row level security;

drop policy if exists "public can create join requests" on public.join_requests;
create policy "public can create join requests"
on public.join_requests
for insert
to anon, authenticated
with check (true);

drop policy if exists "authenticated can read join requests" on public.join_requests;
create policy "authenticated can read join requests"
on public.join_requests
for select
to authenticated
using (true);

drop policy if exists "authenticated can update join requests" on public.join_requests;
create policy "authenticated can update join requests"
on public.join_requests
for update
to authenticated
using (true)
with check (true);

insert into storage.buckets (id, name, public)
values ('join-attachments', 'join-attachments', false)
on conflict (id) do nothing;

drop policy if exists "public can upload join attachments" on storage.objects;
create policy "public can upload join attachments"
on storage.objects
for insert
to anon, authenticated
with check (bucket_id = 'join-attachments');

drop policy if exists "authenticated can read join attachments" on storage.objects;
create policy "authenticated can read join attachments"
on storage.objects
for select
to authenticated
using (bucket_id = 'join-attachments');
