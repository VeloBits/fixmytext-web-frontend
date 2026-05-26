# VeloBits Frontend — Monorepo

> React + Vite web app, Next.js content app, and shared packages for the VeloBits / FixMyText platform.

## Monorepo Layout

```
frontend/
├── apps/
│   ├── web/              ← @velobits/web-app — Vite SPA (editor + dashboard), served under /app/*
│   └── content/          ← @velobits/content-app — Next.js 15 (SEO pages, /tools/[slug], /share/[id])
├── packages/
│   ├── design-system/    ← @velobits/design-system — Tailwind v4 tokens + UI primitives
│   ├── api-client/       ← @velobits/api-client — fetch wrapper + endpoint catalog + OpenAPI types
│   ├── auth-shared/      ← @velobits/auth-shared — session cookie contract + auth route constants
│   └── tools-registry/   ← @velobits/tools-registry — 254-tool catalog + slug helpers
└── package.json          ← npm workspace root
```

### Path routing (via Traefik at `develop-fixmytext.velobits.dev`)

| URL prefix | App | Framework |
|---|---|---|
| `/app/*` | `apps/web` | Vite + React |
| `/tools/[slug]` | `apps/content` | Next.js 15 SSG |
| `/share/[id]` | `apps/content` | Next.js 15 SSR |
| `/about`, `/pricing` | `apps/content` | Next.js 15 |
| `/` | `apps/content` | Next.js 15 (redirects to `/app`) |

## Prerequisites

- Node.js 20+
- npm 10+
- Backend running via docker compose (see [backend README](../backend/README.md))
- **`/etc/hosts` entries** for the VeloBits subdomain architecture (see below)

## Local subdomain setup

The VeloBits platform runs each product on its own subdomain. Local dev mirrors
production exactly — only the DNS source changes (`/etc/hosts` here, real DNS
in production).

Add these to your dev machine's `/etc/hosts` (one-time):

```bash
sudo tee -a /etc/hosts <<EOF
127.0.0.1 auth-dev.velobits.dev
127.0.0.1 api-dev.velobits.dev
127.0.0.1 develop-fixmytext.velobits.dev
EOF
```

Without these entries, OIDC redirects and API calls will fail (`ERR_NAME_NOT_RESOLVED`).

## Setup

```bash
cd frontend
npm install           # installs all apps + links all workspace packages
```

Copy env files:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/content/.env.example apps/content/.env
```

## Dev servers

Start both apps simultaneously (requires separate terminals or a process manager):

```bash
# Terminal 1 — Vite editor (served at /app/*)
npm run dev -w @velobits/web-app       # http://localhost:3000

# Terminal 2 — Next.js content app (served at / /tools/* /share/*)
npm run dev -w @velobits/content-app   # http://localhost:3001
```

With Traefik running (`docker compose --profile dev up`), both apps are accessible
at `http://develop-fixmytext.velobits.dev` with path-based routing.

## Scripts

### Root workspace (runs across all apps + packages)

| Command | Description |
|---------|-------------|
| `npm run typecheck` | TypeScript check (all apps + packages) |
| `npm run lint` | ESLint (all apps + packages) |

### Per-app / per-package (use `-w <name>`)

| Command | Description |
|---------|-------------|
| `npm run dev -w @velobits/web-app` | Start Vite dev server (port 3000) |
| `npm run build -w @velobits/web-app` | Production build |
| `npm run test -w @velobits/web-app` | Vitest unit tests |
| `npm run test:coverage -w @velobits/web-app` | Vitest with coverage (thresholds enforced) |
| `npm run test:e2e -w @velobits/web-app` | Playwright E2E tests |
| `npm run dev -w @velobits/content-app` | Start Next.js dev server (port 3001) |
| `npm run build -w @velobits/content-app` | Next.js production build |
| `npm run test:coverage -w @velobits/api-client` | Package coverage (thresholds enforced) |
| `npm run gen:types -w @velobits/api-client` | Regenerate OpenAPI types from `backend/openapi.json` |

## Workspace packages

| Package | Purpose |
|---------|---------|
| `@velobits/design-system` | Tailwind v4 `@theme` tokens + Button, Card, Input, ToolCard components |
| `@velobits/api-client` | `apiFetch()` wrapper, `ENDPOINTS` catalog, OpenAPI types, `WEB_APP_BASE_URL` constant |
| `@velobits/auth-shared` | `SessionClaims` type, `parseSession()`, session cookie name, auth route constants |
| `@velobits/tools-registry` | All 254 `ToolDefinition` objects + `getToolBySlug()`, `getAllSlugs()`, `getToolsByGroup()` |

## Environment Variables

### `apps/web` (Vite)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `http://api-dev.velobits.dev` | Backend API base URL (Kong gateway) |
| `VITE_KEYCLOAK_URL` | Yes | `http://auth-dev.velobits.dev/realms/Velobits-Dev` | Keycloak realm OIDC endpoint |
| `VITE_KEYCLOAK_CLIENT_ID` | Yes | `develop-fixmytext` | Keycloak client ID |

### `apps/content` (Next.js)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_SITE_URL` | No | `https://fixmytext.velobits.dev` | Canonical site URL for OG/sitemap |
| `API_URL` | Yes | `http://api-dev.velobits.dev` | Backend API base URL (server-side) |

## Tech Stack

### `apps/web` (Vite SPA)
- **React 19** + react-router-dom 7 (basename `/app`)
- **Vite 8** — build tool, HMR, manual chunk splitting, `base: '/app'`
- **TypeScript 6** — strict mode
- **Tailwind CSS v4** — utility-first styling via `@tailwindcss/vite`
- **Redux Toolkit** + RTK Query — state and API layer
- **oidc-client-ts** — Keycloak OIDC / PKCE auth flow
- **Vitest** + Testing Library — unit tests
- **Playwright** — end-to-end tests (in `apps/web/e2e/`)

### `apps/content` (Next.js)
- **Next.js 15** App Router + React 19
- **Tailwind CSS v4** — via `@tailwindcss/postcss`
- **SSG** — per-tool pages generated at build time from `@velobits/tools-registry`
- **Sitemap** — auto-generated from tool slugs + static routes

## Routing — `apps/web`

All routes are relative to the `/app` basename (react-router):

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/` (→ `/app/`) | Home (editor) | No |
| `/login` | LoginPage | No |
| `/signup` | SignupPage | No |
| `/forgot-password` | ForgotPasswordPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/auth/callback` | AuthCallback | No |
| `/auth/silent-callback` | SilentCallback | No |

Routes `/about`, `/pricing`, and `/share/:id` are served by `apps/content` (Next.js), not this app.
