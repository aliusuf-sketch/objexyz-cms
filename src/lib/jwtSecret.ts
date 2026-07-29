// Single source of truth for the session-signing secret, used by both
// src/lib/auth.ts (sign/verify) and src/middleware.ts (verify on every
// request). Deliberately has NO hardcoded fallback: this repo is public on
// GitHub, so a fallback secret baked into source would let anyone forge a
// valid session cookie the moment JWT_SECRET is ever unset in the
// environment. Fail closed at request time instead of failing open.
//
// Lazy on purpose: Next.js imports API route modules (to collect page data)
// during `next build` without invoking their handlers, and local/dev
// environments may not have JWT_SECRET set. Throwing at module load time
// would break builds; throwing only when a token is actually signed or
// verified keeps builds working while still failing closed at runtime.
let cached: Uint8Array | null = null;

export function getJwtSecret(): Uint8Array {
  if (cached) return cached;
  const value = process.env.JWT_SECRET;
  if (!value || value.length < 32) {
    throw new Error(
      'JWT_SECRET environment variable is missing or shorter than 32 characters. ' +
      'Set it in Vercel (or .env.local) to a random 32+ character string. ' +
      'Refusing to sign or verify sessions with an insecure default — see src/lib/jwtSecret.ts.'
    );
  }
  cached = new TextEncoder().encode(value);
  return cached;
}
