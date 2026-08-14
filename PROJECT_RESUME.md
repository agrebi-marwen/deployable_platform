# PROJECT RESUME — The Time Portal

A gamified monthly coding-challenge platform built and maintained by the **IEEE CS INSAT Student Branch Chapter**. Users solve monthly coding challenges, submit GitHub/GitLab repository links, earn Energy Points (EP), and climb a 7-tier rank ladder — all inside a cohesive 16-bit / 8-bit "temporal" design system.

---

## 1. Tech Stack

| Layer | Technology |
| :--- | :--- |
| Frontend | Vanilla HTML5, CSS3, JavaScript (no framework) |
| Backend / Database | Supabase (PostgreSQL + Auth + Row Level Security) |
| Serverless Functions | Vercel (Node.js) — `api/config`, `api/rateLimit` |
| Runtime Dependencies | Supabase JS SDK (`supabase-js`), Google Fonts (Press Start 2P, VT323, Space Grotesk) |
| Deployment | Vercel (`vercel.json`), or local via `python -m http.server` |

---

## 2. Core Functionalities

### 2.1 Public Landing Page (`index.html`)
- Hero section with "Enter Time Rift" CTA and tagline.
- Team showcase of the IEEE CS INSAT officers (photo, role, LinkedIn/email links).
- **Public leaderboard**: top 3 travelers by EP (no login required).
- **Latest anomalies**: last 3 active challenges pulled live from the database, each with epoch label, title, description snippet, and EP reward, linking straight to the challenge archive.
- **Dynamic auth navbar**: swaps the "Sign Up" button for the logged-in username + EP + logout button when a session exists.

### 2.2 Authentication (`account/`)
- **Signup** (`signup.html`): username / email / password with
  - Password-strength validation (min 8 chars, uppercase, lowercase, digit),
  - Confirm-password matching,
  - Duplicate-username and duplicate-email checks,
  - Rate limiting via serverless endpoint.
- **Login** (`login.html`): email + password with rate limiting, session persistence, auto token refresh, and automatic redirect if already logged in.

### 2.3 User Dashboard (`dashboard/dashboard.html`)
- **HUD stats**: Temporal Rank (7-tier ladder: Novice Traveler → Chronos Engineer → Temporal Artisan → Paradox Hunter → Timeline Guardian → Epoch Master → Grand Time Lord), Energy Points, and Anomalies Solved (count of APPROVED submissions).
- **Segmented rank progress bar** with "EP to next rank" indicator.
- **Mission Progress**: active challenges with the user's latest submission status (Approved / Rejected / Pending Review / Not Started).
- **Per-Epoch Stats**: approved/total patches per deployment month, rendered as segmented pixel bars.
- **Leaderboard modal**: paginated rankings (50 per page) with "Load More Travelers".
- **Settings modal**: update public username and password (Supabase auth update).
- **Auto-provisioning**: creates a default profile row if the user has none.
- **Stealth admin gateway**: hidden Shift+click sequence on the rank stat decodes (base64) and redirects to the admin panel.

### 2.4 Challenge Archive (`dashboard/challenges.html`)
- All challenges ever deployed, **grouped by month/year epoch**, newest first.
- Active challenges are clickable (→ submit page); archived ones are visually marked.
- Supports a `?target=<challenge-id>` deep link from the homepage, with smooth scroll + highlight.

### 2.5 Submission Flow (`dashboard/submit.html`)
- Displays full challenge details (title, month epoch, EP reward, instructions) tinted with the epoch color.
- Accepts a **GitHub or GitLab repository URL**, validated by regex on both client (HTML pattern) and JS.
- Inserts a submission with `status = PENDING`.
- Success feedback with an animated particle burst.

### 2.6 Submissions Log (`dashboard/submissions.html`)
- Table of the user's submission history: timestamp, challenge title (joined from `challenges`), repository URL (safe, opens in new tab), and status badge.

### 2.7 Admin Panel (`admin/admin.html`)
- **Two-step authorization**: (1) Supabase database role check (`role = 'admin'`), (2) admin password loaded from the serverless config endpoint (kept secret from the client).
- **Deploy new challenge**: title, EP reward, instructions, active toggle — automatically tagged to the current month/year.
- **Review pending submissions**: approve or reject, with animated card removal and live refresh.
- **Roadmap operations**: deploy/edit/delete learning paths (title, slug, description, difficulty) and manage their steps (add, edit, delete, reorder via up/down, resources as `Title | URL` lines).

### 2.8 Learn — Roadmaps (`dashboard/learn.html`, `dashboard/roadmap.html`)
- **Path index**: all deployed learning paths as cards with difficulty tag, description, step count, and a segmented per-user progress bar.
- **Path detail**: ordered step list with descriptions and curated resource links; each step is a pixel checkbox.
- **Per-account progress**: step completion stored in `roadmap_progress` (scoped to `auth.uid()`), updated live when toggling a step.
- **Schema** (`db/roadmaps.sql`): `roadmaps`, `roadmap_steps` (ordered, `resources` jsonb), and `roadmap_progress` tables with RLS — run in the Supabase SQL Editor (includes seed data for Competitive Programming, AI/ML, Data Science, Cybersecurity).

---

## 3. Security Measures

- **XSS protection**: all dynamic strings escaped via `escapeHtml()` before interpolation; untrusted URLs whitelisted through `safeUrl()` (only `http(s)://`).
- **DevTools tampering resistance**: blocks right-click, F12, Ctrl+Shift+I/J, Ctrl+U; periodic `debugger` statement pauses execution while DevTools is open.
- **Serverless config endpoint** (`api/config`): serves Supabase credentials and admin password from environment variables — never exposed in client source; adds CORS allowlist, `X-Content-Type-Options`, `X-Frame-Options`, HSTS, CSP, and 1-hour caching.
- **Rate limiting** (`api/rateLimit`): 5 auth attempts per 15 minutes per IP+email hash (SHA-256), returns HTTP 429 with retry-after.
- **Auth hardening**: password-strength policy, session persistence, route guards (pages redirect unauthenticated users to login).

---

## 4. Architecture & Performance

- **Centralized config loading** (`assets/js/config.js`): fetches credentials from the Vercel serverless function with environment auto-detection (localhost vs. production) and a `waitForConfig()` promise.
- **Client-side API cache** (`assets/js/api-cache.js`): TTL-based (5 min) request deduplication for Supabase queries to reduce redundant network calls.
- **DOM batching**: challenge/leaderboard lists built with `DocumentFragment` for a single reflow.
- **Pagination**: leaderboard limited to 50 rows per fetch with incremental "load more".
- **Clean deployment** via `vercel.json` (`cleanUrls`, no trailing slashes).

---

## 5. Frontend Experience & Effects

- **WebGL galaxy starfield** (`assets/js/galaxy-bg.js`): layered drifting stars with mouse parallax — transparent, DPR-aware, disabled on mobile/touch, and static under `prefers-reduced-motion`.
- **Cursor spotlight & dynamic lighting** (`assets/js/cursor-lighting.js`): spotlight overlay, smooth-follow cursor ring, and per-card mouse tracking for hover lighting.
- **Dark / light theme** (`assets/js/theme.js`): persisted toggle, applied before first paint.
- **Epoch theming** (`assets/js/creative.js`): deterministic per-month hue derived from the 5-color palette (`epochHue`), success particle bursts.
- **Design system** (`DESIGN.md`): near-black starfield base, 5-color palette, chunky hard shadows, 8-bit bevel framing, segmented HUD bars, pixel/mono/body type hierarchy, and a strict no-flashing motion policy.

---

## 6. Key Files

| Path | Purpose |
| :--- | :--- |
| `index.html` / `assets/js/pages/index.js` | Public landing page logic |
| `account/login.html` / `assets/js/pages/login.js` | Login page |
| `account/signup.html` / `assets/js/pages/signup.js` | Signup page |
| `dashboard/dashboard.html` / `assets/js/pages/dashboard.js` | Main user dashboard |
| `dashboard/challenges.html` / `assets/js/pages/challenges.js` | Challenge archive |
| `dashboard/submit.html` / `assets/js/pages/submit.js` | Solution submission |
| `dashboard/submissions.html` / `assets/js/pages/submissions.js` | Submission history |
| `admin/admin.html` / `assets/js/pages/admin.js` | Admin challenge deployment & review + roadmap/step management |
| `dashboard/learn.html` / `assets/js/pages/learn.js` | Learning path index with progress |
| `dashboard/roadmap.html` / `assets/js/pages/roadmap.js` | Path detail: steps, resources, per-account completion |
| `db/roadmaps.sql` | Supabase schema + RLS + seed data for the Learn feature |
| `api/config.js` | Secure config serverless function |
| `api/rateLimit.js` | Auth rate-limiting serverless function |
| `assets/js/` | Shared helpers: config, cache, theme, galaxy, lighting, creative |
| `assets/css/` | Shared `global.css` + per-page `account.css`, `admin.css`, `dashboard.css`, `learn.css` |
| `DESIGN.md` | Design system specification |
