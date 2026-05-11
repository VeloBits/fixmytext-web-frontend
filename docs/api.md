# API Integration Reference

> How the FixMyText frontend communicates with the backend API.

## Configuration

All API calls use RTK Query with a base query defined in `src/store/api/baseQuery.js`.

The base URL is set via the `VITE_API_URL` environment variable (default: `http://localhost:8000`).

## Authentication Flow

1. User logs in or registers via `authApi.js`
2. `access_token` is stored in the Redux auth slice
3. Every API request includes `Authorization: Bearer <token>`
4. On 401 response, `baseQueryWithReauth` automatically:
   - Calls `POST /api/v1/auth/refresh` (uses httpOnly cookie)
   - Retries the original request with the new token
   - Uses a mutex to prevent concurrent refresh calls

### Additional Headers

| Header | Set By | Purpose |
|--------|--------|---------|
| `Authorization: Bearer <token>` | `baseQuery.js` | Authenticated user identity |
| `X-Visitor-Id` | `textApi.js` | Anonymous visitor fingerprint for server-side trial tracking (sent on every text transformation request, including for logged-in users) |

## API Slices

| File | Base Path | Purpose |
|------|-----------|---------|
| `textApi.js` | `/api/v1/text/` | 200+ text transformation mutations |
| `authApi.js` | `/api/v1/auth/` | Login, register, refresh, logout, me |
| `userDataApi.js` | `/api/v1/user-data/` | Profile, settings, gamification stats |
| `historyApi.js` | `/api/v1/history/` | Operation history (get, delete) |
| `subscriptionApi.js` | `/api/v1/subscription/` | Razorpay orders, webhook, status |
| `passApi.js` | `/api/v1/passes/` | Prepaid pass purchase and balance |
| `shareApi.js` | `/api/v1/share/` | Create and retrieve shared results |

## Using Text Transformations

All text tools use the `useTransformText` hook, which wraps an RTK Query mutation:

```javascript
const [transformText, { isLoading, error }] = useTransformTextMutation();

const result = await transformText({
  endpoint: '/api/v1/text/uppercase',
  text: 'hello world'
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

| Status | Meaning | Frontend Behavior |
|--------|---------|-------------------|
| 200 | Success | Display result, show successMsg toast |
| 401 | Token expired | Auto-refresh, retry request |
| 403 | Trial limit reached | Show upgrade prompt |
| 422 | Validation error | Show error alert |
| 429 | Rate limited | Show rate limit message |
| 500 | Server error | Show generic error alert |

The error middleware in `src/store/middleware/` catches API errors and dispatches alerts via `useAlert`.

## Adding New API Calls

For new endpoints, add mutations/queries to the appropriate API slice file in `src/store/api/`. Follow the existing RTK Query patterns — do not use raw `fetch` or `axios`.
