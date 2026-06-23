# @velobits/auth-shared

Shared auth types, constants, and cookie-session helpers for VeloBits apps.

## Contents

### Root entry (`@velobits/auth-shared`)

| Export | Description |
|--------|-------------|
| `SESSION_COOKIE_NAME` | `'fixmytext_session'` — the HttpOnly cookie name set by account-svc |
| `SSO_COOKIE_NAME` | `'VELOBITS_SSO'` — global SSO cookie name (informational; frontend never reads it) |
| `SESSION_HMAC_ALGORITHM` | `'SHA-256'` — HMAC algorithm used to sign session cookie payloads |
| `AUTH_CALLBACK_PATH` / `SILENT_RENEW_PATH` | OIDC callback paths on the Vite app (`/auth/callback`, `/auth/silent-callback`) |
| `SESSION_CLEAR_PATH` | Backend endpoint that clears the per-app session cookie on logout |
| `SessionClaims` | TypeScript type for decoded session cookie payload |
| `parseSession(raw)` | Decode and validate a session cookie string (shape + expiry only; HMAC verification is server-side) |
| `AUTH_ROUTES` | Canonical login/signup/forgot-password/callback path constants |

### Server entry (`@velobits/auth-shared/server`)

Node-only (`node:crypto`) — never import in browser bundles.

| Export | Description |
|--------|-------------|
| `verifySession(raw, secret)` | Verify the HMAC-SHA256 signature of a session cookie (constant-time) and return its `SessionClaims`, or `null` on bad signature / malformed / expired / missing secret. `secret` must equal account-svc's `SESSION_COOKIE_SECRET`. |
