import { User } from 'oidc-client-ts';
import type { UserProfile } from 'oidc-client-ts';
import { userManager } from './userManager';

const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://localhost:8080';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? 'fixmytext';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'fixmytext-frontend';

const TOKEN_URL = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

/** Authenticate with email + password (Direct Grant / Resource Owner Password Credentials).
 *  Keycloak returns tokens; we hand them to oidc-client-ts via storeUser()
 *  so useOidcAuth and baseQuery pick them up automatically.
 */
export async function passwordGrant(email: string, password: string): Promise<User> {
  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: KEYCLOAK_CLIENT_ID,
    username: email,
    password,
    scope: 'openid email profile',
  });

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    const msg = err['error_description'] ?? err['error'] ?? 'Invalid credentials';
    throw new Error(msg);
  }

  const tokens = await res.json() as {
    access_token: string;
    id_token?: string;
    refresh_token?: string;
    expires_in?: number;
    scope?: string;
    session_state?: string;
    token_type?: string;
  };

  const now = Math.floor(Date.now() / 1000);
  const rawProfile = parseJwtPayload(tokens.id_token ?? tokens.access_token);

  // Ensure the profile has the mandatory fields required by UserProfile (IdTokenClaims)
  const profile: UserProfile = {
    sub: String(rawProfile['sub'] ?? ''),
    iss: String(rawProfile['iss'] ?? ''),
    aud: (rawProfile['aud'] as string | string[]) ?? '',
    exp: Number(rawProfile['exp'] ?? now + 300),
    iat: Number(rawProfile['iat'] ?? now),
    ...rawProfile,
  };

  const oidcUser = new User({
    access_token: tokens.access_token,
    token_type: 'Bearer',
    id_token: tokens.id_token,
    refresh_token: tokens.refresh_token,
    expires_at: now + (tokens.expires_in ?? 300),
    scope: tokens.scope ?? 'openid email profile',
    session_state: tokens.session_state ?? null,
    profile,
  });

  await userManager.storeUser(oidcUser);
  return oidcUser;
}

/** Trigger Keycloak's "reset password" flow as a magic-link substitute.
 *  Keycloak sends an email with a link that authenticates + prompts password set.
 */
export async function sendMagicLink(email: string): Promise<void> {
  // We redirect to Keycloak's /login-actions/reset-credentials with the email pre-filled
  // This initiates the standard password-reset email via the browser redirect
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    login_hint: email,
  });
  // Redirect — the user is taken to Keycloak's "check your email" page
  window.location.href = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/login-actions/reset-credentials?${params.toString()}`;
}

/** Register a new account via the monolith's /auth/register endpoint. */
export async function registerUser(
  email: string,
  password: string,
  display_name: string
): Promise<void> {
  const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
  const res = await fetch(`${apiUrl}/api/v1/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, display_name }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as Record<string, string>;
    throw new Error(err['detail'] ?? 'Registration failed');
  }
}

function parseJwtPayload(token: string): Record<string, unknown> {
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/') ?? '';
    return JSON.parse(atob(base64)) as Record<string, unknown>;
  } catch {
    return {};
  }
}
