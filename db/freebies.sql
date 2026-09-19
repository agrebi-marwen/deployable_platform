-- ============================================================================
-- THE TIME PORTAL - FREEBIE CHALLENGES
-- Run this in your Supabase Dashboard - SQL Editor.
-- Safe to run more than once.
--
-- Adds:
--   1. challenge_categories row "freebie" (short-text, always-accepted)
--   2. submissions.notes column to hold the freebie's answer text
-- ============================================================================

-- 1. FREEBEIE CATEGORY - assign a challenge to this category in the admin to
--    turn it into a freebie: the submit page swaps the repo/code boxes for a
--    plain text input that is always approved (see assets/js/pages/submit.js).
insert into public.challenge_categories (slug, name)
select 'freebie', 'Freebie'
where not exists (select 1 from public.challenge_categories where slug = 'freebie');

-- 2. NOTES - freebie answers are stored here (submission_url stays null so the
--    history page never renders them as a repo link).
alter table public.submissions
  add column if not exists notes text;