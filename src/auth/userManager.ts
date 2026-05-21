import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

// Sprint 5b: defaults updated to the Velobits-Dev realm hosted at the new
// auth-dev.velobits.dev subdomain (resolved via /etc/hosts in local dev).
// Production overrides via VITE_KEYCLOAK_URL = https://auth.velobits.dev,
// VITE_KEYCLOAK_REALM = Velobits-Prod, VITE_KEYCLOAK_CLIENT_ID = fixmytext.
const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://auth-dev.velobits.dev';
const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? 'Velobits-Dev';
const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'develop-fixmytext';

export const userManager = new UserManager({
  authority: `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}`,
  client_id: KEYCLOAK_CLIENT_ID,
  redirect_uri: `${window.location.origin}/auth/callback`,
  silent_redirect_uri: `${window.location.origin}/auth/silent-callback`,
  post_logout_redirect_uri: `${window.location.origin}/login`,
  response_type: 'code',
  scope: 'openid email profile',
  automaticSilentRenew: true,
  userStore: new WebStorageStateStore({ store: window.sessionStorage }),
});
