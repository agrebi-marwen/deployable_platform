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

