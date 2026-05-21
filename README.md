# VeloBits Frontend — Monorepo

> React + Vite web app and shared packages for the VeloBits / FixMyText platform.

## Monorepo Layout

```
frontend/
├── src/                     ← Vite SPA (the interactive editor)
├── packages/
│   ├── design-system/       ← @velobits/design-system — Tailwind v4 tokens + UI primitives
│   ├── api-client/          ← @velobits/api-client — fetch wrapper + endpoint catalog + OpenAPI types
│   ├── auth-shared/         ← @velobits/auth-shared — session cookie contract + auth route constants
│   └── tools-registry/      ← @velobits/tools-registry — 254-tool catalog + slug helpers
├── apps/                    ← (Sprint 5c+) content app (Next.js) and web app (Vite) will live here
├── e2e/                     ← Playwright end-to-end tests
└── package.json             ← npm workspace root
```

## Prerequisites

- Node.js 20+
- npm 10+
- Backend running at http://localhost:8000 (see [backend README](../backend/README.md))

## Setup

```bash
cd frontend
npm install          # installs root app + links all workspace packages
cp .env.example .env
npm run dev
```

Open http://localhost:3000

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server on port 3000 |
| `npm run build` | Production build to `dist/` |
| `npm run typecheck` | TypeScript check (root app + all packages) |
| `npm run lint` | ESLint (root app + all packages) |
| `npm run test` | Vitest unit tests (root app — coverage enforced) |
| `npm run test:packages` | Vitest tests for all workspace packages |
| `npm run test:e2e` | Playwright end-to-end tests |
| `npm run gen:types` | Regenerate OpenAPI types from `backend/openapi.json` |

## Workspace packages

| Package | Purpose |
|---------|---------|
| `@velobits/design-system` | Tailwind v4 `@theme` tokens + Button, Card, Input, ToolCard components |
| `@velobits/api-client` | `apiFetch()` wrapper, `ENDPOINTS` catalog, OpenAPI types, `WEB_APP_BASE_URL` constant |
| `@velobits/auth-shared` | `SessionClaims` type, `parseSession()`, session cookie name, auth route constants |
| `@velobits/tools-registry` | All 254 `ToolDefinition` objects + `getToolBySlug()`, `getAllSlugs()`, `getToolsByGroup()` |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `http://localhost:8000` | Backend API base URL (Kong gateway) |

## Tech Stack

- **React 19** + react-router-dom 7
- **Vite 8** — build tool, HMR, manual chunk splitting
- **TypeScript 6** — strict mode
- **Tailwind CSS v4** — utility-first styling via `@tailwindcss/vite`
- **Redux Toolkit** + RTK Query — state and API layer
- **oidc-client-ts** — Keycloak OIDC / PKCE auth flow
- **Vitest** + Testing Library — unit tests
- **Playwright** — end-to-end tests

## Routing

| Route | Component | Auth Required |
|-------|-----------|---------------|
| `/` | Home (editor) | No |
| `/about` | AboutPage | No |
| `/login` `/signup` | Auth pages | No |
| `/pricing` | PricingPage | No |
| `/dashboard` | DashboardPage | Yes |
| `/share/:id` | SharePage | No |
