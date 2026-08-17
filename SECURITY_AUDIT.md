# Security Audit Report — The Time Portal

**Scope:** `deployable_platform - Copie - Copie (2)` · Vanilla JS + Supabase + Vercel serverless · Audited all page JS, shared JS, API functions, SQL schemas, git history.

**Audit date:** 2026-08-15

---

## Summary

The platform has good baseline practices (consistent `escapeHtml()`/`safeUrl()` XSS protection, secrets correctly gitignored, DB-backed admin role for the admin panel). After confirming with the project owner that RLS for `challenges`, `submissions`, and `profiles` is enabled in the Supabase dashboard and gated by `profiles.role = 'admin'`, the admin panel access control is **server-enforced and properly protected**.

The remaining findings below focus on defense-in-depth gaps and real residual risks (mainly rate limiting and missing security headers).

---

## 🔴 Critical

*None — the highest-severity issues were resolved once RLS was confirmed on the core tables.*

---

## 🟠 High

### C3 — Rate limiting is client-side, advisory-only, and fail-open
- **Files:** `assets/js/pages/login.js:43`, `assets/js/pages/signup.js:77` (both `catch { proceed anyway }`); auth calls hit Supabase directly from the client (`login.js:47`, `signup.js:98`).
- **Impact:** The `api/rateLimit.js` gate is checked in the browser and can be skipped entirely. An attacker calling `supabase.auth.signInWithPassword` directly gets unlimited brute-force attempts.
- **Additional flaws in `api/rateLimit.js`:** in-memory store resets on every Vercel cold start (`:6`); trusts the spoofable `x-forwarded-for` header (`:11-16`).
- **Fix:** Enforce server-side (route auth through a serverless function or Supabase auth settings / account lockout), derive IP from a trusted header, and **fail closed**, not open.

### H1 — No security headers on the actual application
- **Files:** `api/config.js:19-22` sets CSP / `X-Frame-Options` / HSTS only on the API endpoint responses. **Zero** `http-equiv` CSP across all HTML; `vercel.json` has no `headers` section.
- **Impact:** The main site pages lack CSP, frame-ancestors, HSTS, and `X-Content-Type-Options`. Project docs overstate this coverage.
- **Fix:** Add a `headers` block in `vercel.json` (CSP, `X-Frame-Options: DENY`, HSTS, `X-Content-Type-Options: nosniff`).

---

## 🟡 Medium

### C1 — Admin password served to any caller of the config endpoint (defense-in-depth)
- **Files:** `api/config.js:38` returns `adminPassword` to any unauthenticated caller; `assets/js/pages/admin.js:26,65` compares the typed password against that value **in the browser**.
- **Context:** Since the admin panel is already gated server-side by `profiles.role = 'admin'` (RLS), this is **not** a bypass — the DB role is the real gate. However, the admin secret is still exposed in the `/api/config` response and compared client-side, making the password a weak, redundant layer and leaking a secret that should never leave the server.
- **Fix:** Remove `adminPassword` from the config response; move the password check into a serverless function that verifies the caller's role server-side and compares the submitted password to `process.env.ADMIN_PASSWORD` inside the function. Return only `{ authorized: true/false }`.

### H3 — No server-side validation on profile/username writes
- **File:** `dashboard.js:488` updates `profiles.username` with no length / charset / duplicate check; `signup.js:84` checks duplicates client-side only.
- **Fix:** Validate on the server (or via RLS + a check constraint / trigger).

### M2 — No email-verification gating on signup
- **Impact:** Account spam / abuse.
- **Fix:** Require email confirmation in Supabase auth settings.

### M3 — No server-side input validation
- **File:** `admin.js:103` uses `parseInt` on `points_worth` with no range check; challenge / roadmap / workshop fields are validated client-side only.
- **Fix:** Add range/format validation on the server or via DB constraints.

---

## 🟢 Low

- **M1 — DevTools / right-click blocking** (`assets/js/security.js`): trivially bypassed, obscurity only, harms UX; no real protection.
- **M4 — Inline handler reliance:** `dashboard.js:439` uses `onclick="loadMoreLeaderboard()"`, depending on a global function.

---

## ✅ Positive observations

- Consistent `escapeHtml()` + `safeUrl()` usage prevents stored/reflected XSS — all user/admin-rendered strings are escaped.
- `.env.local` is correctly gitignored and **not** present in `git ls-files`; no secrets committed.
- Admin role is DB-backed and enforced via RLS for the admin panel (`profiles.role = 'admin'`).
- `rel="noopener noreferrer"` used on all external links.
- Client-side API cache with TTL reduces redundant Supabase calls.

---

## Recommended priority order

1. **C3** — make rate limiting server-enforced and fail-closed (highest residual risk).
2. **H1** — add security headers via `vercel.json`.
3. **C1** — remove `adminPassword` from the config response; server-side admin check instead.
4. **H3 / M2 / M3** — server-side validation and email verification.
5. **M1 / M4** — remove obscurity-only devtools blocking; replace inline handlers.

---

*No files in the project were modified as part of this audit — it was a read-only review.*
