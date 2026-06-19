import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
  type UserManagerSettings,
  type User,
} from 'oidc-client-ts';
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM, KEYCLOAK_URL } from './keycloakConfig';

const REALM_BASE = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;

const baseSettings: UserManagerSettings = {
  authority: REALM_BASE,
  client_id: KEYCLOAK_CLIENT_ID,
  redirect_uri: `${window.location.origin}/app/auth/callback`,
  silent_redirect_uri: `${window.location.origin}/app/auth/silent-callback`,
  post_logout_redirect_uri: `${window.location.origin}/app/login`,
  response_type: 'code',
  scope: 'openid email profile',
  automaticSilentRenew: true,
  // H-8: tokens (incl. the refresh_token) live ONLY in memory — never in
  // session/local storage, so an XSS can't read a long-lived refresh token.
  // On a reload the user is re-hydrated from Keycloak's SSO cookie via silent
  // renew (see loadUser). The PKCE state store is left at its default
  // (localStorage) because it must survive the full-page redirect to Keycloak.
  userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
};

export const userManager = new UserManager(baseSettings);

// Dedicated manager that starts the flow on Keycloak's REGISTRATION form.
//
// The OIDC `prompt=create` param is NOT honored by our Keycloak build (it
// silently falls back to the login page — verified live), so we instead point
// the authorization step at Keycloak's dedicated `/registrations` endpoint,
// which takes the exact same params as `/auth` but renders the sign-up form.
// We supply explicit `metadata` (skipping discovery) so only the authorization
// endpoint differs; the PKCE state is written to the same default localStorage
// stateStore, so the callback is still completed by the main `userManager`.
export const signupUserManager = new UserManager({
  ...baseSettings,
  metadata: {
    issuer: REALM_BASE,
    authorization_endpoint: `${REALM_BASE}/protocol/openid-connect/registrations`,
    token_endpoint: `${REALM_BASE}/protocol/openid-connect/token`,
    userinfo_endpoint: `${REALM_BASE}/protocol/openid-connect/userinfo`,
    end_session_endpoint: `${REALM_BASE}/protocol/openid-connect/logout`,
    jwks_uri: `${REALM_BASE}/protocol/openid-connect/certs`,
  },
});

// One-time auth bootstrap, deduped across all hook instances. Reads the
// in-memory user; if it's absent (e.g. after a hard reload) it attempts a
// silent renew using the Keycloak SSO cookie, so the session is restored
// without ever persisting the refresh token. Returns null when there is no
// live session.
let _loadUserPromise: Promise<User | null> | null = null;

export function loadUser(): Promise<User | null> {
  // Never run on the redirect / silent-renew callback routes — those pages are
  // driven by signinRedirectCallback / signinSilentCallback, and a concurrent
  // signinSilent here would race them.
  const path = window.location.pathname;
  if (path.includes('/auth/callback') || path.includes('/auth/silent-callback')) {
    return Promise.resolve(null);
  }
  if (!_loadUserPromise) {
    _loadUserPromise = (async () => {
      const existing = await userManager.getUser();
      if (existing && !existing.expired) return existing;
      try {
        return await userManager.signinSilent();
      } catch {
        return null; // no live SSO session — caller treats as logged out
      }
    })();
  }
  return _loadUserPromise;
}

// Drop the cached bootstrap (call on explicit sign-out) so the next loadUser()
// re-evaluates instead of returning a stale result.
export function resetLoadUser(): void {
  _loadUserPromise = null;
}

// ── Cross-tab auth sync ────────────────────────────────────────────────────
// BroadcastChannel lets tabs notify each other of login/logout without polling.
// The listener lives at module scope so signinSilent/removeUser is called exactly
// once per event regardless of how many useOidcAuth hook instances are mounted.

export type AuthMessage =
  | { type: 'user_loaded' }
  | { type: 'user_signed_out' };

const AUTH_CHANNEL = 'fixmytext_auth';

// Fire-and-forget broadcast to every other same-origin tab.
export function broadcastAuthMessage(msg: AuthMessage): void {
  if (typeof BroadcastChannel === 'undefined') return;
  const ch = new BroadcastChannel(AUTH_CHANNEL);
  ch.postMessage(msg);
  ch.close();
}

if (typeof BroadcastChannel !== 'undefined') {
  const ch = new BroadcastChannel(AUTH_CHANNEL);
  ch.onmessage = async ({ data }: MessageEvent<AuthMessage>) => {
    if (data?.type === 'user_loaded') {
      // Another tab completed login — silently acquire tokens here so this tab
      // picks up the SSO session without a page refresh.
      resetLoadUser();
      try { await userManager.signinSilent(); } catch { /* SSO cookie absent */ }
    } else if (data?.type === 'user_signed_out') {
      // Another tab logged out — drop the in-memory user immediately.
      resetLoadUser();
      await userManager.removeUser();
    }
  };
}
