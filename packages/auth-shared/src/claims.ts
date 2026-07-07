/** Shape of the session cookie payload issued by account-svc. */
export interface SessionClaims {
  sub: string;
  email: string;
  email_verified: boolean;
  roles: string[];
  exp: number;
  iat: number;
}

/**
 * Parse and validate the session cookie value.
 * The cookie is a base64url-encoded JSON payload followed by a dot-separated
 * HMAC-SHA256 signature: `<base64payload>.<hex-signature>`.
 *
 * NOTE: This function only decodes and validates shape + expiry.
 * Full HMAC signature verification is performed server-side by account-svc.
 */
export function parseSession(raw: string): SessionClaims | null {
  try {
    const [payloadB64] = raw.split('.');
    if (!payloadB64) return null;
    const json = atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Partial<SessionClaims>;

    if (
      typeof claims.sub !== 'string' ||
      typeof claims.email !== 'string' ||
      typeof claims.exp !== 'number'
    ) {
      return null;
    }

    if (claims.exp * 1000 < Date.now()) return null;

    return {
      sub: claims.sub,
      email: claims.email,
      email_verified: claims.email_verified ?? false,
      roles: claims.roles ?? [],
      exp: claims.exp,
      iat: claims.iat ?? 0,
    };
  } catch {
    return null;
  }
}
