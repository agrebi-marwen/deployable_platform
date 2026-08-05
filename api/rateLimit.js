// api/rateLimit.js - Vercel serverless function for rate limiting authentication attempts
import crypto from 'crypto';

// Simple in-memory rate limit store (resets on deployment)
// For production, use Redis or a database
const rateLimitStore = {};

const RATE_LIMIT_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0] || 
         req.headers['x-real-ip'] || 
         req.socket.remoteAddress || 
         'unknown';
}

function getClientHash(ip, email) {
  return crypto.createHash('sha256').update(`${ip}-${email}`).digest('hex');
}

export default function handler(req, res) {
  // CORS: Restrict to your domain
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ].filter(Boolean);
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required' });
  }

  const clientIp = getClientIp(req);
  const clientHash = getClientHash(clientIp, email);
  const now = Date.now();

  // Clean up old entries
  if (!rateLimitStore[clientHash]) {
    rateLimitStore[clientHash] = [];
  }

  rateLimitStore[clientHash] = rateLimitStore[clientHash].filter(
    timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
  );

  // Check if rate limit exceeded
  if (rateLimitStore[clientHash].length >= RATE_LIMIT_ATTEMPTS) {
    return res.status(429).json({ 
      error: 'Too many attempts. Please try again later.',
      retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - rateLimitStore[clientHash][0])) / 1000)
    });
  }

  // Record this attempt
  rateLimitStore[clientHash].push(now);

  res.status(200).json({ 
    allowed: true, 
    attemptsRemaining: RATE_LIMIT_ATTEMPTS - rateLimitStore[clientHash].length 
  });
}
