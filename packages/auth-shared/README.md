# @velobits/auth-shared

Shared auth types, constants, and cookie-session helpers for VeloBits apps.

## Contents

| Export | Description |
|--------|-------------|
| `SESSION_COOKIE_NAME` | `'fixmytext_session'` — the HttpOnly cookie name set by account-svc |
| `SessionClaims` | TypeScript type for decoded session cookie payload |
| `parseSession(raw)` | Decode and validate a session cookie string (shape + expiry only; HMAC verification is server-side) |
| `AUTH_ROUTES` | Canonical login/signup/callback path constants |
