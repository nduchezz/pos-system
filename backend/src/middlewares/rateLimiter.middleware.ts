import rateLimit from 'express-rate-limit';

// Skip rate limiting when running tests
const isTest = process.env.NODE_ENV === 'test';

// ─── Login limiter ──────────────────────────────────────────────────
// Prevents brute-force password guessing
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isTest ? 10000 : 10, // 10 attempts per IP per 15 min (in production)
  message: {
    success: false,
    message: 'Too many login attempts. Please try again in 15 minutes.',
    errors: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // only count failures
});

// ─── Register limiter ───────────────────────────────────────────────
// Prevents spam business registration
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isTest ? 10000 : 5,
  message: {
    success: false,
    message: 'Too many registration attempts. Please try again later.',
    errors: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── General API limiter ────────────────────────────────────────────
// Broad protection — 300 requests per minute per IP
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 300,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
    errors: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── Sale creation limiter ──────────────────────────────────────────
// Prevents accidental double-submits and abuse
export const saleLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 100000 : 60,
  message: {
    success: false,
    message: 'Too many sales in a short time. Please wait a moment.',
    errors: null,
  },
  standardHeaders: true,
  legacyHeaders: false,
});
