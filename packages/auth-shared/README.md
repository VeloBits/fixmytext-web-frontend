# @velobits/auth-shared

Shared auth types, constants, and cookie-session helpers for VeloBits apps.

## Contents

| Export | Description |
|--------|-------------|
| `SESSION_COOKIE_NAME` | `'velobits_session'` — the HttpOnly cookie name set by account-svc |
| `SessionClaims` | TypeScript type for decoded session cookie payload |
| `parseSession(raw)` | Decode and validate a session cookie string (Sprint 5b adds HMAC verification) |
| `AUTH_ROUTES` | Canonical login/signup/callback path constants |

## Status

In Sprint 5a this package defines the **contract** only. `parseSession()` validates shape and expiry but does NOT verify the HMAC signature — full verification lands in Sprint 5b when account-svc begins issuing the cookie.
