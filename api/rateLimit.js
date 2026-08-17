// api/rateLimit.js - Vercel serverless function for rate limiting authentication attempts.
// Now a thin wrapper over the shared fail-closed limiter (api/_lib/rateLimit.js).
// Note: auth is enforced server-side via api/authLogin.js and api/authSignup.js;
// this endpoint is kept for compatibility and always fail-closed on limit.

import { checkRateLimit } from './_lib/rateLimit.js';
import { applyCommonHeaders, handlePreflight, readBody } from './_lib/http.js';

export default async function handler(req, res) {
  applyCommonHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = await readBody(req);
  const email = String(body.email || '').trim().toLowerCase();

  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const limit = await checkRateLimit(req, { email });

  if (!limit.allowed) {
    res.setHeader('Retry-After', String(limit.retryAfter));
    return res.status(429).json({
      error: 'Too many attempts. Please try again later.',
      retryAfter: limit.retryAfter
    });
  }

  res.status(200).json({
    allowed: true,
    attemptsRemaining: 0
  });
}