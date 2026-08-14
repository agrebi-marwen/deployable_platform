/* common.js - Shared utilities for every page.
   Load AFTER config.js, BEFORE the page script (defer in all cases).
   Exposes a single global Supabase client + render/format helpers so
   no page file needs to re-declare them. */

window.supabaseClient = null;

// Boot the Supabase client, then hand off to the page initializer.
// `options` are extra createClient() options (e.g. auth settings).
// `ready(client, config)` runs once the client exists.
window.initApp = async function (ready, options) {
  const config = await waitForConfig();
  if (!config) return;
  window.supabaseClient = supabase.createClient(config.url, config.anonKey, options);
  if (typeof ready === 'function') ready(window.supabaseClient, config);
};

// Require an authenticated session; redirect otherwise.
// Returns the session (or null when unauthenticated).
window.requireSession = async function (redirect = '../account/login.html') {
  const { data: { session } } = await window.supabaseClient.auth.getSession();
  if (!session || !session.user) {
    window.location.href = redirect;
    return null;
  }
  return session;
};

// Bind a "Log Out" button to sign out and navigate home.
window.bindLogout = function (btn, redirect = '../index.html') {
  if (!btn) return;
  btn.addEventListener('click', async () => {
    await window.supabaseClient.auth.signOut();
    window.location.href = redirect;
  });
};

// Fill an element with the logged-in user's display name.
window.loadUsername = async function (userId, el) {
  if (!el) return;
  const { data: profile } = await window.supabaseClient
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();
  el.textContent = profile?.username ? `Traveler: ${profile.username}` : 'Traveler';
};

// Escape untrusted values before interpolating into innerHTML (prevents XSS)
window.escapeHtml = function (value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
};

// Only allow http(s) URLs in href; otherwise render an inert link (blocks javascript: etc.)
window.safeUrl = function (value) {
  const url = String(value ?? '');
  return /^https?:\/\//i.test(url) ? url : '#';
};

// Normalize a Google Drive share link (or bare file id) to its preview embed URL.
// Accepted forms:
//   https://drive.google.com/file/d/<ID>/view?usp=sharing
//   https://drive.google.com/file/d/<ID>/preview
//   https://drive.google.com/open?id=<ID>
//   https://drive.google.com/uc?export=download&id=<ID>
//   <bare ID>
// Returns null when no usable Drive id can be extracted.
window.toDriveEmbed = function (value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;

  let id = null;
  const fileMatch = raw.match(/drive\.google\.com\/file\/d\/([^\/?#]+)/);
  const idParamMatch = raw.match(/[?&]id=([^&]+)/);

  if (fileMatch) {
    id = fileMatch[1];
  } else if (idParamMatch) {
    id = idParamMatch[1];
  } else if (/^[A-Za-z0-9_-]{10,}$/.test(raw)) {
    id = raw;
  }

  if (!id) return null;
  return `https://drive.google.com/file/d/${id}/preview`;
};

// Parse a deployment label like "AUGUST 2026" into a comparable numeric value
window.parseMonthYear = function (label) {
  const match = String(label || '').trim().toUpperCase().match(/^([A-Z]+)\s*(\d{4})$/);
  if (!match) return 0;
  const months = {
    JANUARY: 1, FEBRUARY: 2, MARCH: 3, APRIL: 4, MAY: 5, JUNE: 6,
    JULY: 7, AUGUST: 8, SEPTEMBER: 9, OCTOBER: 10, NOVEMBER: 11, DECEMBER: 12
  };
  return months[match[1]] ? Number(match[2]) * 12 + months[match[1]] : 0;
};

// Segmented pixel-bar helper (10 cells)
window.buildSegments = function (pct) {
  const SEGMENTS = 10;
  const filled = Math.round(Math.min(100, Math.max(0, pct)) / 100 * SEGMENTS);
  let html = '';
  for (let i = 0; i < SEGMENTS; i++) {
    html += `<div class="seg${i < filled ? ' on' : ''}"></div>`;
  }
  return html;
};

// Compact relative timestamp ("3h ago") falling back to a short date.
window.formatDate = function (value) {
  if (!value) return 'Unknown';
  const d = new Date(value);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 7 * 86400000) return `${Math.floor(diff / 86400000)}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};
