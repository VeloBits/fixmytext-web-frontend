# Cloudflare Deployment Setup Guide

## Overview

Three apps deploy as **Cloudflare Pages** (static Vite builds). The content app (Next.js) deploys as a **Cloudflare Worker** via [OpenNext](https://opennext.js.org/cloudflare). A single Cloudflare Worker router at your main domain proxies all traffic to the correct target.

## Deployment targets

| App                     | CF Target                    | Type                             | Build command                               |
| ----------------------- | ---------------------------- | -------------------------------- | ------------------------------------------- |
| `apps/shell`            | `fixmytext-shell`            | Cloudflare Pages                 | `npm run build:shell`                       |
| `apps/editor-remote`    | `fixmytext-editor-remote`    | Cloudflare Pages                 | `npm run build:editor`                      |
| `apps/analytics-remote` | `fixmytext-analytics-remote` | Cloudflare Pages                 | `npm run build:analytics`                   |
| `apps/content`          | `fixmytext-content`          | **Cloudflare Worker** (OpenNext) | `npm run build:cf -w @velobits/content-app` |
| `worker/`               | `fixmytext-router`           | Cloudflare Worker                | `npm run deploy:worker`                     |

## Initial Setup

### 1. Create the three CF Pages projects

```bash
npx wrangler pages project create fixmytext-shell
npx wrangler pages project create fixmytext-editor-remote
npx wrangler pages project create fixmytext-analytics-remote
```

The content app is a Worker — no Pages project needed for it.

### 2. Set environment variables for the Vite Pages projects

For `fixmytext-shell`, `fixmytext-editor-remote`, `fixmytext-analytics-remote` — set in Cloudflare Dashboard → Pages → Settings → Environment variables:

```
VITE_API_URL=https://api.velobits.dev
VITE_KEYCLOAK_URL=https://auth.velobits.dev
VITE_KEYCLOAK_REALM=Velobits
VITE_KEYCLOAK_CLIENT_ID=fixmytext
VITE_KEYCLOAK_ENABLED_PROVIDERS=google,github
VITE_SSO_DOMAIN_MAP=
VITE_EDITOR_REMOTE_ENTRY=https://fixmytext.com/remotes/editor/remoteEntry.js
VITE_ANALYTICS_REMOTE_ENTRY=https://fixmytext.com/remotes/analytics/remoteEntry.js
VITE_SENTRY_DSN=<your-sentry-dsn>
VITE_SENTRY_ENVIRONMENT=production
```

### 3. Deploy the content app Worker

The content app (`apps/content`) uses OpenNext and deploys as a Cloudflare Worker:

```bash
npm run deploy:content
```

This runs `@opennextjs/cloudflare build` then `wrangler deploy` from `apps/content/`.

After deploying, note the Worker URL (e.g. `fixmytext-content.workers.dev`) and update `worker/wrangler.toml`:

```toml
CONTENT_URL = "https://fixmytext-content.workers.dev"
```

### 4. Deploy the router Worker

Update `worker/wrangler.toml` with your actual domain and zone, then:

```bash
npm run deploy:worker
```

### 5. Deploy the Vite Pages projects

```bash
npm run deploy:shell
npm run deploy:editor
npm run deploy:analytics
```

## URL Routing

The router Worker at `fixmytext.com` routes:

| Path                   | Target                                                   | Type      |
| ---------------------- | -------------------------------------------------------- | --------- |
| `/remotes/editor/*`    | `fixmytext-editor-remote.pages.dev` (prefix stripped)    | CF Pages  |
| `/remotes/analytics/*` | `fixmytext-analytics-remote.pages.dev` (prefix stripped) | CF Pages  |
| `/app*`                | `fixmytext-shell.pages.dev`                              | CF Pages  |
| `/*`                   | `fixmytext-content.workers.dev`                          | CF Worker |

## Module Federation URLs

Remote entry files are served through the main domain (`fixmytext.com`), not directly from the Pages project URLs. This keeps module federation requests same-origin and avoids CORS issues.

## Local Simulation

```bash
# Dev mode (hot reload, all four apps)
docker compose --profile dev up --build

# Prod mode (CF simulation — Vite apps via nginx, content app via wrangler dev)
docker compose --profile prod up --build
```

See `docs/local-dev-docker.md` for full local dev instructions.
