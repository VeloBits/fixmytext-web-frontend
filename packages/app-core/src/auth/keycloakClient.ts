// Keycloak helpers that don't go through oidc-client-ts directly.
//
// H-9: the Resource-Owner-Password-Credentials (ROPC / "Direct Grant") flow
// `passwordGrant()` was removed. The SPA must never collect or transmit the
// user's password — login and registration now go through Keycloak's hosted
// pages via userManager.signinRedirect (see LoginForm / SignupForm), so
// Keycloak owns the credential and runs MFA / brute-force protection.

import { KEYCLOAK_CLIENT_ID, KEYCLOAK_REALM, KEYCLOAK_URL } from './keycloakConfig';

/** Trigger Keycloak's "reset password" flow as a magic-link substitute.
 *  Keycloak sends an email with a link that authenticates + prompts password set.
 *  This is a browser redirect to Keycloak (no credentials handled in the SPA).
 */
export async function sendMagicLink(email: string): Promise<void> {
  const params = new URLSearchParams({
    client_id: KEYCLOAK_CLIENT_ID,
    login_hint: email,
  });
  // Redirect — the user is taken to Keycloak's "check your email" page.
  window.location.href = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/login-actions/reset-credentials?${params.toString()}`;
}
