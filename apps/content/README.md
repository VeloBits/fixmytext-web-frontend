# @velobits/content-app — Next.js Content Surface

> The content surface of FixMyText: SEO-optimised pages, OG cards, and marketing content.

## Why Next.js here and Vite in `apps/web/`?

The content app handles pages where SSR/SSG matters:
- `/about` — static marketing content (SSG at build time)
- `/pricing` — static pricing structure for SEO (SSG) + client-side checkout
- `/share/[id]` — **the key win**: server-renders OG meta tags from share data, so Twitter/LinkedIn/Slack show rich preview cards instead of blank shells

The Vite editor app handles interactive surfaces where SSR adds nothing:
- `/app/*` — 254-tool editor, drawers, gamification, subscriptions (100% client-side)

## Local development

### Prerequisites

1. `/etc/hosts` entries (one-time, see backend README)
2. Backend running: `cd backend && docker compose --profile dev up --build`
3. Copy env: `cp .env.example .env.local`

### Start

```bash
cd frontend
npm install          # installs all workspace packages
npm run dev -w @velobits/content-app    # starts on http://localhost:3001
```

Visit:
- `http://localhost:3001/about`
- `http://localhost:3001/pricing`
- `http://localhost:3001/share/<id>` (needs a real share ID from the running backend)

### Path routing

Traefik routes by path within `develop-fixmytext.velobits.dev`:

| Path | → App | Port |
|---|---|---|
| `/about`, `/pricing`, `/share/*` | content-app | 3001 |
| `/app/*`, `/` | web-app | 3000 |

Both apps can also be accessed directly by port during development.

## Shared packages

| Import | Source |
|---|---|
| `@velobits/design-system` | Tailwind v4 `@theme` tokens + UI components |
| `@velobits/api-client` | Server-side fetch helpers, `WEB_APP_BASE_URL` |
| `@velobits/auth-shared` | `SESSION_COOKIE_NAME`, `parseSession()` |
| `@velobits/tools-registry` | 254-tool registry, `getToolBySlug()` |

## Auth

Auth.js v5 is configured in `auth.ts`. It reads the `fixmytext_session` cookie
issued by account-svc and surfaces it as a Next.js session. All current routes
(`/about`, `/pricing`, `/share/[id]`) are public — `auth()` is available for
future protected routes.
