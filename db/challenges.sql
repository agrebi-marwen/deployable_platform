-- ============================================================================
-- THE TIME PORTAL - CHALLENGES
-- Run this in your Supabase Dashboard - SQL Editor.
-- Safe to run more than once (tables are created with IF NOT EXISTS,
-- indexes/policies use IF NOT EXISTS / drop-then-create).
-- Adds a category grouping for monthly challenges (e.g. CP, MLOps).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. CHALLENGE CATEGORIES - a grouping for anomalies
-- ----------------------------------------------------------------------------
create table if not exists public.challenge_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. CHALLENGES - optional category link (nullable so existing rows keep
--    working). Deleting a category cascades to its challenges.
-- ----------------------------------------------------------------------------
alter table public.challenges
  add column if not exists category_id uuid
  references public.challenge_categories(id) on delete cascade;

create index if not exists challenges_category_id_idx
  on public.challenges (category_id);

-- ----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
--    Any authenticated user can read categories.
--    Only admins (profiles.role = 'admin') can write.
-- ----------------------------------------------------------------------------
alter table public.challenge_categories enable row level security;

drop policy if exists "challenge_categories_read_authenticated" on public.challenge_categories;
create policy "challenge_categories_read_authenticated"
  on public.challenge_categories for select
  to authenticated using (true);

drop policy if exists "challenge_categories_admin_insert" on public.challenge_categories;
create policy "challenge_categories_admin_insert"
  on public.challenge_categories for insert
  to authenticated with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "challenge_categories_admin_update" on public.challenge_categories;
create policy "challenge_categories_admin_update"
  on public.challenge_categories for update
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "challenge_categories_admin_delete" on public.challenge_categories;
create policy "challenge_categories_admin_delete"
  on public.challenge_categories for delete
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ============================================================================
-- Done. Challenge categories are managed from the Admin Panel.
-- ============================================================================