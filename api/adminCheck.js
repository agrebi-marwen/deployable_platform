// api/adminCheck.js - Server-side admin terminal authorization.
// Verifies the caller's session, re-checks the DB role server-side, and compares
// the submitted terminal password to process.env.ADMIN_PASSWORD inside this
// function. The password is never exposed to the client.

import { getUser, getProfileRole } from './_lib/supabase.js';
import { applyCommonHeaders, handlePreflight, readBody } from './_lib/http.js';

export default async function handler(req, res) {
  applyCommonHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const body = await readBody(req);
  const password = typeof body.password === 'string' ? body.password : '';

  if (!accessToken || !password) {
    return res.status(400).json({ error: 'Missing credentials' });
  }

  // 1. Validate the session token.
  const user = await getUser(accessToken);
  if (!user || !user.id) {
    return res.status(401).json({ error: 'Session invalid or expired' });
  }

  // 2. Re-verify the admin role against the database (server-enforced gate).
  const role = await getProfileRole(user.id, accessToken);
  if (role !== 'admin') {
    return res.status(403).json({ error: 'Not authorized' });
  }

  // 3. Compare the submitted password server-side only.
  const secret = process.env.ADMIN_PASSWORD;
  const authorized = typeof secret === 'string' && secret.length > 0 && password === secret;

  return res.status(200).json({ authorized });
}