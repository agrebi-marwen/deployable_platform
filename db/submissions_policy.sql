-- ============================================================================
-- THE TIME PORTAL - SITE-SIDE SUBMISSION POLICY
-- Run this in your Supabase Dashboard - SQL Editor.
-- Safe to run more than once (IF EXISTS).
--
-- Moves submission uniqueness OUT of the database and into the application.
-- The app now decides who may submit (see assets/js/pages/submit.js and
-- api/cpSubmit.js): a user is blocked only if they already succeeded on a
-- challenge (APPROVED) or a judge is currently running. They may re-submit
-- after a failure (REJECTED) or while an earlier submission awaits
-- confirmation (PENDING).
-- ============================================================================

-- Remove the database-level "one submission per (user, challenge)" rule.
alter table public.submissions
  drop constraint if exists unique_user_challenge;

-- Keep a plain index on (user_id, challenge_id) so the app's eligibility
-- checks stay fast now that rows are no longer unique.
create index if not exists submissions_user_challenge_idx
  on public.submissions (user_id, challenge_id);