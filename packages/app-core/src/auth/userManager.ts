import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
  type User,
} from 'oidc-client-ts';

// Defaults to the Velobits-Dev realm at auth-dev.velobits.dev (resolved via /etc/hosts in local dev).
// Production overrides via VITE_KEYCLOAK_URL = https://auth.velobits.dev,
// VITE_KEYCLOAK_REALM = Velobits-Prod, VITE_KEYCLOAK_CLIENT_ID = fixmytext.
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://auth-dev.velobits.dev';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? 'Velobits-Dev';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'develop-fixmytext';

export const userManager = new UserManager({
  authority: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
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
