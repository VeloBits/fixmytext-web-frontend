/**
 * Per-app session cookie name.
 * Host-only, scoped to `fixmytext.velobits.dev` (or `develop-fixmytext.velobits.dev` in dev).
 * Issued by account-svc on successful /auth/me.
 *
 * Per-app naming convention: every VeloBits product has its OWN session cookie
 * (CHAT_SESSION, NOTES_SESSION, ...). Cookies are never shared across apps —
 * shared identity is achieved via the SSO cookie below (managed by Keycloak).
 */
export const SESSION_COOKIE_NAME = 'fixmytext_session';

/**
 * Global SSO cookie name (informational only — frontend never reads it).
 * Issued by Keycloak at `.velobits.dev` scope. Browser sends it automatically
 * on every *.velobits.dev request. Used by Keycloak to skip the login UI on
 * subsequent cross-app navigation (e.g. fixmytext → chat).
 *
 * NOTE: Keycloak's actual cookie names (KEYCLOAK_IDENTITY, KC_RESTART) differ
 * from `VELOBITS_SSO`. Renaming via a Keycloak SPI plugin is a future polish
 * item; the SSO mechanism works regardless of cookie name.
 */
export const SSO_COOKIE_NAME = 'VELOBITS_SSO';

/** Path on the Vite app that handles OIDC silent-renew iframes. */
export const SILENT_RENEW_PATH = '/auth/silent-callback';

/** Path on the Vite app that handles the OIDC authorization code callback. */
export const AUTH_CALLBACK_PATH = '/auth/callback';

/** Backend endpoint that clears the per-app session cookie on logout. */
export const SESSION_CLEAR_PATH = '/api/v1/auth/session/clear';

/** HMAC algorithm used to sign session cookie payloads. */
export const SESSION_HMAC_ALGORITHM = 'SHA-256';
