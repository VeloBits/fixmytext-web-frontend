/**
 * Server-only session-cookie helpers.
 *
 * Uses Node.js `node:crypto` - do NOT import this file in browser bundles.
 * Import path: `@velobits/auth-shared/server`.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { parseSession } from './claims';
import type { SessionClaims } from './claims';

/**
 * Verify the HMAC-SHA256 signature of a session cookie and return its claims.
 *
 * Cookie wire format (matches account-svc `session_cookie.py`):
 *   `<base64url(json_payload)>.<hex(hmac_sha256(payload_b64, secret_utf8))>`
 *
 * `secret` must be the value of `SESSION_COOKIE_SECRET` from account-svc.
 *
 * Returns decoded SessionClaims on success; null on wrong signature,
 * malformed token, missing secret, or expired payload.
 */
export function verifySession(raw: string, secret: string): SessionClaims | null {
  if (!raw || !secret) return null;

  const dot = raw.indexOf('.');
  if (dot < 0) return null;

  const payloadB64 = raw.slice(0, dot);
  const sig = raw.slice(dot + 1);

  const expectedSig = createHmac('sha256', Buffer.from(secret, 'utf8'))
    .update(payloadB64, 'ascii')
    .digest('hex');

  // Constant-time comparison - prevents timing side-channels on the signature.
  try {
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
  } catch {
    return null;
  }

  // Signature is valid - now validate shape and expiry via the shared parser.
  return parseSession(raw);
}
