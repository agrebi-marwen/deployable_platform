// api/_lib/rateLimit.js - Shared fail-closed rate limiter for serverless auth.
// Vercel ignores files in directories prefixed with "_", so this is not a route.
//
// Persistence: when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set,
// limits are stored in Upstash Redis (plain REST, no SDK) and survive cold starts
// and multiple instances. Otherwise it falls back to an in-process sliding-window
// store (documented limitation: resets on cold start / per instance).

const inMemory = new Map(); // key -> [timestamps]

const DEFAULT_ATTEMPTS = 5;
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req) {
  // Vercel sets x-vercel-forwarded-for itself; prefer it over the client-spoofable
  // x-forwarded-for header.
  return (
    req.headers['x-vercel-forwarded-for'] ||
    req.headers['x-real-ip'] ||
    (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown'
  );
}

function clientKey(req, email) {
  return `rl:${getClientIp(req)}|${String(email || '').toLowerCase().trim()}`;
}

async function upstashRun(cmd, args) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const res = await fetch(`${url}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data && data.error === null ? data.result : null;
}

async function checkUpstash(req, email, attempts, windowMs) {
  const key = clientKey(req, email);
  const seconds = Math.ceil(windowMs / 1000);

  // Fixed-window counter: INCR the key, set its TTL only on first hit.
  const count = await upstashRun('incr', [key]);
  if (count === null) return null; // not configured / unreachable -> use in-memory
  await upstashRun('expire', [key, seconds, 'nx']);

  if (count > attempts) {
    return { allowed: false, retryAfter: seconds };
  }
  return { allowed: true, retryAfter: 0 };
}

function checkInMemory(req, email, attempts, windowMs) {
  const key = clientKey(req, email);
  const now = Date.now();

  let timestamps = inMemory.get(key) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);

  if (timestamps.length >= attempts) {
    const retryAfter = Math.ceil((windowMs - (now - timestamps[0])) / 1000);
    inMemory.set(key, timestamps);
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
  }

  timestamps.push(now);
  inMemory.set(key, timestamps);
  return { allowed: true, retryAfter: 0 };
}

// Records one attempt and returns whether it is permitted.
// `attempts` counts auth attempts per IP+email within `windowMs`.
export async function checkRateLimit(req, { email, attempts = DEFAULT_ATTEMPTS, windowMs = DEFAULT_WINDOW_MS }) {
  const upstash = await checkUpstash(req, email, attempts, windowMs);
  return upstash !== null ? upstash : checkInMemory(req, email, attempts, windowMs);
}