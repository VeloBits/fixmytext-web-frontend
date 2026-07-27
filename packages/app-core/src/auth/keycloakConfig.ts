// Single source of truth for the Keycloak realm coordinates.
//
// Both the oidc-client-ts UserManager (userManager.ts) and the raw Keycloak
// URL builders (the shell's ForgotPasswordPage) read from here. Keeping one
// copy avoids the class of bug where userManager pointed at
// Velobits/develop-fixmytext while another URL builder defaulted to a
// stale localhost:8080/fixmytext realm — silently breaking password reset
// (and any other direct Keycloak link) whenever a VITE_KEYCLOAK_* var was
// unset.
//
// Defaults target the Velobits realm at auth-dev.velobits.dev (resolved via
// /etc/hosts in local dev). Production overrides via:
//   VITE_KEYCLOAK_URL       = https://auth.velobits.dev
//   VITE_KEYCLOAK_REALM     = Velobits-Prod
//   VITE_KEYCLOAK_CLIENT_ID = fixmytext
export const KEYCLOAK_URL = import.meta.env.VITE_KEYCLOAK_URL ?? 'http://auth-dev.velobits.dev';
export const KEYCLOAK_REALM = import.meta.env.VITE_KEYCLOAK_REALM ?? 'Velobits';
export const KEYCLOAK_CLIENT_ID = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? 'develop-fixmytext';
