import { describe, it, expect } from 'vitest';
import { parseSession } from '../src/claims';
import { SESSION_COOKIE_NAME, SSO_COOKIE_NAME, SESSION_CLEAR_PATH } from '../src/constants';

function makePayload(overrides: Record<string, unknown> = {}): string {
  const payload = {
    sub: 'user-123',
    email: 'test@example.com',
    email_verified: true,
    roles: ['user'],
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };
  const b64 = btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64}.fake-hmac-sig`;
}

describe('parseSession', () => {
  it('parses a valid session cookie', () => {
    const raw = makePayload();
    const claims = parseSession(raw);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe('user-123');
    expect(claims?.email).toBe('test@example.com');
    expect(claims?.email_verified).toBe(true);
    expect(claims?.roles).toEqual(['user']);
  });

  it('returns null for an expired session', () => {
    const raw = makePayload({ exp: Math.floor(Date.now() / 1000) - 1 });
    expect(parseSession(raw)).toBeNull();
  });

  it('returns null for missing required fields', () => {
    const raw = makePayload({ sub: undefined });
    expect(parseSession(raw)).toBeNull();
  });

  it('defaults email_verified to false when absent', () => {
    const raw = makePayload({ email_verified: undefined });
    const claims = parseSession(raw);
    expect(claims?.email_verified).toBe(false);
  });

  it('defaults roles to empty array when absent', () => {
    const raw = makePayload({ roles: undefined });
    const claims = parseSession(raw);
    expect(claims?.roles).toEqual([]);
  });

  it('returns null for an invalid cookie string', () => {
    expect(parseSession('not-valid')).toBeNull();
    expect(parseSession('')).toBeNull();
    expect(parseSession('!!!.!!!')).toBeNull();
  });
});

describe('constants', () => {
  it('SESSION_COOKIE_NAME uses per-app naming', () => {
    expect(SESSION_COOKIE_NAME).toBe('fixmytext_session');
  });

  it('SSO_COOKIE_NAME documents the global SSO cookie at .velobits.dev', () => {
    expect(SSO_COOKIE_NAME).toBe('VELOBITS_SSO');
  });

  it('SESSION_CLEAR_PATH points at the logout endpoint', () => {
    expect(SESSION_CLEAR_PATH).toBe('/api/v1/auth/session/clear');
  });
});
