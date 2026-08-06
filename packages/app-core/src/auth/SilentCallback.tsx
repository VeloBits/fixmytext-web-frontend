import { useEffect } from 'react';
import * as Sentry from '@sentry/react';
import { userManager } from './userManager';

/**
 * Silent token renewal callback page.
 *
 * oidc-client-ts renders this page inside a hidden iframe to exchange a
 * refresh token for a new access token without user interaction. The page
 * calls signinSilentCallback() which posts a message back to the parent
 * frame; the UserManager then updates the stored session.
 *
 * Route: /auth/silent-callback  (must match silent_redirect_uri in userManager)
 * Keycloak redirect: add the app's /auth/silent-callback URL (dev + prod) to
 *                    the Keycloak client's valid redirect URIs. The realm/client
 *                    coordinates come from keycloakConfig (develop-fixmytext in
 *                    dev, fixmytext in prod).
 */
export function SilentCallback() {
  useEffect(() => {
    userManager.signinSilentCallback().catch((err) => {
      // Hidden iframe - no UI to show. Capture for observability; the parent
      // frame falls back to an interactive login when the renewed token never
      // arrives.
      Sentry.captureException(err);
      console.error('Silent renew callback error', err);
    });
  }, []);

  // This page is shown in a hidden iframe - render nothing visible.
  return null;
}
