# VeloBits Frontend — Monorepo

> React + Vite micro-frontend shell + remotes, Next.js content app, and shared packages for the VeloBits / FixMyText platform.

## Monorepo Layout

```
frontend/
├── apps/
│   ├── shell/            ← @velobits/shell — MFE host (auth, chrome, routing, store Provider)
│   ├── editor-remote/    ← @velobits/editor-remote — Module Federation remote (editor surface)
│   ├── analytics-remote/ ← @velobits/analytics-remote — Module Federation remote (dashboard surface)
│   └── content/          ← @velobits/content-app — Next.js 15 (SEO pages, /tools/[slug], /share/[id])
├── packages/
│   ├── app-core/         ← @velobits/app-core — Redux store, RTK Query APIs, shared hooks + gamification UI
│   ├── design-system/    ← @velobits/design-system — Tailwind v4 tokens + UI primitives
│   ├── api-client/       ← @velobits/api-client — fetch wrapper + endpoint catalog + OpenAPI types
│   ├── auth-shared/      ← @velobits/auth-shared — session cookie contract + auth route constants
│   └── tools-registry/   ← @velobits/tools-registry — 254-tool catalog + slug helpers
└── package.json          ← npm workspace root
```

### Path routing (via Cloudflare Worker in the cloud, Traefik at `local-fixmytext.velobits.dev` locally)

| URL prefix             | App                     | Framework                        |
| ---------------------- | ----------------------- | -------------------------------- |
| `/remotes/editor/*`    | `apps/editor-remote`    | Vite + Module Federation remote  |
| `/remotes/analytics/*` | `apps/analytics-remote` | Vite + Module Federation remote  |
| `/*` (everything else) | `apps/shell`            | Vite + React (host)              |

> `apps/content` (Next.js) is no longer routed on this origin — the shell owns
> the origin root. The container is parked and only reachable directly.

### Deployed origins (`velobits.dev`)

Everything is hosted on the `velobits.dev` zone. A service's Cloudflare project
name is its hostname label; the develop copy is the same name prefixed
`develop-`. The **router is the only origin users should see** — the rest are
addressable for debugging, and all canonical/OG URLs point at the router.

| Service               | production                                     | develop                                                |
| --------------------- | ---------------------------------------------- | ------------------------------------------------------ |
| Router (public)       | `fixmytext.velobits.dev`                       | `develop-fixmytext.velobits.dev`                       |
| Shell (Pages)         | `fixmytext-shell.velobits.dev`                 | `develop-fixmytext-shell.velobits.dev`                 |
| Editor remote (Pages) | `fixmytext-editor-remote.velobits.dev`         | `develop-fixmytext-editor-remote.velobits.dev`         |
| Analytics (Pages)     | `fixmytext-analytics-remote.velobits.dev`      | `develop-fixmytext-analytics-remote.velobits.dev`      |
| Content (Worker)      | `fixmytext-content.velobits.dev`               | `develop-fixmytext-content.velobits.dev`               |

Local dev uses `local-fixmytext.velobits.dev` (loopback via `/etc/hosts`) —
never map a deployed hostname to `127.0.0.1`. Setup reference:
[`docs/cloudflare-pages-setup.md`](docs/cloudflare-pages-setup.md).

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
127.0.0.1 local-fixmytext.velobits.dev
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
cp .env.example .env                       # Vite apps (shell + remotes) read these VITE_* vars
cp apps/content/.env.example apps/content/.env.local   # Next.js content app
```

## Dev servers

Start the full stack via Docker (recommended — node_modules live in Docker volumes):

```bash
docker compose --profile dev up
# shell → http://localhost:3000 (served at /)
# editor-remote → http://localhost:3101 (federation remote)
# analytics-remote → http://localhost:3102 (federation remote)
# content → http://localhost:3001 (parked — not routed via :3000)
```

To run the production simulation (built artifacts behind the nginx router, mirroring
the Cloudflare topology), first create `.env.docker.prod` from the example, then bring
up the `prod` profile:

```bash
cp .env.docker.prod.example .env.docker.prod   # required — prod services declare env_file: .env.docker.prod
docker compose --profile prod up --build        # everything served at http://localhost:3000
```

> The shell bakes the federation remote-entry URLs at **build** time (Vite). The prod
> profile passes them as Docker build args (defaulting to the local router URLs
> `http://localhost:3000/remotes/{editor,analytics}/remoteEntry.js`); override
> `VITE_EDITOR_REMOTE_ENTRY` / `VITE_ANALYTICS_REMOTE_ENTRY` in your host env or a root
> `.env` to point at real deployment URLs.

Or start individually (requires host npm install):

```bash
npm run dev -w @velobits/shell              # http://localhost:3000
npm run dev -w @velobits/editor-remote      # http://localhost:3101
npm run dev -w @velobits/analytics-remote   # http://localhost:3102
npm run dev -w @velobits/content-app        # http://localhost:3001
```

With Traefik running (`docker compose --profile dev up`), all apps are accessible
at `http://local-fixmytext.velobits.dev` with path-based routing.

## Scripts

### Root workspace (runs across all apps + packages)

| Command             | Description                            |
| ------------------- | -------------------------------------- |
| `npm run typecheck` | TypeScript check (all apps + packages) |
| `npm run lint`      | ESLint (all apps + packages)           |

### Per-app / per-package (use `-w <name>`)

| Command                                               | Description                                          |
| ----------------------------------------------------- | ---------------------------------------------------- |
| `npm run dev -w @velobits/shell`                      | Start shell dev server (port 3000)                   |
| `npm run build -w @velobits/shell`                    | Production build (shell)                             |
| `npm run test -w @velobits/shell`                     | Vitest unit tests (shell)                            |
| `npm run test:coverage -w @velobits/shell`            | Vitest with coverage (thresholds enforced)           |
| `npm run test:e2e -w @velobits/shell`                 | Playwright E2E tests                                 |
| `npm run dev -w @velobits/editor-remote`              | Start editor remote dev server (port 3101)           |
| `npm run build -w @velobits/editor-remote`            | Production build (editor remote)                     |
| `npm run test:coverage -w @velobits/editor-remote`    | Vitest with coverage                                 |
| `npm run dev -w @velobits/analytics-remote`           | Start analytics remote dev server (port 3102)        |
| `npm run build -w @velobits/analytics-remote`         | Production build (analytics remote)                  |
| `npm run test:coverage -w @velobits/analytics-remote` | Vitest with coverage                                 |
| `npm run dev -w @velobits/content-app`                | Start Next.js dev server (port 3001)                 |
| `npm run build -w @velobits/content-app`              | Next.js production build                             |
| `npm run test:coverage -w @velobits/api-client`       | Package coverage (thresholds enforced)               |
| `npm run gen:types -w @velobits/api-client`           | Regenerate OpenAPI types from `backend/openapi.json` |

## Workspace packages

| Package                    | Purpose                                                                                      |
| -------------------------- | -------------------------------------------------------------------------------------------- |
| `@velobits/app-core`       | Redux store, RTK Query API slices, shared data hooks, gamification UI (federation singleton) |
| `@velobits/design-system`  | Tailwind v4 `@theme` tokens + Button, Card, Input, ToolCard components                       |
| `@velobits/api-client`     | `apiFetch()` wrapper, `ENDPOINTS` catalog, OpenAPI types, `WEB_APP_BASE_URL` constant        |
| `@velobits/auth-shared`    | `SessionClaims` type, `parseSession()`, session cookie name, auth route constants            |
| `@velobits/tools-registry` | All 254 `ToolDefinition` objects + `getToolBySlug()`, `getAllSlugs()`, `getToolsByGroup()`   |

## Environment Variables

### `apps/shell` (Vite)

| Variable                  | Required | Default                        | Description                                      |
| ------------------------- | -------- | ------------------------------ | ------------------------------------------------ |
| `VITE_API_URL`            | Yes      | `http://api-dev.velobits.dev`  | Backend API base URL (Kong gateway)              |
| `VITE_KEYCLOAK_URL`       | Yes      | `http://auth-dev.velobits.dev` | Keycloak server base URL (realm path is derived) |
| `VITE_KEYCLOAK_REALM`     | Yes      | `Velobits`                 | Keycloak realm name                              |
| `VITE_KEYCLOAK_CLIENT_ID` | Yes      | `develop-fixmytext`            | Keycloak client ID                               |

### `apps/content` (Next.js)

| Variable               | Required | Default                          | Description                        |
| ---------------------- | -------- | -------------------------------- | ---------------------------------- |
| `NEXT_PUBLIC_SITE_URL` | No       | `https://fixmytext.velobits.dev` | Canonical site URL for OG/sitemap  |
| `API_URL`              | Yes      | `http://api-dev.velobits.dev`    | Backend API base URL (server-side) |

## Tech Stack

### `apps/shell` (MFE host)

- **React 19** + react-router-dom 7 (served at the origin root, no basename)
- **Vite 8** + `@module-federation/vite` — host that loads editor-remote and analytics-remote at runtime
- **TypeScript 6** — strict mode
- **Tailwind CSS v4** — utility-first styling via `@tailwindcss/vite`
- **Redux Toolkit** + RTK Query — store provided to remotes via `@velobits/app-core` singleton
- **oidc-client-ts** — Keycloak OIDC / PKCE auth flow
- **Vitest** + Testing Library — unit tests
- **Playwright** — end-to-end tests (in `apps/shell/e2e/`)

### `apps/editor-remote` + `apps/analytics-remote` (MFE remotes)

- **React 19** + Module Federation remote — independently deployed bundles
- Each owns its full surface source; runtime store is the singleton from `@velobits/app-core`

### `apps/content` (Next.js)

- **Next.js 15** App Router + React 19
- **Tailwind CSS v4** — via `@tailwindcss/postcss`
- **SSG** — per-tool pages generated at build time from `@velobits/tools-registry`
- **Sitemap** — auto-generated from tool slugs + static routes

## Routing — `apps/shell`

All routes are served from the origin root (react-router, no basename):

| Route                   | Component                            | Auth Required |
| ----------------------- | ------------------------------------ | ------------- |
| `/`                     | Home (editor, via editor-remote)     | No            |
| `/login`                | LoginPage                            | No            |
| `/signup`               | SignupPage                           | No            |
| `/forgot-password`      | ForgotPasswordPage                   | No            |
| `/dashboard`            | DashboardPage (via analytics-remote) | Yes           |
| `/about`                | AboutPage                            | No            |
| `/pricing`              | PricingPage                          | No            |
| `/auth/callback`        | AuthCallback                         | No            |
| `/auth/silent-callback` | SilentCallback                       | No            |

Routes `/share/:id` and public marketing pages are served by `apps/content` (Next.js).
