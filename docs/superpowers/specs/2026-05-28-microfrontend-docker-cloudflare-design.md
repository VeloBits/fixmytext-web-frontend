# Microfrontend Docker + Cloudflare Deployment Design

**Date:** 2026-05-28  
**Status:** Approved  
**Branch:** sy/feat/micro-fe-docker

---

## Context

The repo currently has two apps (`apps/web` and `apps/content`) and four shared packages. The Vite app (`apps/web`) has module federation wired up with `VITE_USE_REMOTES=false` — remotes are loaded locally in a single build and no separate remote servers exist. The project cannot currently run fully locally because both apps need a Traefik reverse proxy that is only available in the cloud environment.

**Goal:** Split into four independently deployable microfrontend units, run them all locally via a single `docker compose` command, and deploy each to Cloudflare independently. The local Docker environment must replicate the Cloudflare topology accurately.

---

## Architecture Overview

### Four Deployment Units

| Unit                    | Framework       | Cloudflare Target          | Serves                                            |
| ----------------------- | --------------- | -------------------------- | ------------------------------------------------- |
| `apps/shell`            | Vite + React 19 | Cloudflare Pages           | `/app/*` routes                                   |
| `apps/editor-remote`    | Vite + React 19 | Cloudflare Pages           | Editor surface (loaded via MFE)                   |
| `apps/analytics-remote` | Vite + React 19 | Cloudflare Pages           | Analytics surface (loaded via MFE)                |
| `apps/content`          | Next.js 15      | Cloudflare Pages + Workers | `/`, `/tools/*`, `/share/*`, `/about`, `/pricing` |

### Routing Layer

A single **Cloudflare Worker** (`worker/`) sits on the main domain and routes all traffic to the appropriate Pages project. Locally, an **nginx router container** replicates this routing 1:1.

```
fixmytext.com  (CF Worker / local nginx router)
    │
    ├── /remotes/editor/*    → fixmytext-editor-remote.pages.dev
    ├── /remotes/analytics/* → fixmytext-analytics-remote.pages.dev
    ├── /app/*               → fixmytext-shell.pages.dev
    └── /*                   → fixmytext-content.pages.dev
```

---

## App Structure

### Monorepo layout (after migration)

```
apps/
  shell/                    (@velobits/shell)
    src/                    ← moved from apps/web (pages/, components/, store/, App.tsx, main.tsx)
    vite.config.ts          ← host-only config, consumes remotes, no exposes
    package.json
    Dockerfile              ← prod multi-stage: node build → nginx serve
    Dockerfile.dev          ← dev: node + vite dev server

  editor-remote/            (@velobits/editor-remote)
    src/
      index.ts              ← moved from apps/web/src/remotes/editor/index.ts
      [editor components]
    vite.config.ts          ← remote-only: exposes ./EditorPage, filename: remoteEntry.js
    package.json
    Dockerfile
    Dockerfile.dev

  analytics-remote/         (@velobits/analytics-remote)
    src/
      index.ts              ← moved from apps/web/src/remotes/analytics/index.ts
      [analytics components]
    vite.config.ts          ← remote-only: exposes ./AnalyticsPage, filename: remoteEntry.js
    package.json
    Dockerfile
    Dockerfile.dev

  content/                  (@velobits/content-app — existing, with additions)
    wrangler.toml           ← NEW: CF Pages config with nodejs_compat flag
    Dockerfile              ← prod: next build → @cloudflare/next-on-pages → wrangler pages dev
    Dockerfile.dev          ← dev: plain next dev (Node.js, fast iteration)

worker/                     ← NEW: Cloudflare Worker router
  src/index.ts              ← path-based routing logic
  wrangler.toml             ← bound to main domain

docker/
  nginx.router.conf         ← local replica of Worker routing
  nginx.static.conf         ← shared nginx static file serving config
  Dockerfile.router         ← nginx router image

docker-compose.yml          ← unified, dev + prod profiles (replaces existing)
.env.docker.dev             ← env vars for docker dev profile
.env.docker.prod            ← env vars for docker prod profile
```

### Package.json workspaces update

```json
{
  "workspaces": [
    "packages/*",
    "apps/shell",
    "apps/editor-remote",
    "apps/analytics-remote",
    "apps/content"
  ]
}
```

`apps/web` is removed from workspaces once migration is complete.

---

## Module Federation Configuration

### Shell (`apps/shell/vite.config.ts`)

```typescript
federation({
  name: 'fixmytext-shell',
  // No exposes — shell is a host only
  remotes: {
    'editor-remote': process.env.VITE_EDITOR_REMOTE_ENTRY,
    'analytics-remote': process.env.VITE_ANALYTICS_REMOTE_ENTRY,
  },
  shared: {
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true },
    'react-router-dom': { singleton: true },
    '@reduxjs/toolkit': { singleton: true },
    'react-redux': { singleton: true },
    '@sentry/react': { singleton: true },
  },
});
```

`VITE_USE_REMOTES` is removed from the shell config — when `apps/shell` is its own build, remotes are always enabled. The `App.tsx` lazy import logic in `apps/shell` simplifies to always using `import('editor-remote/EditorPage')` (the conditional `if (USE_REMOTES)` branch is deleted). The original `apps/web/vite.config.ts` monolithic config is preserved during migration as a fallback but ultimately deprecated.

### Editor remote (`apps/editor-remote/vite.config.ts`)

```typescript
federation({
  name: 'editor-remote',
  filename: 'remoteEntry.js',
  exposes: {
    './EditorPage': './src/index.ts',
  },
  shared: {
    // Same shared list — provided as singletons by the shell at runtime
    react: { singleton: true, requiredVersion: '^19.0.0' },
    'react-dom': { singleton: true },
    // etc.
  },
});
```

Analytics remote follows the same pattern, exposing `./AnalyticsPage`.

### Remote entry URL strategy

| Environment            | `VITE_EDITOR_REMOTE_ENTRY`                            |
| ---------------------- | ----------------------------------------------------- |
| Local bare (no Docker) | `http://localhost:3101/remoteEntry.js`                |
| Docker dev             | `http://localhost:3000/remotes/editor/remoteEntry.js` |
| Docker prod            | `http://localhost:3000/remotes/editor/remoteEntry.js` |
| Cloudflare production  | `https://fixmytext.com/remotes/editor/remoteEntry.js` |

The URL path pattern (`/remotes/editor/remoteEntry.js`) is identical across Docker and Cloudflare — only the base URL changes. This means the nginx router and CF Worker have isomorphic routing rules.

---

## Docker Architecture

### docker-compose.yml profiles

**`dev` profile** — all services run in hot-reload dev-server mode:

```
router            nginx on host:3000 (routes all traffic)
shell-dev         vite dev --port 3100  (apps/shell)
editor-dev        vite dev --port 3101  (apps/editor-remote)
analytics-dev     vite dev --port 3102  (apps/analytics-remote)
content-dev       next dev --port 3103  (apps/content, plain Node.js)
```

Usage: `docker compose --profile dev up`

**`prod` profile** — built artifacts, CF-accurate simulation:

```
router            nginx on host:3000
shell             nginx serving apps/shell/dist  :3100
editor-remote     nginx serving apps/editor-remote/dist  :3101
analytics-remote  nginx serving apps/analytics-remote/dist  :3102
content           wrangler pages dev (CF Edge Worker sim)  :3103
```

Usage: `docker compose --profile prod up --build`

The `content` prod service runs: `next build` → `npx @cloudflare/next-on-pages` → `wrangler pages dev .vercel/output/static/` — this accurately simulates Cloudflare Edge Workers including the `nodejs_compat` flag behavior.

### nginx router config (`docker/nginx.router.conf`)

```nginx
server {
  listen 80;

  location /remotes/editor/ {
    proxy_pass http://editor-remote:3101/;
  }
  location /remotes/analytics/ {
    proxy_pass http://analytics-remote:3102/;
  }
  location /app {
    proxy_pass http://shell:3100;
  }
  location / {
    proxy_pass http://content:3103;
  }
}
```

Both profiles use the **same service names** (`editor-remote`, `analytics-remote`, `shell`, `content`) at the same internal ports — only the service implementation differs (Vite dev server vs nginx). This means the router nginx config is identical for both profiles; Docker Compose resolves the correct container by name.

### Environment files

`.env.docker.dev`:

```
VITE_API_URL=http://api-dev.velobits.dev
VITE_KEYCLOAK_URL=http://auth-dev.velobits.dev
VITE_KEYCLOAK_REALM=Velobits-Dev
VITE_KEYCLOAK_CLIENT_ID=develop-fixmytext
VITE_USE_REMOTES=true
VITE_EDITOR_REMOTE_ENTRY=http://localhost:3000/remotes/editor/remoteEntry.js
VITE_ANALYTICS_REMOTE_ENTRY=http://localhost:3000/remotes/analytics/remoteEntry.js
```

`.env.docker.prod` — same but `VITE_API_URL` points to a built/mocked API.

---

## Cloudflare Architecture

### Four Cloudflare Pages projects

| CF Pages project             | Build command                                                             | Output dir                           |
| ---------------------------- | ------------------------------------------------------------------------- | ------------------------------------ |
| `fixmytext-shell`            | `npm run build -w @velobits/shell`                                        | `apps/shell/dist`                    |
| `fixmytext-editor-remote`    | `npm run build -w @velobits/editor-remote`                                | `apps/editor-remote/dist`            |
| `fixmytext-analytics-remote` | `npm run build -w @velobits/analytics-remote`                             | `apps/analytics-remote/dist`         |
| `fixmytext-content`          | `npm run build -w @velobits/content-app && npx @cloudflare/next-on-pages` | `apps/content/.vercel/output/static` |

Each project is independent. A PR touching only `apps/editor-remote` only rebuilds and deploys that Pages project.

### Cloudflare Worker router (`worker/`)

```typescript
// worker/src/index.ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith('/remotes/editor/')) {
      const remoteUrl = `https://fixmytext-editor-remote.pages.dev${pathname.replace('/remotes/editor', '')}${url.search}`;
      return fetch(remoteUrl, request);
    }

    if (pathname.startsWith('/remotes/analytics/')) {
      const remoteUrl = `https://fixmytext-analytics-remote.pages.dev${pathname.replace('/remotes/analytics', '')}${url.search}`;
      return fetch(remoteUrl, request);
    }

    if (pathname.startsWith('/app')) {
      return fetch(`https://fixmytext-shell.pages.dev${pathname}${url.search}`, request);
    }

    // all other paths → content app (Next.js)
    return fetch(`https://fixmytext-content.pages.dev${pathname}${url.search}`, request);
  },
} satisfies ExportedHandler<Env>;
```

`worker/wrangler.toml` routes `fixmytext.com/*` to this Worker.

### CF environment variables per Pages project

Each Pages project has its env vars set in the Cloudflare dashboard (or via `wrangler pages env`):

- Shell: `VITE_EDITOR_REMOTE_ENTRY=https://fixmytext.com/remotes/editor/remoteEntry.js`
- Shell: `VITE_ANALYTICS_REMOTE_ENTRY=https://fixmytext.com/remotes/analytics/remoteEntry.js`
- All Vite apps: `VITE_API_URL`, `VITE_KEYCLOAK_*` etc.
- Content: `NEXT_PUBLIC_*` equivalents as needed

### apps/content + @cloudflare/next-on-pages

`apps/content/wrangler.toml`:

```toml
name = "fixmytext-content"
compatibility_date = "2024-09-23"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

`apps/content/package.json` additions:

```json
{
  "devDependencies": {
    "@cloudflare/next-on-pages": "^1.0.0",
    "wrangler": "^3.0.0"
  },
  "scripts": {
    "build:cf": "next build && npx @cloudflare/next-on-pages",
    "preview": "npm run build:cf && wrangler pages dev .vercel/output/static"
  }
}
```

**Known constraint:** `nodejs_compat` enables most Node.js APIs on CF Workers, but some edge cases (specific `crypto` or `fs` usage) may not work. The `apps/content` code currently uses only standard Next.js patterns and should be fully compatible.

---

## Migration Steps Summary

1. Create `apps/shell/`, `apps/editor-remote/`, `apps/analytics-remote/` with `package.json`, `vite.config.ts`, `Dockerfile`, `Dockerfile.dev`
2. Move source files from `apps/web/src` to corresponding new apps
3. Update `package.json` workspaces; deprecate `apps/web`
4. Add `@cloudflare/next-on-pages` + `wrangler.toml` to `apps/content`
5. Create `worker/` with CF Worker router
6. Create `docker/nginx.router.conf`, `docker/Dockerfile.router`
7. Rewrite `docker-compose.yml` with `dev` + `prod` profiles
8. Add `.env.docker.dev` and `.env.docker.prod`
9. Update CI/CD to deploy four separate CF Pages projects

---

## Verification

### Local

```bash
# Dev mode (hot reload)
docker compose --profile dev up
# → open http://localhost:3000

# Prod mode (CF-accurate simulation)
docker compose --profile prod up --build
# → open http://localhost:3000
```

Expected: landing page at `/` (Next.js), `/app/` loads shell, editor/analytics surfaces load as separate remote bundles. Browser DevTools Network tab should show `remoteEntry.js` loaded from `/remotes/editor/` and `/remotes/analytics/`.

### Cloudflare

1. Deploy all four Pages projects + Worker
2. Navigate to `fixmytext.com` → served by content app
3. Navigate to `fixmytext.com/app` → served by shell, remotes loaded from CF
4. Check Network tab: `remoteEntry.js` loaded from `fixmytext.com/remotes/*/remoteEntry.js`
5. Dynamic route `/share/[id]` — confirm SSR works via CF Worker
