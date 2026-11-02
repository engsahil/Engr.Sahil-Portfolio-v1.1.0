-- Reference portfolio: Supabase schema, RLS, Storage, and publication functions.
-- Run this in the Supabase SQL editor before deploying the app.

create extension if not exists pgcrypto;

create table if not exists public.admin_accounts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_accounts enable row level security;

create table if not exists public.portfolio_drafts (
  id text primary key default 'primary' check (id = 'primary'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.portfolio_drafts enable row level security;

create table if not exists public.published_portfolio (
  id text primary key default 'primary' check (id = 'primary'),
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.published_portfolio add column if not exists published_at timestamptz;
alter table public.published_portfolio enable row level security;

create table if not exists public.portfolio_versions (
  id uuid primary key default gen_random_uuid(),
  content jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);
alter table public.portfolio_versions enable row level security;

create table if not exists public.contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 254),
  message text not null check (char_length(message) between 1 and 6000),
  extra_fields jsonb not null default '{}'::jsonb check (jsonb_typeof(extra_fields) = 'object' and octet_length(extra_fields::text) <= 10000),
  read_at timestamptz
);
alter table public.contact_submissions add column if not exists extra_fields jsonb not null default '{}'::jsonb;
alter table public.contact_submissions enable row level security;

create or replace function public.is_portfolio_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_accounts where user_id = auth.uid());
$$;
revoke all on function public.is_portfolio_admin() from public, anon;
grant execute on function public.is_portfolio_admin() to authenticated;

-- The bootstrap Edge Function uses the service-role key only on the server.
-- The advisory lock makes first-admin creation race-safe.
create or replace function public.claim_first_portfolio_admin(p_user_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform pg_advisory_xact_lock(740921645);
  if exists (select 1 from public.admin_accounts) then
    return false;
  end if;
  insert into public.admin_accounts (user_id) values (p_user_id);
  insert into public.portfolio_drafts (id, content, updated_at, updated_by)
    values ('primary', '{}'::jsonb, now(), p_user_id) on conflict (id) do nothing;
  insert into public.published_portfolio (id, content, updated_at, published_at)
    values ('primary', '{}'::jsonb, now(), null) on conflict (id) do nothing;
  return true;
end;
$$;
revoke all on function public.claim_first_portfolio_admin(uuid) from public, anon, authenticated;
grant execute on function public.claim_first_portfolio_admin(uuid) to service_role;

create or replace function public.publish_portfolio_content(p_content jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_content jsonb;
begin
  if not public.is_portfolio_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;

  select content into previous_content from public.published_portfolio where id = 'primary' for update;
  if previous_content is not null then
    insert into public.portfolio_versions (content, created_by)
    values (previous_content, auth.uid());
  end if;

  insert into public.published_portfolio (id, content, updated_at, published_at)
  values ('primary', coalesce(p_content, '{}'::jsonb), now(), now())
  on conflict (id) do update set content = excluded.content, updated_at = excluded.updated_at, published_at = excluded.published_at;

  insert into public.portfolio_drafts (id, content, updated_at, updated_by)
  values ('primary', coalesce(p_content, '{}'::jsonb), now(), auth.uid())
  on conflict (id) do update set content = excluded.content, updated_at = excluded.updated_at, updated_by = excluded.updated_by;
end;
$$;
revoke all on function public.publish_portfolio_content(jsonb) from public, anon;
grant execute on function public.publish_portfolio_content(jsonb) to authenticated;

-- Selected publishing changes only the public document; the saved draft remains intact.
create or replace function public.publish_selected_portfolio_content(p_content jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_content jsonb;
begin
  if not public.is_portfolio_admin() then
    raise exception 'Administrator access required.' using errcode = '42501';
  end if;
  select content into previous_content from public.published_portfolio where id = 'primary' for update;
  if previous_content is not null then
    insert into public.portfolio_versions (content, created_by) values (previous_content, auth.uid());
  end if;
  insert into public.published_portfolio (id, content, updated_at, published_at)
  values ('primary', coalesce(p_content, '{}'::jsonb), now(), now())
  on conflict (id) do update set content = excluded.content, updated_at = excluded.updated_at, published_at = excluded.published_at;
end;
$$;
revoke all on function public.publish_selected_portfolio_content(jsonb) from public, anon;
grant execute on function public.publish_selected_portfolio_content(jsonb) to authenticated;

-- Admin profile can read only its own membership row; no client-side INSERT is allowed.
drop policy if exists "Admin reads own membership" on public.admin_accounts;
create policy "Admin reads own membership" on public.admin_accounts
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "Admins manage drafts" on public.portfolio_drafts;
create policy "Admins manage drafts" on public.portfolio_drafts
  for all to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

drop policy if exists "Public reads published portfolio" on public.published_portfolio;
create policy "Public reads published portfolio" on public.published_portfolio
  for select to anon, authenticated using (true);
drop policy if exists "Admins update published portfolio" on public.published_portfolio;
create policy "Admins update published portfolio" on public.published_portfolio
  for all to authenticated
  using (public.is_portfolio_admin())
  with check (public.is_portfolio_admin());

drop policy if exists "Admins read published history" on public.portfolio_versions;
create policy "Admins read published history" on public.portfolio_versions
  for select to authenticated using (public.is_portfolio_admin());
drop policy if exists "Admins create published history" on public.portfolio_versions;
create policy "Admins create published history" on public.portfolio_versions
  for insert to authenticated with check (public.is_portfolio_admin());

drop policy if exists "Public may submit contact messages" on public.contact_submissions;
create policy "Public may submit contact messages" on public.contact_submissions
  for insert to anon, authenticated
  with check (
    char_length(name) between 1 and 120
    and char_length(email) between 3 and 254
    and char_length(message) between 1 and 6000
    and jsonb_typeof(extra_fields) = 'object'
    and octet_length(extra_fields::text) <= 10000
  );
drop policy if exists "Admins read contact messages" on public.contact_submissions;
create policy "Admins read contact messages" on public.contact_submissions
  for select to authenticated using (public.is_portfolio_admin());
drop policy if exists "Admins update contact messages" on public.contact_submissions;
create policy "Admins update contact messages" on public.contact_submissions
  for update to authenticated using (public.is_portfolio_admin()) with check (public.is_portfolio_admin());
drop policy if exists "Admins delete contact messages" on public.contact_submissions;
create policy "Admins delete contact messages" on public.contact_submissions
  for delete to authenticated using (public.is_portfolio_admin());

grant select on public.published_portfolio to anon, authenticated;
grant select, insert, update, delete on public.portfolio_drafts to authenticated;
grant select, insert, update, delete on public.published_portfolio to authenticated;
grant select, insert on public.portfolio_versions to authenticated;
grant select, insert, update, delete on public.contact_submissions to authenticated;
grant insert on public.contact_submissions to anon;
grant select on public.admin_accounts to authenticated;

-- Public reads are limited to image objects in this one portfolio bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-media', 'portfolio-media', true, 8388608, array['image/jpeg','image/png','image/webp','image/avif','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 8388608, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public reads portfolio media" on storage.objects;
create policy "Public reads portfolio media" on storage.objects
  for select to anon, authenticated using (bucket_id = 'portfolio-media');
drop policy if exists "Admins upload portfolio media" on storage.objects;
create policy "Admins upload portfolio media" on storage.objects
  for insert to authenticated with check (bucket_id = 'portfolio-media' and public.is_portfolio_admin());
drop policy if exists "Admins update portfolio media" on storage.objects;
create policy "Admins update portfolio media" on storage.objects
  for update to authenticated using (bucket_id = 'portfolio-media' and public.is_portfolio_admin()) with check (bucket_id = 'portfolio-media' and public.is_portfolio_admin());
drop policy if exists "Admins delete portfolio media" on storage.objects;
create policy "Admins delete portfolio media" on storage.objects
  for delete to authenticated using (bucket_id = 'portfolio-media' and public.is_portfolio_admin());

-- The public portfolio table broadcasts only published rows.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'published_portfolio'
  ) then
    alter publication supabase_realtime add table public.published_portfolio;
  end if;
end $$;
