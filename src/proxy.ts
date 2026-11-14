import { NextRequest, NextResponse } from 'next/server';

// Per-IP rate limiting for the API routes (Next.js 16 "proxy", formerly middleware).
// The store lives in this server instance's memory, so on a multi-instance deployment
// each instance counts on its own; move it to Redis/Upstash if that ever matters.

type RateLimitEntry = { count: number; resetTime: number };
type Limit = { windowMs: number; maxRequests: number };

const rateLimitStore = new Map<string, RateLimitEntry>();
// Hard cap so a flood of spoofed addresses can't grow the map without bound
const MAX_TRACKED_KEYS = 10_000;

const MINUTE = 60 * 1000;
const RATE_LIMIT_CONFIG: Record<string, Limit> = {
  '/api/sms': { windowMs: MINUTE, maxRequests: 5 },          // costs money per message
  '/api/email': { windowMs: MINUTE, maxRequests: 10 },
  '/api/translate': { windowMs: MINUTE, maxRequests: 30 },   // admin only
  '/api/translate-ui': { windowMs: MINUTE, maxRequests: 10 }, // public, cached after the first call
  '/api/appointments': { windowMs: MINUTE, maxRequests: 20 },
  '/api/gdpr/delete': { windowMs: 10 * MINUTE, maxRequests: 3 },
  '/api/gdpr/export': { windowMs: 10 * MINUTE, maxRequests: 5 },
  default: { windowMs: MINUTE, maxRequests: 60 },
};

// Paths that are never limited (uptime checks, Vercel Cron)
const UNLIMITED = new Set(['/api/health', '/api/cron/cleanup']);

function getClientIp(request: NextRequest): string {
  // On Vercel the platform sets x-forwarded-for; the first entry is the real client
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';
}

function limitFor(path: string): Limit {
  if (RATE_LIMIT_CONFIG[path]) return RATE_LIMIT_CONFIG[path];
  if (path.startsWith('/api/appointments/')) return RATE_LIMIT_CONFIG['/api/appointments'];
  return RATE_LIMIT_CONFIG.default;
}

// Every /api/appointments/<id> shares one bucket, so changing the id doesn't reset the count
const bucketFor = (path: string) => (path.startsWith('/api/appointments/') ? '/api/appointments/:id' : path);

function sweepExpired(now: number) {
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetTime) rateLimitStore.delete(key);
  }
}

function checkRateLimit(key: string, config: Limit, now = Date.now()) {
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetTime) {
    if (rateLimitStore.size >= MAX_TRACKED_KEYS) sweepExpired(now);
    if (rateLimitStore.size >= MAX_TRACKED_KEYS) rateLimitStore.clear();
    rateLimitStore.set(key, { count: 1, resetTime: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime };
}

export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  if (UNLIMITED.has(path)) return NextResponse.next();

  const config = limitFor(path);
  const { allowed, remaining, resetTime } = checkRateLimit(`${bucketFor(path)}:${getClientIp(request)}`, config);

  const response = allowed
    ? NextResponse.next()
    : NextResponse.json(
        { error: 'Too Many Requests', message: 'Rate limit exceeded. Please try again later.' },
        { status: 429 },
      );

  response.headers.set('X-RateLimit-Limit', String(config.maxRequests));
  response.headers.set('X-RateLimit-Remaining', String(remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.ceil(resetTime / 1000)));
  if (!allowed) response.headers.set('Retry-After', String(Math.max(1, Math.ceil((resetTime - Date.now()) / 1000))));

  return response;
}

export const config = {
  matcher: '/api/:path*',
};
