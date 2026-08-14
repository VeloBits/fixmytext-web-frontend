# Local Development with Docker

> Run the full microfrontend stack locally with a single command.
> Docker Compose wires all four apps together behind an nginx router that replicates the Cloudflare topology.

---

## Prerequisites

### 1. Install Docker Desktop

Download from [docker.com](https://www.docker.com/products/docker-desktop/). Make sure the Docker daemon is running before proceeding.

### 2. Configure /etc/hosts

The OIDC auth flow (Keycloak) redirects to named subdomains. Add these entries once on your dev machine:

**macOS / Linux:**

```bash
sudo tee -a /etc/hosts <<EOF
127.0.0.1 auth-dev.velobits.dev
127.0.0.1 api-dev.velobits.dev
127.0.0.1 local-fixmytext.velobits.dev
EOF
```

**Windows (run PowerShell as Administrator):**

```powershell
Add-Content -Path "C:\Windows\System32\drivers\etc\hosts" -Value "`n127.0.0.1 auth-dev.velobits.dev`n127.0.0.1 api-dev.velobits.dev`n127.0.0.1 local-fixmytext.velobits.dev"
```

Without these entries, login will fail even though the app loads.

> **Never map `fixmytext.velobits.dev` or `develop-fixmytext.velobits.dev` to
> 127.0.0.1.** Those are the deployed production and develop origins; an
> `/etc/hosts` entry for either makes the real site unreachable from your
> machine. The local host is deliberately prefixed `local-`, which is reserved
> for loopback and never deployed. (If you added `develop-fixmytext.velobits.dev`
> before this change, remove that line.)

### 3. Create your env file

```bash
cp .env.docker.dev.example .env.docker.dev
```

Fill in any values specific to your setup (Sentry DSN, etc.). The defaults work for local dev with the standard Velobits dev infra.

---

## Starting the Stack

### Dev mode (hot reload)

```bash
docker compose --profile dev up --build
```

All four apps run as dev servers. Source changes reload instantly without rebuilding the image.

### Prod mode (Cloudflare simulation)

```bash
cp .env.docker.prod.example .env.docker.prod
docker compose --profile prod up --build
```

Vite apps are built and served by nginx. The content app is compiled with `@cloudflare/next-on-pages` and served via `wrangler pages dev`, which runs the Edge Worker runtime locally. This is slower to start but accurately simulates what runs on Cloudflare.

### Stopping

```bash
docker compose --profile dev down        # stop and remove containers
docker compose --profile dev down -v     # also remove volumes (full reset)
```

---

## URLs

All traffic enters through the nginx router on port **3100**. Each path prefix is routed to a specific container — if one container is down, only its paths are affected. Other services continue to work independently.

### Which frontend serves what

| URL pattern                     | Container              | Port | Framework    | What's here                                       |
| ------------------------------- | ---------------------- | ---- | ------------ | ------------------------------------------------- |
| `localhost:3100/`               | `shell-dev`            | 3104 | Vite + React | Editor surface (shell owns the origin root)       |
| `localhost:3100/dashboard`      | `shell-dev`            | 3104 | Vite + React | Analytics / dashboard                             |
| `localhost:3100/login`          | `shell-dev`            | 3104 | Vite + React | Login page                                        |
| `localhost:3101/remoteEntry.js` | `editor-remote-dev`    | 3101 | Vite + React | Editor MFE bundle (loaded by shell at runtime)    |
| `localhost:3102/remoteEntry.js` | `analytics-remote-dev` | 3102 | Vite + React | Analytics MFE bundle (loaded by shell at runtime) |

> **Content app (parked):** the Next.js content app (`content-dev`, :3103) is no longer routed through the router — the shell owns the whole origin. Its container still runs and is reachable directly at `localhost:3103` only.

> **MFE isolation:** Each container is independent. If `editor-remote-dev` is down, the shell falls back to its local copy of the editor page (the `.catch()` in App.tsx).

### Direct service ports (bypass the router)

Hit these to isolate a specific service without going through nginx — useful when debugging a single container.

| Direct URL              | Container              | Same as via router                  |
| ----------------------- | ---------------------- | ----------------------------------- |
| `http://localhost:3104` | `shell-dev`            | `localhost:3100/`                   |
| `http://localhost:3101` | `editor-remote-dev`    | `localhost:3100/remotes/editor/`    |
| `http://localhost:3102` | `analytics-remote-dev` | `localhost:3100/remotes/analytics/` |
| `http://localhost:3103` | `content-dev`          | — (not routed)                      |

> **Note:** When hitting direct ports, the shell still tries to load remotes from `localhost:3100/remotes/...` (baked into `.env.docker.dev`), so the router must also be running for module federation to work.

---

## How Routing Works

```
Browser → localhost:3100 (nginx router)
              │
              ├── /remotes/editor/*    → strips prefix → editor-remote-dev:3101
              ├── /remotes/analytics/* → strips prefix → analytics-remote-dev:3102
              └── /*                   → shell-dev:3104
```

This matches the Cloudflare Worker routing in `worker/src/index.ts` exactly — the same path rules, same prefix stripping. What works locally works on Cloudflare.

---

## Architecture at a Glance

| Service          | Package                      | Framework    | Container port | Profile    |
| ---------------- | ---------------------------- | ------------ | -------------- | ---------- |
| nginx router     | —                            | nginx        | 80 (→ host 3100) | dev + prod |
| shell            | `@velobits/shell`            | Vite + React | 3104           | dev + prod |
| editor-remote    | `@velobits/editor-remote`    | Vite + React | 3101           | dev + prod |
| analytics-remote | `@velobits/analytics-remote` | Vite + React | 3102           | dev + prod |
| content          | `@velobits/content-app`      | Next.js 15   | 3103           | dev + prod |

All three Vite apps resolve `@/` imports to `apps/shell/src` — the shell owns the source, and the remotes are thin build targets that share it without duplication.

---

## Verifying MFE Wiring

Open `http://localhost:3100/` in a browser, then open DevTools → Network tab → filter by `remoteEntry`. You should see two requests:

- `GET /remotes/editor/remoteEntry.js` → 200
- `GET /remotes/analytics/remoteEntry.js` → 200

If these 404 or fail, the editor/analytics containers aren't ready yet — give them another 10–15 seconds to finish compiling on first start.

---

## Common Issues

**Auth redirect loops / login fails**
Check your `/etc/hosts` entries. All three hostnames must resolve to `127.0.0.1`.

**Port already in use**
Something else is using 3100–3104. Stop the conflicting process or change the host ports in `docker-compose.yml`.

**Content app starts slowly**
Next.js compiles on first request in dev mode. The first load of any content page may take 5–10 seconds; subsequent loads are fast.

**`remoteEntry.js` returns 404 on first load**
The editor/analytics Vite servers need a moment to start. Refresh after 10–15 seconds.

**Prod profile content build fails**
The content app builds with `@opennextjs/cloudflare` (OpenNext). Check `apps/content/open-next.config.ts` and ensure `wrangler` is installed (`npm install`).
