import {
  InMemoryWebStorage,
  UserManager,
  WebStorageStateStore,
  type UserManagerSettings,
  type User,
} from 'oidc-client-ts';
import { clearSession } from '@velobits/api-client';
import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM, KEYCLOAK_URL } from './keycloakConfig';

const REALM_BASE = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`;

const baseSettings: UserManagerSettings = {
  authority: REALM_BASE,
  client_id: KEYCLOAK_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  // Static relay page (apps/shell/public/auth/silent-callback.html), NOT the
  // SPA route: the hidden silent-renew iframe only needs to postMessage the
  // response URL back to the parent. Booting the full SPA in the iframe took
  // long enough in throttled background tabs to blow the silent-request
  // timeout, so cross-tab login pickup silently failed there.
  silent_redirect_uri: `${window.location.origin}/auth/silent-callback.html`,
  post_logout_redirect_uri: `${window.location.origin}/login`,
  response_type: 'code',
  scope: 'openid email profile',
  automaticSilentRenew: true,
  // Default is 10s; give throttled background tabs extra slack — a slow
  // success beats a swallowed timeout (the foreground reconciler is the
  // backstop, not the primary path).
  silentRequestTimeoutInSeconds: 30,
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

// ── Persisted session hint ──────────────────────────────────────────────────
// H-8 keeps tokens in memory only, so every hard reload starts logged-out and
// needs a silent-renew round trip before isAuthenticated flips true. This
// boolean ("a session existed in this browser") carries no token material, so
// persisting it doesn't weaken H-8 — it lets the UI hold a loading state
// during the restore instead of flashing logged-out chrome that corrects
// itself a second later.
const AUTH_HINT_KEY = 'fmx_auth_hint';

export function hasAuthHint(): boolean {
  try {
    return localStorage.getItem(AUTH_HINT_KEY) === '1';
  } catch {
    return false; // storage unavailable — behave as before the hint existed
  }
}

function setAuthHint(present: boolean): void {
  try {
    if (present) localStorage.setItem(AUTH_HINT_KEY, '1');
    else localStorage.removeItem(AUTH_HINT_KEY);
  } catch {
    // storage unavailable — the hint is best-effort
  }
}

// Covers every way a session starts (redirect callback, silent renew, token
// refresh, cross-tab pickup) and ends (signoutRedirect's removeUser, cross-tab
// signout, Keycloak-side session end).
userManager.events.addUserLoaded(() => setAuthHint(true));
userManager.events.addUserUnloaded(() => setAuthHint(false));
userManager.events.addUserSignedOut(() => setAuthHint(false));

// PKCE staging entries (`oidc.<state>` in localStorage) are abandoned whenever
// a redirect doesn't complete (Back from the Keycloak form, bounced logins);
// prune the stale ones on boot so they don't accumulate forever.
void userManager.clearStaleState();

// The fixmytext_session cookie outlives the Keycloak SSO session (7-day TTL
// vs 2h SSO idle / browser-session identity cookie). When the app concludes
// "logged out" because the SSO session is gone, the cookie must be revoked
// too — otherwise the browser silently keeps a live API credential while the
// UI shows Sign In. Best-effort: clearSession never throws.
function clearServerSession(): void {
  void clearSession();
}

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
      // Only a previously-signed-in browser holds a session cookie worth
      // revoking — a plain guest failing signinSilent has nothing to clear.
      const hadHint = hasAuthHint();
      try {
        // Success also fires userLoaded (→ hint set); the explicit set covers
        // signinSilent resolving null without throwing.
        const restored = await userManager.signinSilent();
        setAuthHint(!!restored);
        if (!restored && hadHint) clearServerSession();
        return restored;
      } catch {
        setAuthHint(false); // stale hint — the SSO session is gone
        if (hadHint) clearServerSession(); // …and so must the session cookie
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

export type AuthMessage = { type: 'user_loaded' } | { type: 'user_signed_out' };

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
      try {
        await userManager.signinSilent();
      } catch {
        /* SSO cookie absent, or this tab is backgrounded and the browser
           throttled the silent iframe past its timeout — the foreground
           reconciler below retries when the tab is next looked at. */
      }
    } else if (data?.type === 'user_signed_out') {
      // Another tab logged out — drop the in-memory user immediately.
      resetLoadUser();
      await userManager.removeUser();
    }
  };
}

// ── Foreground reconciliation ───────────────────────────────────────────────
// The broadcast pickup above is best-effort: signinSilent() runs in a hidden
// iframe, and in a backgrounded tab the browser can throttle/freeze that flow
// past its timeout — the failure is swallowed and the tab silently keeps the
// wrong identity until a manual reload. The auth hint is shared localStorage
// ("a session exists in this browser"), so whenever a tab returns to the
// foreground, reconcile the in-memory user against it: acquire the session
// this tab missed, or drop one it should no longer have. No-op (one getUser
// on the in-memory store) when tab and hint already agree.
let _reconcilePromise: Promise<void> | null = null;

function reconcileSessionWithHint(): Promise<void> {
  if (_reconcilePromise) return _reconcilePromise;
  // Callback routes are driven by signinRedirectCallback/signinSilentCallback;
  // a concurrent signinSilent here would race them (same guard as loadUser).
  const path = window.location.pathname;
  if (path.includes('/auth/callback') || path.includes('/auth/silent-callback')) {
    return Promise.resolve();
  }
  _reconcilePromise = doReconcileSessionWithHint().finally(() => {
    _reconcilePromise = null;
  });
  return _reconcilePromise;
}

async function doReconcileSessionWithHint(): Promise<void> {
  try {
    const user = await userManager.getUser();
    let hint = false;
    let hintReadable = true;
    try {
      hint = localStorage.getItem(AUTH_HINT_KEY) === '1';
    } catch {
      hintReadable = false; // storage unavailable — hint says nothing either way
    }
    if (hint && (!user || user.expired)) {
      resetLoadUser();
      try {
        await userManager.signinSilent(); // success fires userLoaded → UI updates
      } catch {
        setAuthHint(false); // stale hint — the SSO session is gone
        clearServerSession(); // …and so must the session cookie
      }
    } else if (hintReadable && !hint && user) {
      // Hint cleared by a signout this tab never received (e.g. frozen tab).
      resetLoadUser();
      await userManager.removeUser();
    }
  } catch {
    // best-effort — a failed reconcile leaves the tab in its previous state
  }
}

// Try to restore a live session without a full-page Keycloak redirect (e.g.
// when a protected route is hit right after a long Razorpay checkout outlived
// the access token). Returns true when a non-expired user exists afterwards;
// callers should fall back to login({ returnTo }) on false.
export async function attemptSilentRestore(): Promise<boolean> {
  const path = window.location.pathname;
  if (path.includes('/auth/callback') || path.includes('/auth/silent-callback')) return false;
  await reconcileSessionWithHint();
  const user = await userManager.getUser();
  return !!user && !user.expired;
}

if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => void reconcileSessionWithHint());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void reconcileSessionWithHint();
  });
}
