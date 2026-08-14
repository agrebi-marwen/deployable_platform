-- ============================================================================
-- THE TIME PORTAL - WORKSHOPS
-- Run this in your Supabase Dashboard - SQL Editor.
-- Safe to run more than once (tables are created with IF NOT EXISTS,
-- indexes/policies use IF NOT EXISTS / drop-then-create).
-- Videos are hosted on Google Drive; the site stores the share link and
-- renders Drive's built-in player in an iframe.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WORKSHOP CATEGORIES - a grouping for workshop videos (e.g. Web Dev, AI)
-- ----------------------------------------------------------------------------
create table if not exists public.workshop_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. WORKSHOPS - a single recorded video + its metadata
--    video_url = Google Drive share link (or file id), normalized at render time
-- ----------------------------------------------------------------------------
create table if not exists public.workshops (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.workshop_categories(id) on delete cascade,
  title text not null,
  description text,
  video_url text not null,
  duration text,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists workshops_category_id_idx
  on public.workshops (category_id);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--    Any authenticated user can read categories + workshops.
--    Only admins (profiles.role = 'admin') can write.
-- ----------------------------------------------------------------------------
alter table public.workshop_categories enable row level security;
alter table public.workshops            enable row level security;

drop policy if exists "workshop_categories_read_authenticated" on public.workshop_categories;
create policy "workshop_categories_read_authenticated"
  on public.workshop_categories for select
  to authenticated using (true);

drop policy if exists "workshop_categories_admin_insert" on public.workshop_categories;
create policy "workshop_categories_admin_insert"
  on public.workshop_categories for insert
  to authenticated with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "workshop_categories_admin_update" on public.workshop_categories;
create policy "workshop_categories_admin_update"
  on public.workshop_categories for update
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "workshop_categories_admin_delete" on public.workshop_categories;
create policy "workshop_categories_admin_delete"
  on public.workshop_categories for delete
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "workshops_read_authenticated" on public.workshops;
create policy "workshops_read_authenticated"
  on public.workshops for select
  to authenticated using (true);

drop policy if exists "workshops_admin_insert" on public.workshops;
create policy "workshops_admin_insert"
  on public.workshops for insert
  to authenticated with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "workshops_admin_update" on public.workshops;
create policy "workshops_admin_update"
  on public.workshops for update
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "workshops_admin_delete" on public.workshops;
create policy "workshops_admin_delete"
  on public.workshops for delete
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================================
-- Done. Categories and workshops are managed from the Admin Panel.
-- ============================================================================
