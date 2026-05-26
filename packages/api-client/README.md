# @velobits/api-client

Framework-agnostic API client and endpoint catalog for the VeloBits / FixMyText backend.

## Usage

```ts
import { apiFetch, ENDPOINTS, WEB_APP_BASE_URL } from '@velobits/api-client';

// Direct fetch (e.g. from a Next.js Server Component)
const result = await apiFetch('/api/v1/text/uppercase', {
  method: 'POST',
  body: JSON.stringify({ text: 'hello' }),
});

// In RTK Query baseQuery — see apps/web/src/store/api/baseQuery.ts
// ENDPOINTS provides typed path constants for all 254+ tools
const path = ENDPOINTS.UPPERCASE; // '/api/v1/text/uppercase'

// CTA links from the Next.js content app to the Vite editor
const ctaUrl = `${WEB_APP_BASE_URL}?tool=uppercase`;
```

## Regenerating types

After backend schema changes, run from the repo root:

```bash
npm run gen:types -w @velobits/api-client
```

This regenerates `src/types/openapi.d.ts` from `backend/openapi.json`.
