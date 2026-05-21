/** Name of the HttpOnly session cookie issued by account-svc (Sprint 5b). */
export const SESSION_COOKIE_NAME = 'velobits_session';

/** Path on the Vite app that handles OIDC silent-renew iframes. */
export const SILENT_RENEW_PATH = '/auth/silent-callback';

/** Path on the Vite app that handles the OIDC authorization code callback. */
export const AUTH_CALLBACK_PATH = '/auth/callback';

/** HMAC algorithm used to sign session cookie payloads. */
export const SESSION_HMAC_ALGORITHM = 'SHA-256';
