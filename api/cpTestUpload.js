// api/cpTestUpload.js - Serverless upload of the gzipped CP test archive.
//
// The admin panel sends the already-gzipped archive here instead of calling
// supabase.storage.from('cp-tests').upload() directly. The write is performed
// with the service role key, which bypasses storage.objects RLS entirely.
//
// Why: Storage can evaluate an authenticated request under the wrong role and
// reject the INSERT with
//   new row violates row-level security policy for table "objects" (42501)
// even when the browser session is valid and the storage policy is correct.
// The "run internally by Supabase Storage API as role supabase_storage_admin"
// line is a red herring - Storage still runs the INSERT under the request's
// effective role (anon), so a policy scoped `to authenticated` never matches.
// This is a known platform behaviour for projects on the JWT Signing Keys
// system (supabase/supabase#46262): PostgREST honors the token, Storage does
// not. Uploading with the service role key sidesteps the issue.
//
// Request  : POST /api/cpTestUpload
//            Authorization: Bearer <session token>
//            { challengeId, gzipBase64 }
// Response : { ok: true, path } or { ok: false, error }
//
// Requires env (Vercel): SUPABASE_SERVICE_ROLE_KEY so the private test file can
// be written without RLS. Falls back to the anon key like the other routes.

import { applyCommonHeaders, handlePreflight, readBody } from './_lib/http.js';
import { getUser, getProfileRole, supabaseUrl, supabaseKey } from './_lib/supabase.js';

const MAX_GZ_BYTES = 4 * 1024 * 1024; // keep in sync with the cpSubmit.js cap (4 MB gz)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function handler(req, res) {
  applyCommonHeaders(req, res);
  if (handlePreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // 1. Validate the session token.
  const auth = String(req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const user = await getUser(token);
  if (!user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  // 2. Re-verify the admin role against the database (server-enforced gate).
  const role = await getProfileRole(user.id, token);
  if (role !== 'admin') {
    res.status(403).json({ error: 'Not authorized' });
    return;
  }

  // 3. Validate the payload.
  const body = await readBody(req);
  const challengeId = typeof body.challengeId === 'string' ? body.challengeId.trim() : '';
  const gzipBase64 = typeof body.gzipBase64 === 'string' ? body.gzipBase64 : '';

  if (!UUID_RE.test(challengeId)) {
    res.status(400).json({ error: 'A valid challengeId is required' });
    return;
  }
  if (!gzipBase64) {
    res.status(400).json({ error: 'gzipBase64 is required' });
    return;
  }

  const gz = Buffer.from(gzipBase64, 'base64');
  if (gz.length === 0) {
    res.status(400).json({ error: 'Test archive is empty' });
    return;
  }
  if (gz.length > MAX_GZ_BYTES) {
    res.status(400).json({ error: `Test archive exceeds the ${MAX_GZ_BYTES} byte cap` });
    return;
  }

  // 4. Upload with the service role key (bypasses storage.objects RLS).
  const path = `${challengeId}/tests.json.gz`;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const url = `${supabaseUrl()}/storage/v1/object/cp-tests/${encodedPath}?upsert=true`;
  const key = supabaseKey();

  try {
    const up = await fetch(url, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/gzip'
      },
      body: gz
    });

    if (!up.ok) {
      const text = await up.text();
      console.error('cpTestUpload storage error:', up.status, text);
      let detail = `Storage upload failed (${up.status})`;
      try {
        const parsed = JSON.parse(text);
        if (parsed && parsed.message) detail = parsed.message;
      } catch { /* keep the default detail */ }
      res.status(500).json({ error: detail });
      return;
    }

    res.status(200).json({ ok: true, path });
  } catch (err) {
    console.error('cpTestUpload error:', err.message);
    res.status(500).json({ error: err.message || 'Upload failed' });
  }
}
