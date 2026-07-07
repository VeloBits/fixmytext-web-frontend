import { useCallback, useEffect, useState } from 'react';
import type { User as OidcUser } from 'oidc-client-ts';
import * as Sentry from '@sentry/react';
import { clearSession } from '@velobits/api-client';
import { broadcastAuthMessage, loadUser, resetLoadUser, userManager } from './userManager';

export interface OidcAuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  accessToken: string | null;
  oidcUser: OidcUser | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useOidcAuth(): OidcAuthState {
  const [oidcUser, setOidcUser] = useState<OidcUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Load the session on mount: in-memory user, else a silent renew from the
    // Keycloak SSO cookie (H-8 — no persisted refresh token to re-hydrate from).
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

    userManager.events.addUserLoaded(onLoaded);
    userManager.events.addUserUnloaded(onUnloaded);
    userManager.events.addUserSignedOut(onUnloaded);

    return () => {
      cancelled = true;
      userManager.events.removeUserLoaded(onLoaded);
      userManager.events.removeUserUnloaded(onUnloaded);
      userManager.events.removeUserSignedOut(onUnloaded);
    };
  }, []);

  const login = useCallback(() => userManager.signinRedirect(), []);
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
      // best-effort — always proceed to Keycloak SSO signout regardless
    }
    await userManager.signoutRedirect({
      id_token_hint: user?.id_token,
      post_logout_redirect_uri: `${window.location.origin}/app/login`,
    });
  }, []);

  return {
    isAuthenticated: !!oidcUser && !oidcUser.expired,
    isLoading,
    accessToken: oidcUser?.access_token ?? null,
    oidcUser,
    login,
    logout,
  };
}
