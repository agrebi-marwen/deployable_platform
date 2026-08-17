// api/authSignup.js - Serverless account creation.
// Rate limits (fail-closed), then creates the account via Supabase on the server.

import { checkRateLimit } from './_lib/rateLimit.js';
import { signUp } from './_lib/supabase.js';
import { applyCommonHeaders, handlePreflight, readBody } from './_lib/http.js';

export default async function handler(req, res) {
  applyCommonHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();
  const password = typeof body.password === 'string' ? body.password : '';
  const username = typeof body.username === 'string' ? body.username.trim().slice(0, 40) : '';

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  // Fail-closed rate limit gate.
  const limit = await checkRateLimit(req, { email });
  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({ error: 'Too many attempts. Please try again later.', retryAfter: limit.retryAfter });
  }

  const { user, session, error } = await signUp({ email, password, username });
  if (error) {
    return res.status(400).json({ error });
  }

  return res.status(200).json({ user: user || null, session: session || null });
}