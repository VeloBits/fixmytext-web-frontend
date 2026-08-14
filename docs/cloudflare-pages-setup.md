# Cloudflare Deployment Setup Guide

## Overview

Three Vite apps deploy as **Cloudflare Pages** projects; the Next.js content app
deploys as a **Worker** (via OpenNext); a **router Worker** fronts everything as a
single origin, applying path routing, bot detection, and the security headers/CSP.
The shell owns the origin root (built with base `/`); `/app*` URLs are legacy and
301-redirect to their root-based equivalents. The content app serves SSR/SEO pages —
always for paths the shell doesn't have (`/tools*`, sitemap, robots), and via
**dynamic rendering** (bots only) where the shell has in-app pages.

Everything is hosted on the **`velobits.dev`** zone. Naming rule: a service's
Cloudflare project name *is* its hostname label, and the develop copy of every
service is the production name prefixed with `develop-`.

| Service | production | develop |
| --- | --- | --- |
| Router (public origin) | `fixmytext.velobits.dev` | `develop-fixmytext.velobits.dev` |
| Shell (Pages) | `fixmytext-shell.velobits.dev` | `develop-fixmytext-shell.velobits.dev` |
| Editor remote (Pages) | `fixmytext-editor-remote.velobits.dev` | `develop-fixmytext-editor-remote.velobits.dev` |
| Analytics remote (Pages) | `fixmytext-analytics-remote.velobits.dev` | `develop-fixmytext-analytics-remote.velobits.dev` |
| Content (Worker) | `fixmytext-content.velobits.dev` | `develop-fixmytext-content.velobits.dev` |

Every label is a **single level** under `velobits.dev`, so Cloudflare's Universal
SSL cert (`*.velobits.dev`) covers all of them — no Advanced Certificate needed.

**The router is the only hostname users and search engines should see.** The other
five are addressable for debugging and direct verification; canonical/OG URLs are
built from `NEXT_PUBLIC_SITE_URL`, which always points at the router origin.

## Two isolated environments, one account

| | production | develop |
| --- | --- | --- |
| Branch | `main` | `develop` |
| Public origin | `https://fixmytext.velobits.dev` | `https://develop-fixmytext.velobits.dev` |
| Pages projects | `fixmytext-shell`, `fixmytext-editor-remote`, `fixmytext-analytics-remote` | `develop-fixmytext-shell`, `develop-fixmytext-editor-remote`, `develop-fixmytext-analytics-remote` |
| Workers | `fixmytext-router`, `fixmytext-content` | `develop-fixmytext-router`, `develop-fixmytext-content` |
| Build vars | GitHub environment `production` | GitHub environment `develop` |
| Runtime vars | `worker/wrangler.toml [vars]` | `worker/wrangler.toml [env.develop.vars]` |

**Why develop has its own Pages projects.** A Pages custom domain can only ever
serve a project's *production* branch — there is no way to point
`develop-fixmytext-shell.velobits.dev` at the `develop` branch alias of the
`fixmytext-shell` project. So each environment gets its own project and both
deploy to their own production branch (`--branch main`). The environment is
selected by **`--project-name`** (Pages) and **`--env`** (Workers), never by the
branch — which also means a wrong `--branch` can no longer clobber production.

Deployment model: **setup once in the UI; all deploys run through CI**
(`.github/workflows/deploy.yml` — gated on Frontend CI, ordered remotes → shell →
router, selective via `deployed/<env>/<app>` marker tags). Do **not** connect the
Cloudflare projects to the git repo — CI is the only deployer.

## Deployment targets

| App | CF project (prod / develop) | Type | Deployed by |
| --- | --- | --- | --- |
| `apps/shell` | `fixmytext-shell` / `develop-fixmytext-shell` | Pages | CI → `npm run deploy:shell` |
| `apps/editor-remote` | `fixmytext-editor-remote` / `develop-…` | Pages | CI → `npm run deploy:editor` |
| `apps/analytics-remote` | `fixmytext-analytics-remote` / `develop-…` | Pages | CI → `npm run deploy:analytics` |
| `apps/content` | `fixmytext-content` / `develop-fixmytext-content` | Worker (OpenNext) | CI → `npm run deploy:content -- [--env develop]` |
| `worker/` | `fixmytext-router` / `develop-fixmytext-router` | Worker | CI → `wrangler deploy [--env develop]` |

The three `deploy:*` Pages scripts read the project name from
`CF_PAGES_PROJECT_SHELL` / `_EDITOR` / `_ANALYTICS`, defaulting to the production
name when unset. CI sets them per environment. (These scripts are POSIX-shell
only — like `deploy:editor`/`deploy:analytics` already were, they are meant to run
in CI or from bash/WSL, not `cmd.exe`.)

## Custom domains are declared in code, not the dashboard

Both wrangler configs declare their hostnames with `custom_domain = true`:

```toml
# worker/wrangler.toml
[[routes]]
pattern = "fixmytext.velobits.dev"
custom_domain = true

[[env.develop.routes]]
pattern = "develop-fixmytext.velobits.dev"
custom_domain = true
```

`apps/content/wrangler.toml` does the same for
`fixmytext-content.velobits.dev` / `develop-fixmytext-content.velobits.dev`.

Wrangler creates the proxied DNS record **and** binds the hostname on every
deploy, so there is no manual DNS step for the four Workers — but the CI API token
must carry the extra zone permissions (see below). A Custom Domain claims the
whole hostname (all paths); the pattern must be a bare hostname with no path or
wildcard.

The three **Pages** custom domains are not expressible in `wrangler.toml` — add
them once per project in the dashboard (below).

## One-time setup

### Cloudflare (dashboard UI)

1. Confirm `velobits.dev` is an active zone on the account, and note the
   `workers.dev` account subdomain + Account ID (Workers & Pages sidebar).
2. **CI API token** (profile → API Tokens → Custom token):
   - Account → Cloudflare Pages → **Edit**
   - Account → Workers Scripts → **Edit**
   - Zone → Workers Routes → **Edit** (zone: `velobits.dev`)
   - Zone → **DNS → Edit** (zone: `velobits.dev`) ← *new: required by
     `custom_domain = true`, which creates the DNS records*
   - Zone → Zone → **Read** (zone: `velobits.dev`)
3. Create **six** Pages projects via **Create application → Pages → Upload assets**
   (Direct Upload, placeholder file) — names must match the table exactly:
   `fixmytext-shell`, `fixmytext-editor-remote`, `fixmytext-analytics-remote`,
   `develop-fixmytext-shell`, `develop-fixmytext-editor-remote`,
   `develop-fixmytext-analytics-remote`.
4. Per project, verify Settings → **Production branch = `main`** (all six,
   including the `develop-*` ones — they deploy develop code to *their own*
   production branch).
5. Per project, Custom domains → **Set up a custom domain** →
   `<project-name>.velobits.dev`. Cloudflare adds the CNAME automatically.
6. The four Workers need nothing here — their first deploy creates the worker and
   attaches its custom domain.

### GitHub (repo → Settings)

1. **Environments**: create `production` and `develop`. On `production`, set
   *Deployment branches → Selected branches → `main`* — the isolation lock.
2. **Secrets** (repo-level, shared): `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`,
   `SENTRY_AUTH_TOKEN`, `SENTRY_DSN_FRONTEND`.
3. **Variables per environment** (same names, env-specific values) — see the
   table in the next section for the exact values.
4. **Actions → Workflow permissions → Read and write** — the deploy marker tags
   (`deployed/<env>/<app>`) are pushed by the workflow. If tag rulesets are ever added,
   exempt `deployed/*` (these tags are force-moved by design).

## Environment variables

### GitHub environment variables (build-time — Vite/Next bake these in)

Set on **both** environments with the values below. Vite bakes these at build
time, so after changing one you must re-run the Deploy workflow for that branch
(manual runs deploy everything by default, which is what you want here).

| Variable | `production` | `develop` |
| --- | --- | --- |
| `VITE_EDITOR_REMOTE_ENTRY` | `https://fixmytext.velobits.dev/remotes/editor/remoteEntry.js` | `https://develop-fixmytext.velobits.dev/remotes/editor/remoteEntry.js` |
| `VITE_ANALYTICS_REMOTE_ENTRY` | `https://fixmytext.velobits.dev/remotes/analytics/remoteEntry.js` | `https://develop-fixmytext.velobits.dev/remotes/analytics/remoteEntry.js` |
| `NEXT_PUBLIC_SITE_URL` | `https://fixmytext.velobits.dev` | `https://develop-fixmytext.velobits.dev` |
| `VITE_API_URL` | `https://api.velobits.dev` | `https://api-dev.velobits.dev` |
| `VITE_KEYCLOAK_URL` | `https://auth.velobits.dev` | `https://auth-dev.velobits.dev` |
| `VITE_KEYCLOAK_REALM` | `Velobits` | `Velobits` |
| `VITE_KEYCLOAK_CLIENT_ID` | `fixmytext` | `develop-fixmytext` |
| `VITE_KEYCLOAK_ENABLED_PROVIDERS` | `google,github` | `google,github` |
| `VITE_SSO_DOMAIN_MAP` | *(empty unless SSO tenants exist)* | *(empty)* |
| `SENTRY_ORG` | `velobits-lb` | `velobits-lb` |

⚠ `VITE_KEYCLOAK_REALM` **must** be set explicitly on `production` — `app-core`
silently falls back to the dev realm when it is unset
([keycloakConfig.ts](../packages/app-core/src/auth/keycloakConfig.ts)).

The remote-entry URLs point at the environment's **router**, never at the remotes'
own hostnames — same-origin loading is what keeps `script-src 'self'` valid and
avoids CORS.

`VITE_API_URL` / `VITE_KEYCLOAK_URL` above assume the backend lands on
`api[-dev].velobits.dev` and `auth[-dev].velobits.dev`. Adjust to match the actual
backend hostnames; as long as they stay under `*.velobits.dev`, the router's
`DEFAULT_CSP` already permits them (`connect-src`/`frame-src`/`form-action`
allow `https://*.velobits.dev`). If a backend ever moves off the zone, set a `CSP`
var on the router env instead of editing the default.

### Worker runtime vars (committed — `worker/wrangler.toml`)

Top-level `[vars]` = production router; `[env.develop.vars]` = develop router. Env
blocks do not inherit, so every var is redeclared. These are the router's internal
fetch targets and deliberately stay on `*.pages.dev`: users never see them, and a
same-zone Worker→Pages subrequest is the one hop not worth betting the origin on.
Each Pages project also has its `velobits.dev` custom domain — once you've
confirmed those serve correctly, swapping these four values over is a one-line
change per env.

| Var | production | develop |
| --- | --- | --- |
| `SHELL_PAGES_URL` | `https://fixmytext-shell.pages.dev` | `https://develop-fixmytext-shell.pages.dev` |
| `EDITOR_PAGES_URL` | `https://fixmytext-editor-remote.pages.dev` | `https://develop-fixmytext-editor-remote.pages.dev` |
| `ANALYTICS_PAGES_URL` | `https://fixmytext-analytics-remote.pages.dev` | `https://develop-fixmytext-analytics-remote.pages.dev` |
| `CONTENT_URL` | `https://fixmytext-content.velobits.dev` | `https://develop-fixmytext-content.velobits.dev` |

Note the develop URLs are **bare** `*.pages.dev` hostnames, not
`develop.<project>.pages.dev` branch aliases — develop has its own projects now.

Each env also declares a `CONTENT` **service binding** to its content worker
(`[[services]]` / `[[env.develop.services]]`) — same-account worker→worker fetches
over `workers.dev` are blocked, so the binding is mandatory in the cloud.
`CONTENT_URL` is only the local-dev (`wrangler dev`) plain-fetch fallback.

### Worker secrets (dashboard → the worker → Settings → Variables, type *Secret*)

Secrets are per-worker and survive deploys; plaintext vars set in the dashboard do
not. Set on **both** content workers:

| Secret | Where | Value |
| --- | --- | --- |
| `AUTH_SECRET` | `fixmytext-content`, `develop-fixmytext-content` | `openssl rand -base64 32` (different per env) |
| `COOKIE_SECRET` | same | that environment's backend `SESSION_COOKIE_SECRET` (once backends exist) |

### Local `.env`

Local dev keeps its own hostname, `local-fixmytext.velobits.dev`. It must stay a
`*.velobits.dev` name (Keycloak redirect URIs + the `.velobits.dev`-scoped SSO
cookie), but it must **not** be one of the deployed names — an `/etc/hosts` entry
for `fixmytext.velobits.dev` or `develop-fixmytext.velobits.dev` would make the
real site unreachable from your machine. See
[`local-dev-docker.md`](./local-dev-docker.md) and [`.env.example`](../.env.example).

Keycloak needs a valid redirect URI + web origin for
`http://local-fixmytext.velobits.dev:3100` on the `local-velobits` client, and for
each deployed origin on its respective client.

## Deploying

- **develop (auto):** merge to `develop` → Frontend CI → on success, Deploy runs for the
  develop environment, in dependency order, deploying **only apps whose inputs changed**
  since their `deployed/develop/<app>` tag (own `apps/<app>/` dir + `packages/` + root
  manifests; `worker/` for the router).
- **production (manual-only):** merging to `main` deploys nothing. Release via Actions →
  "Deploy (Cloudflare)" → Run workflow from `main` — deploys everything unless
  `only_changed` is ticked. Branch protection keeps main CI-green.
- Rollback: dashboard → the project/worker **for that environment** → Deployments →
  *Rollback*; or re-run the workflow on a known-good SHA. `@velobits/app-core` is a
  pinned singleton — breaking bumps ship shell + remotes together.

Sourcemaps: the remote deploy scripts delete maps before upload (`sourcemap: 'hidden'`).
The shell's maps upload to Sentry and are deleted by the Sentry plugin — **only when
`SENTRY_AUTH_TOKEN` is set**; without Sentry, add a deletion step to `deploy:shell`.

## URL Routing

Per environment router (see `worker/src/index.ts`; mirrored locally by
`docker/nginx.router.*.conf` — when changing routing, update both and smoke-test on the
router's custom domain):

| Path | Target | Notes |
| --- | --- | --- |
| `/remotes/editor/*` | editor Pages deployment | prefix stripped |
| `/remotes/analytics/*` | analytics Pages deployment | prefix stripped |
| `/app`, `/app/*` | — | 301 → root equivalent (legacy bookmarks); regex enforces segment boundary (`/appfoo` not redirected) |
| `/tools`, `/tools/*`, `/sitemap.xml`, `/robots.txt` | content Worker (service binding) | always — SSR/SEO, no shell equivalent |
| `/about`, `/pricing`, `/share/*` — bots only | content Worker (service binding) | dynamic rendering: crawlers/link-preview scrapers get SSR + OG cards; humans get the shell's in-app pages. `/` excluded (content root redirects to `/app` — would loop) |
| `/*` | shell Pages deployment | SPA fallback serves client routes |

## Module Federation URLs

Remote entries are served through the environment's router host, never directly from
the remotes' own hostnames — same-origin loading means no CORS and `script-src 'self'`
holds. `remoteEntry.js` must never be long-cached (it points at the current hashed
chunks); if Cache Rules are added later, exclude `/remotes/*/remoteEntry.js`.

## Post-deploy verification

```bash
ENV_HOST=develop-fixmytext.velobits.dev   # or fixmytext.velobits.dev

curl -sI  "https://$ENV_HOST/"                      # 200, CSP + HSTS present
curl -s   "https://$ENV_HOST/robots.txt"            # content worker via binding
curl -sI  "https://$ENV_HOST/remotes/editor/remoteEntry.js"   # 200, JS
curl -sI  "https://$ENV_HOST/app/settings"          # 301 → /settings
curl -s -A googlebot "https://$ENV_HOST/pricing" | grep -o '<title>.*</title>'   # SSR
```

A `500 Router misconfigured: CONTENT service binding is missing` on `/robots.txt`
means the router deployed without its `CONTENT` binding — redeploy the router for
that env *after* its content worker exists.

## Local Simulation

```bash
docker compose --profile dev up --build    # hot reload
docker compose --profile prod up --build   # built bundles behind nginx
```

Nothing under `docker/` ships to Cloudflare — nginx replicates the router locally.
See `docs/local-dev-docker.md` for details.
