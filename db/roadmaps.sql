-- ============================================================================
-- THE TIME PORTAL - LEARN / ROADMAPS
-- Run this in your Supabase Dashboard - SQL Editor.
-- Safe to run more than once (tables are created with IF NOT EXISTS,
-- seed uses ON CONFLICT by slug/id so it will not duplicate).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ROADMAPS - a learning path (e.g. Competitive Programming)
-- ----------------------------------------------------------------------------
create table if not exists public.roadmaps (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  difficulty text default 'Beginner',
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. ROADMAP STEPS - ordered steps inside a path
--    resources = jsonb array of { "title": "...", "url": "..." }
-- ----------------------------------------------------------------------------
create table if not exists public.roadmap_steps (
  id uuid primary key default gen_random_uuid(),
  roadmap_id uuid not null references public.roadmaps(id) on delete cascade,
  position integer not null default 0,
  title text not null,
  description text,
  resources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (roadmap_id, position)
);

create unique index if not exists roadmap_steps_roadmap_pos_key
  on public.roadmap_steps (roadmap_id, position);

create index if not exists roadmap_steps_roadmap_pos_idx
  on public.roadmap_steps (roadmap_id, position);

-- ----------------------------------------------------------------------------
-- 3. ROADMAP PROGRESS - one row per completed step, per user
-- ----------------------------------------------------------------------------
create table if not exists public.roadmap_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  step_id uuid not null references public.roadmap_steps(id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (user_id, step_id)
);

create index if not exists roadmap_progress_user_idx
  on public.roadmap_progress (user_id);

-- ----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY
--    Roadmaps + steps are readable by any authenticated user.
--    Writes (insert/update/delete) are restricted to admins
--    (profiles.role = 'admin'), matching db/workshops.sql.
--    Progress is only visible/writable by the owner.
-- ----------------------------------------------------------------------------
alter table public.roadmaps         enable row level security;
alter table public.roadmap_steps    enable row level security;
alter table public.roadmap_progress enable row level security;

drop policy if exists "roadmaps_read_authenticated" on public.roadmaps;
create policy "roadmaps_read_authenticated"
  on public.roadmaps for select
  to authenticated using (true);

drop policy if exists "roadmap_steps_read_authenticated" on public.roadmap_steps;
create policy "roadmap_steps_read_authenticated"
  on public.roadmap_steps for select
  to authenticated using (true);

drop policy if exists "roadmaps_admin_insert" on public.roadmaps;
create policy "roadmaps_admin_insert"
  on public.roadmaps for insert
  to authenticated with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "roadmaps_admin_update" on public.roadmaps;
create policy "roadmaps_admin_update"
  on public.roadmaps for update
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "roadmaps_admin_delete" on public.roadmaps;
create policy "roadmaps_admin_delete"
  on public.roadmaps for delete
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "roadmap_steps_admin_insert" on public.roadmap_steps;
create policy "roadmap_steps_admin_insert"
  on public.roadmap_steps for insert
  to authenticated with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "roadmap_steps_admin_update" on public.roadmap_steps;
create policy "roadmap_steps_admin_update"
  on public.roadmap_steps for update
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  ) with check (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "roadmap_steps_admin_delete" on public.roadmap_steps;
create policy "roadmap_steps_admin_delete"
  on public.roadmap_steps for delete
  to authenticated using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "progress_select_own" on public.roadmap_progress;
create policy "progress_select_own"
  on public.roadmap_progress for select
  to authenticated using (auth.uid() = user_id);

drop policy if exists "progress_insert_own" on public.roadmap_progress;
create policy "progress_insert_own"
  on public.roadmap_progress for insert
  to authenticated with check (auth.uid() = user_id);

drop policy if exists "progress_update_own" on public.roadmap_progress;
create policy "progress_update_own"
  on public.roadmap_progress for update
  to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "progress_delete_own" on public.roadmap_progress;
create policy "progress_delete_own"
  on public.roadmap_progress for delete
  to authenticated using (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. SEED DATA - 4 learning paths with ordered steps + resources
-- ----------------------------------------------------------------------------

-- -------- Competitive Programming --------
insert into public.roadmaps (slug, title, description, difficulty)
values ($tag$competitive-programming$tag$, $tag$Competitive Programming$tag$, $tag$Master algorithms and data structures through intense problem-solving. Ideal for contest preparation on Codeforces, LeetCode and AtCoder.$tag$, $tag$Intermediate$tag$)
on conflict (slug) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 1, $tag$Programming Fundamentals$tag$, $tag$Pick a contest language (C++ recommended, Python acceptable) and master syntax, I/O and debugging.$tag$, $tag$[{"title":"Learn C++","url":"https://www.learncpp.com/"},{"title":"Learn Python","url":"https://www.codecademy.com/learn/learn-python-3"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 2, $tag$Time Complexity & Big-O$tag$, $tag$Analyze how algorithms scale. Understand O(1), O(log n), O(n), O(n log n), O(n^2) and why it matters.$tag$, $tag$[{"title":"Big-O Cheat Sheet","url":"https://www.bigocheatsheet.com/"},{"title":"Khan Academy Algorithms","url":"https://www.khanacademy.org/computing/computer-science/algorithms"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 3, $tag$Arrays, Strings & Hashing$tag$, $tag$Master the most used data structures: dynamic arrays, string manipulation and hash maps/sets.$tag$, $tag$[{"title":"Array problems","url":"https://leetcode.com/tag/array/"},{"title":"Hash table guide","url":"https://www.geeksforgeeks.org/hashing-data-structure/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 4, $tag$Sorting & Searching$tag$, $tag$Implement and know when to use merge sort, quicksort, binary search and variants.$tag$, $tag$[{"title":"Sorting algorithms","url":"https://www.geeksforgeeks.org/sorting-algorithms/"},{"title":"Binary search","url":"https://leetcode.com/tag/binary-search/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 5, $tag$Two Pointers & Sliding Window$tag$, $tag$Techniques to turn O(n^2) brute-force into linear solutions on arrays and strings.$tag$, $tag$[{"title":"Two pointers","url":"https://leetcode.com/tag/two-pointers/"},{"title":"Sliding window","url":"https://leetcode.com/tag/sliding-window/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 6, $tag$Linked Lists$tag$, $tag$Understand singly/doubly linked lists, reversal, cycle detection and fast-slow pointers.$tag$, $tag$[{"title":"Linked list guide","url":"https://www.geeksforgeeks.org/data-structures/linked-list/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 7, $tag$Stacks & Queues$tag$, $tag$Use LIFO/FIFO structures for problems like balanced parentheses, monotonic stacks and BFS queues.$tag$, $tag$[{"title":"Stack problems","url":"https://leetcode.com/tag/stack/"},{"title":"Queue problems","url":"https://leetcode.com/tag/queue/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 8, $tag$Recursion & Backtracking$tag$, $tag$Think recursively; solve combinations, permutations, subsets and grid puzzles with backtracking.$tag$, $tag$[{"title":"Backtracking intro","url":"https://www.geeksforgeeks.org/backtracking-algorithms/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 9, $tag$Trees & Binary Search Trees$tag$, $tag$Traversals (pre/in/post/level), BST operations, balanced trees and common tree tricks.$tag$, $tag$[{"title":"Binary tree guide","url":"https://leetcode.com/tag/binary-tree/"},{"title":"BST operations","url":"https://www.geeksforgeeks.org/binary-search-tree-data-structure/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 10, $tag$Graphs: BFS & DFS$tag$, $tag$Model problems as graphs; implement traversals, shortest paths and connectivity checks.$tag$, $tag$[{"title":"Graph algorithms","url":"https://leetcode.com/tag/graph/"},{"title":"BFS/DFS explained","url":"https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 11, $tag$Dynamic Programming$tag$, $tag$Memoization vs tabulation. Master 1D/2D DP, knapsack, LIS, LCS and classic sequences.$tag$, $tag$[{"title":"DP problems","url":"https://leetcode.com/tag/dynamic-programming/"},{"title":"DP patterns","url":"https://www.geeksforgeeks.org/dynamic-programming/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 12, $tag$Greedy Algorithms$tag$, $tag$Recognize problems where a local choice leads to a global optimum.$tag$, $tag$[{"title":"Greedy problems","url":"https://leetcode.com/tag/greedy/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 13, $tag$Contest Platforms & Rated Rounds$tag$, $tag$Practice daily on contests and build a contest routine. Track rating to measure growth.$tag$, $tag$[{"title":"LeetCode","url":"https://leetcode.com/"},{"title":"Codeforces","url":"https://codeforces.com/"},{"title":"AtCoder","url":"https://atcoder.jp/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$competitive-programming$tag$
on conflict (roadmap_id, position) do nothing;

-- -------- AI / Machine Learning --------
insert into public.roadmaps (slug, title, description, difficulty)
values ($tag$ai-machine-learning$tag$, $tag$AI / Machine Learning$tag$, $tag$From math foundations to building and training neural networks with modern frameworks.$tag$, $tag$Intermediate$tag$)
on conflict (slug) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 1, $tag$Math Foundations: Linear Algebra$tag$, $tag$Vectors, matrices, dot products, eigenvalues - the language of ML.$tag$, $tag$[{"title":"3Blue1Brown Linear Algebra","url":"https://www.3blue1brown.com/topics/linear-algebra"},{"title":"Khan Academy Linear Algebra","url":"https://www.khanacademy.org/math/linear-algebra"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 2, $tag$Calculus & Optimization$tag$, $tag$Derivatives, gradients and gradient descent - how models actually learn.$tag$, $tag$[{"title":"3Blue1Brown Calculus","url":"https://www.3blue1brown.com/topics/calculus"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 3, $tag$Probability & Statistics$tag$, $tag$Distributions, expectation, variance, Bayes rule and hypothesis testing.$tag$, $tag$[{"title":"Khan Academy Statistics","url":"https://www.khanacademy.org/math/statistics-probability"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 4, $tag$Python for Data Science$tag$, $tag$NumPy for arrays and Pandas for tabular data. The core toolkit of ML.$tag$, $tag$[{"title":"NumPy","url":"https://numpy.org/doc/stable/"},{"title":"Pandas","url":"https://pandas.pydata.org/docs/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 5, $tag$Data Handling & Visualization$tag$, $tag$Clean, reshape and plot data with Matplotlib and Seaborn before modeling.$tag$, $tag$[{"title":"Matplotlib","url":"https://matplotlib.org/"},{"title":"Seaborn","url":"https://seaborn.pydata.org/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 6, $tag$Supervised Learning: Regression$tag$, $tag$Linear regression, regularization (ridge/lasso) and evaluation metrics.$tag$, $tag$[{"title":"Scikit-learn linear models","url":"https://scikit-learn.org/stable/modules/linear_model.html"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 7, $tag$Supervised Learning: Classification$tag$, $tag$Logistic regression, decision trees, random forests and SVMs.$tag$, $tag$[{"title":"Scikit-learn ensemble methods","url":"https://scikit-learn.org/stable/modules/ensemble.html"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 8, $tag$Model Evaluation & Validation$tag$, $tag$Train/test splits, cross-validation, precision/recall and avoiding overfitting.$tag$, $tag$[{"title":"Cross-validation guide","url":"https://scikit-learn.org/stable/modules/cross_validation.html"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 9, $tag$Unsupervised Learning & Clustering$tag$, $tag$K-means, hierarchical clustering, PCA and dimensionality reduction.$tag$, $tag$[{"title":"Scikit-learn clustering","url":"https://scikit-learn.org/stable/modules/clustering.html"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 10, $tag$Neural Networks Basics$tag$, $tag$Perceptrons, activation functions, backpropagation and the intuition behind deep learning.$tag$, $tag$[{"title":"3Blue1Brown Neural Networks","url":"https://www.3blue1brown.com/topics/neural-networks"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 11, $tag$Deep Learning Frameworks$tag$, $tag$Build and train models with TensorFlow/Keras or PyTorch.$tag$, $tag$[{"title":"TensorFlow","url":"https://www.tensorflow.org/learn"},{"title":"PyTorch","url":"https://pytorch.org/tutorials/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 12, $tag$Capstone Projects$tag$, $tag$Ship 2-3 end-to-end projects (CV, NLP, tabular) on Kaggle to build a portfolio.$tag$, $tag$[{"title":"Kaggle competitions","url":"https://www.kaggle.com/competitions"}]$tag$::jsonb
from public.roadmaps where slug = $tag$ai-machine-learning$tag$
on conflict (roadmap_id, position) do nothing;

-- -------- Data Science --------
insert into public.roadmaps (slug, title, description, difficulty)
values ($tag$data-science$tag$, $tag$Data Science$tag$, $tag$Turn raw data into insight: statistics, analysis, visualization and storytelling with Python.$tag$, $tag$Beginner$tag$)
on conflict (slug) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 1, $tag$Data Science Overview & Tools$tag$, $tag$Understand the workflow: question -> data -> analysis -> insight -> decision.$tag$, $tag$[{"title":"Data Science intro","url":"https://www.datasciencecourse.org/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 2, $tag$Statistics Fundamentals$tag$, $tag$Descriptive stats, distributions, sampling and hypothesis testing.$tag$, $tag$[{"title":"Statistics tutorial","url":"https://www.khanacademy.org/math/statistics-probability"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 3, $tag$Python Data Analysis with Pandas$tag$, $tag$DataFrames, indexing, group-by, merges and pipelines.$tag$, $tag$[{"title":"Pandas 10-minute guide","url":"https://pandas.pydata.org/docs/user_guide/10min.html"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 4, $tag$Data Cleaning & Wrangling$tag$, $tag$Handle missing values, outliers, duplicates and inconsistent types.$tag$, $tag$[{"title":"Data cleaning guide","url":"https://www.kaggle.com/learn/data-cleaning"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 5, $tag$Data Visualization$tag$, $tag$Tell clear stories with Matplotlib, Seaborn and Plotly.$tag$, $tag$[{"title":"Kaggle Data Viz","url":"https://www.kaggle.com/learn/data-visualization"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 6, $tag$Exploratory Data Analysis (EDA)$tag$, $tag$Summarize and explore datasets before modeling; find patterns and hypotheses.$tag$, $tag$[{"title":"EDA with Python","url":"https://www.kaggle.com/learn/exploratory-data-analysis"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 7, $tag$SQL for Data Science$tag$, $tag$Query and aggregate databases - an essential skill for any analyst.$tag$, $tag$[{"title":"Kaggle Intro to SQL","url":"https://www.kaggle.com/learn/intro-to-sql"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 8, $tag$Intro to Machine Learning$tag$, $tag$Build and evaluate first models with scikit-learn.$tag$, $tag$[{"title":"Kaggle ML course","url":"https://www.kaggle.com/learn/intro-to-machine-learning"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 9, $tag$Storytelling with Data$tag$, $tag$Structure reports and dashboards that drive decisions.$tag$, $tag$[{"title":"Storytelling with Data","url":"https://www.storytellingwithdata.com/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 10, $tag$Portfolio Projects$tag$, $tag$Publish 3-4 analysis notebooks on Kaggle/GitHub covering different domains.$tag$, $tag$[{"title":"Kaggle datasets","url":"https://www.kaggle.com/datasets"}]$tag$::jsonb
from public.roadmaps where slug = $tag$data-science$tag$
on conflict (roadmap_id, position) do nothing;

-- -------- Cybersecurity --------
insert into public.roadmaps (slug, title, description, difficulty)
values ($tag$cybersecurity$tag$, $tag$Cybersecurity$tag$, $tag$Learn how systems are attacked and defended: networking, web security, cryptography and hands-on CTF.$tag$, $tag$Beginner$tag$)
on conflict (slug) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 1, $tag$Networking Fundamentals$tag$, $tag$OSI model, TCP/IP, DNS, HTTP and how packets travel the internet.$tag$, $tag$[{"title":"Networking basics","url":"https://www.cloudflare.com/learning/network-layer/what-is-the-network-layer/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 2, $tag$Operating Systems & Linux$tag$, $tag$Navigate Linux, understand processes, permissions and the terminal.$tag$, $tag$[{"title":"Linux journey","url":"https://linuxjourney.com/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 3, $tag$Web Fundamentals for Security$tag$, $tag$HTTP requests/responses, cookies, sessions and how browsers work.$tag$, $tag$[{"title":"MDN HTTP docs","url":"https://developer.mozilla.org/en-US/docs/Web/HTTP"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 4, $tag$Cryptography Basics$tag$, $tag$Hashing, symmetric/asymmetric encryption, TLS and common attacks.$tag$, $tag$[{"title":"Crypto 101","url":"https://www.crypto101.io/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 5, $tag$Web Security: OWASP Top 10$tag$, $tag$SQL injection, XSS, CSRF, IDOR and the most critical web risks.$tag$, $tag$[{"title":"OWASP Top 10","url":"https://owasp.org/www-project-top-ten/"},{"title":"PortSwigger Academy","url":"https://portswigger.net/web-security"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 6, $tag$Network Security & Firewalls$tag$, $tag$Segmentation, firewalls, IDS/IPS and secure network design.$tag$, $tag$[{"title":"Wireshark","url":"https://www.wireshark.org/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 7, $tag$Reconnaissance & Scanning$tag$, $tag$Passive and active recon, port scanning and service enumeration with Nmap.$tag$, $tag$[{"title":"Nmap book","url":"https://nmap.org/book/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 8, $tag$Penetration Testing & Exploitation$tag$, $tag$Burp Suite, Metasploit and basic exploitation in safe lab environments.$tag$, $tag$[{"title":"Burp Suite docs","url":"https://portswigger.net/burp"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 9, $tag$CTF Practice & Wargames$tag$, $tag$Sharpen skills on legal practice labs and capture-the-flag events.$tag$, $tag$[{"title":"TryHackMe","url":"https://tryhackme.com/"},{"title":"Hack The Box","url":"https://www.hackthebox.com/"},{"title":"OverTheWire","url":"https://overthewire.org/wargames/"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

insert into public.roadmap_steps (roadmap_id, position, title, description, resources)
select id, 10, $tag$Certifications & Careers$tag$, $tag$Plan a path: Security+, CEH, OSCP and build a portfolio of write-ups.$tag$, $tag$[{"title":"Roadmap.sh security","url":"https://roadmap.sh/cyber-security"}]$tag$::jsonb
from public.roadmaps where slug = $tag$cybersecurity$tag$
on conflict (roadmap_id, position) do nothing;

-- ============================================================================
-- Done. The Learn section will now show 4 roadmaps.
-- ============================================================================
