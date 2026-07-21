# Cloudflare Deployment Setup Guide

## Overview

Three Vite apps deploy as **Cloudflare Pages** projects; a **router Worker** fronts them
as a single origin, applying path routing and the security headers/CSP. The shell owns
the origin root (built with base `/`); `/app*` URLs are legacy and 301-redirect to their
root-based equivalents. The former Next.js content app is no longer part of this origin.

There are **two isolated environments on the same Cloudflare account**:

| | production | develop |
| --- | --- | --- |
| Branch | `main` | `develop` |
| Router worker | `fixmytext-router` | `develop-fixmytext-router` |
| Entry URL | `https://fixmytext-router.velobits.workers.dev` (custom domain later) | `https://develop-fixmytext-router.velobits.workers.dev` |
| Pages deployments | production track (bare `*.pages.dev`) | branch track (`develop.<project>.pages.dev`) |
| Build vars | GitHub environment `production` | GitHub environment `develop` |
| Runtime vars | `worker/wrangler.toml [vars]` | `worker/wrangler.toml [env.develop.vars]` |

Deployment model: **setup once in the UI; all deploys run through CI**
(`.github/workflows/deploy.yml` — gated on Frontend CI, ordered remotes → shell →
router, selective via `deployed/<env>/<app>` marker tags). Do **not** connect the
Cloudflare projects to the git repo — CI is the only deployer.

> Rollout plan, isolation model, and status: [`DEPLOYMENT_PLAN.md`](../DEPLOYMENT_PLAN.md)
> (repo root). This doc is the settings reference.

## Deployment targets

| App | CF project | Type | Deployed by |
| --- | --- | --- | --- |
| `apps/shell` | `fixmytext-shell` | Pages | CI → `npm run deploy:shell -- --branch <branch>` |
| `apps/editor-remote` | `fixmytext-editor-remote` | Pages | CI → `npm run deploy:editor -- --branch <branch>` |
| `apps/analytics-remote` | `fixmytext-analytics-remote` | Pages | CI → `npm run deploy:analytics -- --branch <branch>` |
| `worker/` | `fixmytext-router` / `develop-fixmytext-router` | Worker | CI → `wrangler deploy [--env develop]` |

`--branch main` lands on the project's production track; `--branch develop` creates a
branch deployment aliased at `develop.<project>.pages.dev`. The develop router worker is
created automatically by its first deploy — nothing to pre-create for develop.

## One-time setup

### Cloudflare (dashboard UI)

1. Note the `workers.dev` account subdomain and Account ID (Workers & Pages sidebar).
2. CI API token (profile → API Tokens → Custom token): Account → Cloudflare Pages →
   Edit; Account → Workers Scripts → Edit; Zone → Workers Routes → Edit (once a zone exists).
3. Create the three Pages projects via **Create application → Pages → Upload assets**
   (Direct Upload, placeholder file) — names must match the table exactly.
4. Per project, verify Settings → **Production branch = `main`**.

### GitHub (repo → Settings)

1. **Environments**: create `production` and `develop`. On `production`, set
   *Deployment branches → Selected branches → `main`* — the isolation lock.
2. **Secrets** (repo-level, shared): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
   `SENTRY_AUTH_TOKEN`, `SENTRY_DSN_FRONTEND`.
3. **Variables per environment** (same names, env-specific values):

   ```
   VITE_EDITOR_REMOTE_ENTRY    = https://<that-env's-router-host>/remotes/editor/remoteEntry.js
   VITE_ANALYTICS_REMOTE_ENTRY = https://<that-env's-router-host>/remotes/analytics/remoteEntry.js
   VITE_API_URL / VITE_KEYCLOAK_URL                  (per-env backend)
   VITE_KEYCLOAK_REALM         # ⚠ falls back to Velobits-Dev if unset — always set on production
   VITE_KEYCLOAK_CLIENT_ID / VITE_KEYCLOAK_ENABLED_PROVIDERS / VITE_SSO_DOMAIN_MAP
   SENTRY_ORG
   ```

   Vite bakes these at build time — after changing one, re-run the Deploy workflow for
   that branch (manual runs deploy everything by default, which is what you want here).
4. **Actions → Workflow permissions → Read and write** — the deploy marker tags
   (`deployed/<env>/<app>`) are pushed by the workflow. If tag rulesets are ever added,
   exempt `deployed/*` (these tags are force-moved by design).

### Runtime config (committed, `worker/wrangler.toml`)

Top-level `[vars]` = production router (bare `*.pages.dev` URLs);
`[env.develop]` + `[env.develop.vars]` = develop router (name
`develop-fixmytext-router`, `develop.*.pages.dev` URLs). Env blocks do not inherit —
every var is redeclared. An optional `CSP` var per env overrides the router's
`DEFAULT_CSP` (needed only if a backend moves off `*.velobits.dev`).

## Deploying

- Merge to `develop` / `main` → Frontend CI → on success, Deploy runs for that branch's
  environment, in dependency order, deploying **only apps whose inputs changed** since
  their `deployed/<env>/<app>` tag (own `apps/<app>/` dir + `packages/` + root manifests;
  `worker/` for the router).
- Manual: Actions → "Deploy (Cloudflare)" → Run workflow from the branch — deploys
  everything unless `only_changed` is ticked.
- Rollback: dashboard → the project/worker for that environment → Deployments →
  *Rollback* (pick the right track: production vs `develop` branch deployments); or
  re-run the workflow on a known-good SHA. `@velobits/app-core` is a pinned singleton —
  breaking bumps ship shell + remotes together.

Sourcemaps: the remote deploy scripts delete maps before upload (`sourcemap: 'hidden'`).
The shell's maps upload to Sentry and are deleted by the Sentry plugin — **only when
`SENTRY_AUTH_TOKEN` is set**; without Sentry, add a deletion step to `deploy:shell`.

## URL Routing

Per environment router (see `worker/src/index.ts`; mirrored locally by
`docker/nginx.router.*.conf` — when changing routing, update both and smoke-test on the
router's `workers.dev` URL):

| Path | Target | Notes |
| --- | --- | --- |
| `/remotes/editor/*` | editor Pages deployment | prefix stripped |
| `/remotes/analytics/*` | analytics Pages deployment | prefix stripped |
| `/app`, `/app/*` | — | 301 → root equivalent (legacy bookmarks); regex enforces segment boundary (`/appfoo` not redirected) |
| `/*` | shell Pages deployment | SPA fallback serves client routes |

## Module Federation URLs

Remote entries are served through the environment's router host, never directly from
`*.pages.dev` — same-origin loading means no CORS and `script-src 'self'` holds.
`remoteEntry.js` must never be long-cached (it points at the current hashed chunks); if
Cache Rules are added later, exclude `/remotes/*/remoteEntry.js`.

## Local Simulation

```bash
docker compose --profile dev up --build    # hot reload
docker compose --profile prod up --build   # built bundles behind nginx
```

Nothing under `docker/` ships to Cloudflare — nginx replicates the router locally.
See `docs/local-dev-docker.md` for details.
