schema

public

Filter tables and policies
challenges

Disable RLS

Create policy

Name	Command	Applied to	Actions

admin_insert_challenges
INSERT	
authenticated


Allow admins to insert challenges
INSERT	
authenticated


Allow public read active challenges
SELECT	
public

profiles

Disable RLS

Create policy

Name	Command	Applied to	Actions

admin_read_profiles
SELECT	
authenticated


Allow admins to read profiles
SELECT	
authenticated


Allow authenticated read own profile
SELECT	
authenticated


Allow public leaderboard profiles
SELECT	
public


Allow travelers to create their profile
INSERT	
authenticated


Allow travelers to update their own profile
UPDATE	
authenticated

roadmap_progress

Disable RLS

Create policy

Name	Command	Applied to	Actions

progress_delete_own
DELETE	
authenticated


progress_insert_own
INSERT	
authenticated


progress_select_own
SELECT	
authenticated


progress_update_own
UPDATE	
authenticated

roadmap_steps

Disable RLS

Create policy

Name	Command	Applied to	Actions

roadmap_steps_read_authenticated
SELECT	
authenticated

roadmaps

Disable RLS

Create policy

Name	Command	Applied to	Actions

roadmaps_read_authenticated
SELECT	
authenticated

submissions

Disable RLS

Create policy

Name	Command	Applied to	Actions

admin_view_submissions
SELECT	
authenticated


Allow admins to update submission statuses
UPDATE	
authenticated


Allow admins to view all submissions
SELECT	
authenticated


Allow users to insert their own submissions
INSERT	
authenticated


Allow users to read own solutions
SELECT	
authenticated


Allow users to view their own submissions
SELECT	
authenticated

workshop_categories

Disable RLS

Create policy

Name	Command	Applied to	Actions

workshop_categories_admin_delete
DELETE	
authenticated


workshop_categories_admin_insert
INSERT	
authenticated


workshop_categories_admin_update
UPDATE	
authenticated


workshop_categories_read_authenticated
SELECT	
authenticated

workshops

Disable RLS

Create policy

Name	Command	Applied to	Actions

workshops_admin_delete
DELETE	
authenticated


workshops_admin_insert
INSERT	
authenticated


workshops_admin_update
UPDATE	
authenticated


workshops_read_authenticated
SELECT	
authenticated

---
## ADDENDUM — Competitive Programming (added with cp_problems.sql)

Run `db/cp_problems.sql` once in the Supabase SQL Editor.

### cp_problems

| Policy name | Command | Applied to | Summary |
| :--- | :--- | :--- | :--- |
| cp_problems_read_authenticated | SELECT | authenticated | Any logged-in user can read (needed to show the editor and limits) |
| cp_problems_read_public | SELECT | anon | Public read (in case the landing page ever needs it) |
| cp_problems_admin_insert | INSERT | authenticated | Admin-only (`profiles.role = 'admin'`) |
| cp_problems_admin_update | UPDATE | authenticated | Admin-only |
| cp_problems_admin_delete | DELETE | authenticated | Admin-only |

### cp_submission_details

| Policy name | Command | Applied to | Summary |
| :--- | :--- | :--- | :--- |
| cp_details_select_own | SELECT | authenticated | Users may read their own rows (via `submissions.user_id = auth.uid()`) |
| cp_details_admin_select | SELECT | authenticated | Admins may read all |

Inserts, updates, and deletes are performed **server-side only** (service-role key), so no client-side write policies are needed.

### storage.objects — cp-tests bucket

The bucket itself is inserted with `public = false`.

| Policy name | Command | Applied to | Summary |
| :--- | :--- | :--- | :--- |
| cp_tests_admin_insert | INSERT | authenticated | Admin-only, scoped to bucket `cp-tests` |
| cp_tests_admin_update | UPDATE | authenticated | Admin-only, same bucket |
| cp_tests_admin_delete | DELETE | authenticated | Admin-only, same bucket |

No public or authenticated SELECT policy exists — the file is read server-side via the service-role key only, so hidden tests never reach the browser.

### submissions table (migration)

`submission_url` has been altered to **drop NOT NULL** — CP submissions store no repo URL (the code lives in `cp_submission_details`).

