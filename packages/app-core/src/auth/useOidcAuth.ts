import { useCallback, useEffect, useState } from 'react';
import type { User as OidcUser } from 'oidc-client-ts';
import * as Sentry from '@sentry/react';
import { clearSession } from '@velobits/api-client';
import { loadUser, resetLoadUser, userManager } from './userManager';

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
    await clearSession();
    await userManager.signoutRedirect({
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
