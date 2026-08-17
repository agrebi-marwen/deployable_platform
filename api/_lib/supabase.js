// api/_lib/supabase.js - Shared Supabase REST helpers for serverless functions.
// Vercel ignores files in directories prefixed with "_", so this is not a route.
// Uses plain fetch against Supabase's REST/Auth endpoints — no SDK dependency.
// The service role key (when configured) is preferred; otherwise the anon key is
// used. Keys are read from environment variables and never returned to clients.

export function supabaseUrl() {
  return process.env.SUPABASE_URL;
}

export function supabaseKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
}

async function request(path, { method = 'GET', body, token } = {}) {
  const headers = {
    apikey: supabaseKey(),
    'Content-Type': 'application/json'
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  else headers.Authorization = `Bearer ${supabaseKey()}`;

  const res = await fetch(`${supabaseUrl()}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

// Sign in with email + password. Returns { session } or { error }.
export async function signInWithPassword(email, password) {
  const { ok, data } = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password }
  });

  if (!ok) {
    return { error: (data && (data.msg || data.error_description || data.error)) || 'Invalid login credentials' };
  }
  return { session: data };
}

// Create an account. Returns { user, session } or { error }.
export async function signUp({ email, password, username }) {
  const { ok, data } = await request('/auth/v1/signup', {
    method: 'POST',
    body: {
      email,
      password,
      data: username ? { username } : undefined
    }
  });

  if (!ok) {
    return { error: (data && (data.msg || data.error_description || data.error)) || 'Signup failed' };
  }
  return { user: data.user, session: data.session };
}

// Validate a session token and return the user (or null).
export async function getUser(accessToken) {
  if (!accessToken) return null;
  const { ok, data } = await request('/auth/v1/user', { token: accessToken });
  return ok && data ? data : null;
}

// Read the caller's own profile role (acts as the authenticated user).
export async function getProfileRole(userId, accessToken) {
  const { ok, data } = await request(`/rest/v1/profiles?select=role&id=eq.${encodeURIComponent(userId)}`, {
    token: accessToken
  });
  if (!ok || !Array.isArray(data) || data.length === 0) return null;
  return data[0].role || null;
}