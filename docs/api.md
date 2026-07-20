# API Integration Reference

> How the FixMyText frontend communicates with the backend API.

## Configuration

All API calls use RTK Query with a base query defined in `packages/app-core/src/store/api/baseQuery.ts`.

The base URL is set via the `VITE_API_URL` environment variable (default: `http://localhost:8000`).

## Authentication Flow

Auth is handled by Keycloak OIDC via `oidc-client-ts` (see `packages/app-core/src/auth/`), not by a Redux-stored credential. Tokens live only in memory (H-8).

1. User signs in through Keycloak's hosted pages; `userManager` (oidc-client-ts) holds the resulting `User` in an in-memory store
2. `baseQuery.ts` calls `userManager.getUser()` in `prepareHeaders` and attaches `Authorization: Bearer <access_token>` when a live user exists
3. Requests are sent with `credentials: 'include'` so the per-app session cookie travels with them
4. On 401 response, `baseQueryWithReauth` automatically:
   - Calls `userManager.signinSilent()` (silent renew via the Keycloak SSO cookie)
   - Retries the original request **only when it is idempotent** (GET/HEAD/OPTIONS) — mutations are not auto-retried to avoid double-submit; the caller re-issues with the fresh token
   - Falls back to `userManager.signinRedirect()` (redirect to Keycloak login) if silent renew fails

### Additional Headers

| Header                          | Set By         | Purpose                                                                                                                                 |
| ------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `Authorization: Bearer <token>` | `baseQuery.ts` | Authenticated user identity (from in-memory OIDC user)                                                                                  |
| `X-Visitor-Id`                  | `textApi.ts`   | Anonymous visitor fingerprint for server-side trial tracking (sent on every text transformation request, including for logged-in users) |

## API Slices

All slices live in `packages/app-core/src/store/api/`.

| File                 | Base Path               | Purpose                                          |
| -------------------- | ----------------------- | ------------------------------------------------ |
| `textApi.ts`         | `/api/v1/text/`         | `transformText` mutation used by every text tool |
| `authApi.ts`         | `/api/v1/auth/`         | Login, register, refresh, logout, me             |
| `userDataApi.ts`     | `/api/v1/user-data/`    | Profile, settings, gamification stats            |
| `historyApi.ts`      | `/api/v1/history/`      | Operation history (get, delete)                  |
| `subscriptionApi.ts` | `/api/v1/subscription/` | Razorpay orders, webhook, status                 |
| `passesApi.ts`       | `/api/v1/passes/`       | Prepaid pass purchase and balance                |
| `shareApi.ts`        | `/api/v1/share/`        | Create and retrieve shared results               |

## Using Text Transformations

All text tools use the `useTransformText` hook, which wraps an RTK Query mutation:

```javascript
const [transformText, { isLoading, error }] = useTransformTextMutation();

const result = await transformText({
  endpoint: '/api/v1/text/uppercase',
  text: 'hello world',
}).unwrap();

// result: { original: "hello world", result: "HELLO WORLD", operation: "uppercase" }
```

## Standard Response Shapes

**Text transformation:**

```json
{
  "original": "input text",
  "result": "transformed text",
  "operation": "tool_id"
}
```

**Error:**

```json
{
  "detail": "Error message"
}
```

## Error Handling

| Status | Meaning             | Frontend Behavior                                                                                     |
| ------ | ------------------- | ----------------------------------------------------------------------------------------------------- |
| 200    | Success             | Display result, show successMsg toast                                                                 |
| 401    | Token expired       | Silent renew via Keycloak SSO cookie; idempotent requests auto-retried, mutations re-issued by caller |
| 403    | Trial limit reached | Show upgrade prompt                                                                                   |
| 422    | Validation error    | Show error alert                                                                                      |
| 429    | Rate limited        | Show rate limit message                                                                               |
| 500    | Server error        | Show generic error alert                                                                              |

The error middleware in `packages/app-core/src/store/middleware/` catches API errors and dispatches alerts via `useAlert`.

## Adding New API Calls

For new endpoints, add mutations/queries to the appropriate API slice file in `packages/app-core/src/store/api/`. Follow the existing RTK Query patterns — do not use raw `fetch` or `axios`.
