-- ============================================================================
-- THE TIME PORTAL - ROADMAPS (node-based, challenge-tag gated)
-- Run this in your Supabase Dashboard - SQL Editor.
-- Safe to run more than once (all statements use IF NOT EXISTS).
--
-- This adds a NEW node-based roadmap system, separate from the existing
-- "Learn" checklist system. Roadmaps are full learning fields (e.g. CP,
-- MLOps) made of ordered NODES. To unlock the next node you must have
-- already unlocked the previous nodes AND have at least one APPROVED
-- submission on a challenge carrying the node's required tags.
-- Progress stores only the DEEPEST unlocked node per user per roadmaps.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ROADMAPS - add a `type` discriminator.
--    'learn' = existing checklist paths (default, seeds unchanged).
--    'nodes' = new node-based roadmaps shown on the Roadmaps page.
-- ----------------------------------------------------------------------------
alter table public.roadmaps
  add column if not exists type text not null default 'learn';

create index if not exists roadmaps_type_idx on public.roadmaps (type);

-- ----------------------------------------------------------------------------
-- 2. ROADMAP NODES - ordered nodes inside a node-based roadmap.
--    required_tags = jsonb array of tag strings WITHOUT the '#' prefix,
--                    e.g. ["Arrays","Binary Search"]. A user must have an
--                    APPROVED submission on a challenge whose tags include
--                    EVERY one of these to unlock the node.
--    resources     = jsonb array of { "title": "...", "url": "..." }
-- ----------------------------------------------------------------------------
create table if not exists public.roadmap_nodes (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  description text,
  required_tags jsonb not null default '[]'::jsonb,
  resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (roadmap_id, position)
);

create unique index if not exists roadmap_nodes_roadmap_pos_key
  on public.roadmap_nodes (roadmap_id, position);

create index if not exists roadmap_nodes_roadmap_idx
  on public.roadmap_nodes (roadmap_id, position);

-- ----------------------------------------------------------------------------
-- 3. ROADMAP NODE PROGRESS - stores ONLY the deepest unlocked node per user,
--    per roadmap. One row per (user_id, roadmap_id).
-- ----------------------------------------------------------------------------
create table if not exists public.roadmap_node_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  node_id uuid not null references public.roadmap_nodes(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, roadmap_id)
);

create index if not exists roadmap_node_progress_user_idx
  on public.roadmap_node_progress (user_id);

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
--    Roadmaps + nodes readable by any authenticated user.
--    Writes are admin-only. Progress is owner-only.
-- ----------------------------------------------------------------------------
alter table public.roadmap_nodes         enable row level security;
alter table public.roadmap_node_progress enable row level security;

drop policy if exists "roadmap_nodes_read_authenticated" on public.roadmap_nodes;
create policy "roadmap_nodes_read_authenticated"
  on public.roadmap_nodes for select
  to authenticated using (true);

drop policy if exists "roadmap_nodes_admin_insert" on public.roadmap_nodes;
create policy "roadmap_nodes_admin_insert"
  on public.roadmap_nodes for insert
  to authenticated with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "roadmap_nodes_admin_update" on public.roadmap_nodes;
create policy "roadmap_nodes_admin_update"
  on public.roadmap_nodes for update
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "roadmap_nodes_admin_delete" on public.roadmap_nodes;
create policy "roadmap_nodes_admin_delete"
  on public.roadmap_nodes for delete
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "node_progress_select_own" on public.roadmap_node_progress;
create policy "node_progress_select_own"
  on public.roadmap_node_progress for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "node_progress_insert_own" on public.roadmap_node_progress;
create policy "node_progress_insert_own"
  on public.roadmap_node_progress for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "node_progress_update_own" on public.roadmap_node_progress;
create policy "node_progress_update_own"
  on public.roadmap_node_progress for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "node_progress_delete_own" on public.roadmap_node_progress;
create policy "node_progress_delete_own"
  on public.roadmap_node_progress for delete
  to authenticated using (auth.uid() = user_id);

-- ============================================================================
-- NOTE: The `roadmaps` SELECT/INSERT/UPDATE/DELETE RLS policies already exist
-- in db/roadmaps.sql (read: any authenticated; write: admin). The new
-- `type` column is covered by those existing policies - no new policies
-- are needed on public.roadmaps itself.
--
-- Admins should create a node-based roadmap from the Admin Panel by setting
-- type = 'nodes'. Example (run once, or add via the Admin Panel):
--   update public.roadmaps set type = 'nodes'
--   where slug in ('competitive-programming', 'ai-machine-learning');
-- ============================================================================
-- Done.
-- ============================================================================
