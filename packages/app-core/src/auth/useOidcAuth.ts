import { useCallback, useEffect, useState } from 'react';
import type { User as OidcUser } from 'oidc-client-ts';
import * as Sentry from '@sentry/react';
import { clearSession } from '@velobits/api-client';
import {
  attemptSilentRestore,
  broadcastAuthMessage,
  hasAuthHint,
  loadUser,
  resetLoadUser,
  userManager,
} from './userManager';

export interface LoginOptions {
  /** Router-relative path (e.g. "/pricing?tab=day") to restore after the
   * Keycloak round trip. Carried through the OIDC state and validated by
   * AuthCallback (same-origin relative paths only). */
  returnTo?: string;
}

export interface OidcAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** A session existed in this browser before this page load (persisted,
   * non-sensitive hint). While isLoading it distinguishes "probably signed in,
   * restore in flight" from a genuine guest - render a loading state for the
   * former instead of logged-out chrome. */
  wasAuthenticated: boolean;
  accessToken: string | null;
  oidcUser: OidcUser | null;
  login: (opts?: LoginOptions) => Promise<void>;
  logout: () => Promise<void>;
}

export function useOidcAuth(): OidcAuthState {
  const [oidcUser, setOidcUser] = useState<OidcUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Snapshot once per mount: this answers "was there a session when the page
  // loaded", not "is there one now" (isAuthenticated answers that).
  const [wasAuthenticated] = useState(hasAuthHint);

  useEffect(() => {
    let cancelled = false;
    // Load the session on mount: in-memory user, else a silent renew from the
    // Keycloak SSO cookie (H-8 - no persisted refresh token to re-hydrate from).
    loadUser().then((u) => {
      if (cancelled) return;
      setOidcUser(u);
      if (u) Sentry.setUser({ id: u.profile.sub, email: u.profile.email });
      setIsLoading(false);
    });

    // Subscribe to events
    const onLoaded = (u: OidcUser) => {
      setOidcUser(u);
      Sentry.setUser({ id: u.profile.sub, email: u.profile.email });
    };
    const onUnloaded = () => {
      setOidcUser(null);
      Sentry.setUser(null);
    };

    // Backstop for automaticSilentRenew getting throttled/frozen during long
    // overlay flows (e.g. a minutes-long Razorpay checkout): when the access
    // token expires anyway, try one silent restore. attemptSilentRestore
    // dedupes concurrent runs and clears the hint when the SSO session is
    // genuinely gone, so this cannot loop.
    const onExpired = () => void attemptSilentRestore();

    userManager.events.addUserLoaded(onLoaded);
    userManager.events.addUserUnloaded(onUnloaded);
    userManager.events.addUserSignedOut(onUnloaded);
    userManager.events.addAccessTokenExpired(onExpired);

    return () => {
      cancelled = true;
      userManager.events.removeUserLoaded(onLoaded);
      userManager.events.removeUserUnloaded(onUnloaded);
      userManager.events.removeUserSignedOut(onUnloaded);
      userManager.events.removeAccessTokenExpired(onExpired);
    };
  }, []);

  const login = useCallback(
    (opts?: LoginOptions) =>
      userManager.signinRedirect(
        opts?.returnTo ? { state: { returnTo: opts.returnTo } } : undefined
      ),
    []
  );
  const logout = useCallback(async () => {
    // Clear the per-app session cookie FIRST (best-effort), then redirect to
    // Keycloak end-session which clears the SSO cookie.
    // Order matters: if signoutRedirect runs first the page navigates away
    // before clearSession completes.
    resetLoadUser(); // drop the cached bootstrap so a later load re-evaluates
    // Capture the id_token BEFORE broadcasting: the 'user_signed_out' message
    // is also delivered to THIS tab's module-level channel listener, whose
    // removeUser() races signoutRedirect's own read of the stored user. If it
    // wins, the end-session request goes out without an id_token_hint and
    // Keycloak interrupts the logout with a confirmation page instead of
    // silently redirecting to /app/login.
    const user = await userManager.getUser();
    broadcastAuthMessage({ type: 'user_signed_out' }); // notify other open tabs
    try {
      await clearSession();
    } catch {
      // best-effort - always proceed to Keycloak SSO signout regardless
    }
    // Land on the logged-out app home, NOT /login - the login page
    // immediately re-redirects to Keycloak, which would dump a user who just
    // signed out straight onto the Keycloak sign-in form with no way back.
    // The URI must be listed in the client's post.logout.redirect.uris.
    await userManager.signoutRedirect({
      id_token_hint: user?.id_token,
      post_logout_redirect_uri: `${window.location.origin}/`,
    });
  }, []);

  return {
    isAuthenticated: !!oidcUser && !oidcUser.expired,
    isLoading,
    wasAuthenticated,
    accessToken: oidcUser?.access_token ?? null,
    oidcUser,
    login,
    logout,
  };
}
