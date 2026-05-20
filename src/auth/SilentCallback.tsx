import { useEffect } from 'react';
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
 * Keycloak redirect: add http://localhost:3000/auth/silent-callback (and prod URL)
 *                    to the fixmytext-frontend client's valid redirect URIs.
 */
export function SilentCallback() {
  useEffect(() => {
    userManager.signinSilentCallback().catch((err) => {
      console.error('Silent renew callback error', err);
    });
  }, []);

  // This page is shown in a hidden iframe — render nothing visible.
  return null;
}
