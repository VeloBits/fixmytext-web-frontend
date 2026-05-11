# Contributing to FixMyText Frontend

Welcome, and thank you for considering contributing to the FixMyText frontend! Every contribution helps make text transformation tools more accessible to everyone.

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md) before participating.

---

## Prerequisites

- **Node.js** 18+ and **npm**
- **Git**
- **Backend** running at `http://localhost:8000` (see the backend repo for setup instructions)

## Getting Started

1. **Fork** this repository on GitHub.
2. **Clone** your fork:
   ```bash
   git clone https://github.com/<your-username>/fixmytext-frontend.git
   cd fixmytext-frontend
   ```
3. **Install dependencies:**
   ```bash
   npm install
   ```
4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
5. **Start the dev server:**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

### Docker Option

If you prefer Docker, run the dev profile:

```bash
docker compose --profile dev up --build
```

---

## Branch Naming

Use a prefix that describes the type of change, followed by a short kebab-case description:

| Prefix      | Purpose                        | Example                        |
|-------------|--------------------------------|--------------------------------|
| `feat/`     | New feature                    | `feat/tool-search-highlight`   |
| `fix/`      | Bug fix                        | `fix/dark-mode-toggle`         |
| `docs/`     | Documentation only             | `docs/add-api-reference`       |
| `refactor/` | Code restructuring             | `refactor/extract-export-hook` |
| `test/`     | Adding or updating tests       | `test/tool-definition-schema`  |
| `chore/`    | Tooling, CI, deps, config      | `chore/upgrade-vite-7`         |

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>
```

**Frontend examples:**

```
feat(tools): add reverse-words tool definition
fix(auth): handle expired refresh token redirect
refactor(hooks): extract useExportPDF from TextForm
docs(readme): add dark mode screenshot
chore(deps): upgrade framer-motion to 12.x
```

---

## Coding Standards (JavaScript / React)

### Formatting and Linting

- **Prettier** for formatting. Run `npx prettier --check .` before committing.
- **ESLint** for linting. Run `npx eslint .` to catch issues.

### React Conventions

- **Functional components only** -- no class components.
- **Custom hooks** live in `src/hooks/` for any reusable logic.
- Keep components **under 300 lines**; extract logic into hooks when they grow.

### State and Data Fetching

- **RTK Query** for all API calls -- never use raw `fetch` or `axios`.
- **State mutations** only through Redux slices (never mutate state directly).

### Styling

- CSS files live in `src/assets/css/` and should match the component name (e.g., `TextForm.css` for `TextForm.jsx`).

### General Rules

- No `console.log` in production code (remove or guard behind `import.meta.env.DEV`).
- No hardcoded API URLs -- always use `VITE_API_URL` from environment variables.
- Use the **Framer Motion variants pattern** for animations (define `variants` objects, apply via `initial`, `animate`, `exit`).
- Use **`useAlert`** for all user-facing notifications.

---

## How to Add a New Tool (Frontend Side)

Adding a tool to the frontend is a data-driven process. The UI renders tools dynamically from `src/constants/tools.js`.

### Step 1: Define the Tool

Open `src/constants/tools.js` and add a new object to the tools array:

```javascript
{
  id: 'reverse_words',
  label: 'Reverse Words',
  description: 'Reverses the order of words on each line',
  icon: 'icon-refresh',
  color: 'purple',
  group: 'lines',
  tabs: ['transform'],
  type: 'api',
  endpoint: '/api/v1/text/reverse-words',
  successMsg: 'Words reversed!',
  keywords: ['flip', 'invert', 'word', 'order']
}
```

### Field Reference

| Field        | Type       | Required | Description                                                      |
|--------------|------------|----------|------------------------------------------------------------------|
| `id`         | `string`   | Yes      | Unique snake_case identifier                                     |
| `label`      | `string`   | Yes      | Display name shown in the UI                                     |
| `description`| `string`   | Yes      | Short description shown under the tool name                      |
| `icon`       | `string`   | Yes      | CSS icon class for the tool card                                 |
| `color`      | `string`   | Yes      | Theme color for the tool card (e.g., `purple`, `blue`, `green`)  |
| `group`      | `string`   | Yes      | Category group (see list below)                                  |
| `tabs`       | `string[]` | Yes      | Which UI tabs display this tool (e.g., `transform`, `analyze`)   |
| `type`       | `string`   | Yes      | Execution type (see list below)                                  |
| `endpoint`   | `string`   | For api/ai| Backend API route this tool calls                                |
| `successMsg` | `string`   | Yes      | Toast message shown on success                                   |
| `keywords`   | `string[]` | Yes      | Search keywords for discoverability                              |

**Available groups:** `case`, `cleanup`, `encoding`, `lines`, `ciphers`, `developer`, `ai_writing`, `ai_content`, `language`, `generate`, `utility`, `hashing`, `compare`, `escaping`

**Available types:**

| Type     | Description                                        |
|----------|----------------------------------------------------|
| `api`    | Calls a backend REST endpoint                      |
| `ai`     | Calls an AI-powered backend endpoint               |
| `local`  | Runs entirely in the browser (no backend needed)   |
| `select` | Presents a selection UI before processing          |
| `action` | Triggers a specific UI action                      |
| `drawer` | Opens a drawer with additional options             |

### Step 2: Verify the Endpoint

Make sure the `endpoint` value matches the backend route exactly. For example, if the backend registers the route as `/api/v1/text/reverse-words`, the frontend `endpoint` must be `'/api/v1/text/reverse-words'`.

### Step 3: Test

1. Run `npm run dev`.
2. Search for your tool by name or keyword in the UI.
3. Verify it appears in the correct category.
4. Click the tool, enter sample text, and confirm it calls the backend and returns results.

> **Note:** The backend endpoint must exist first. See the backend repo's `CONTRIBUTING.md` for instructions on adding the backend side.

---

## End-to-End Tests (Playwright)

E2E specs live in `frontend/e2e/` and run against the full dev compose stack (frontend + backend + Postgres). The same workflow runs in CI — see [.github/workflows/ci.yml](../.github/workflows/ci.yml).

### What the specs cover

| Spec | Flow |
|---|---|
| `01-signup-verify-login.spec.js` | UI signup → email-verify via `?token=` link → UI login |
| `02-local-tool.spec.js` | MD5 (client-side) transformation |
| `03-ai-tool.spec.js` | Summarize tool with mocked Groq (`AI_BACKEND=fake`) |
| `04-purchase-pass.spec.js` | Pass purchase via signed Razorpay verify (`PAYMENTS_BACKEND=fake`) |
| `05-share-result.spec.js` | Share button → open `/share/:id` |

### Required backend env

The backend must run with these E2E seams enabled. Add to `backend/.env`:

```
EMAIL_BACKEND=console            # echoes verification tokens in API responses
AI_BACKEND=fake                  # short-circuits Groq with a deterministic stub
PAYMENTS_BACKEND=fake            # in-memory order store, HMAC-only signature check
RAZORPAY_KEY_ID=rzp_test_fake
RAZORPAY_KEY_SECRET=fake_secret_for_e2e
COOKIE_SECURE=false
DEBUG=true
SECRET_KEY=ci_e2e_jwt_secret_not_for_production_use_only
```

### Running locally

```bash
# 1. Start the backend dev stack (Postgres + FastAPI with hot reload)
cd backend
docker compose --profile dev up -d --build

# 2. Start the frontend dev stack
cd ../frontend
docker compose --profile dev up -d --build

# 3. Install Playwright + browser (one-time)
npm install
npm run test:e2e:install

# 4. Run the specs
E2E_RAZORPAY_KEY_SECRET=fake_secret_for_e2e npm run test:e2e

# Optional: headed / debug
npx playwright test --headed
npx playwright test --debug
npx playwright test e2e/02-local-tool.spec.js   # single spec
```

`E2E_RAZORPAY_KEY_SECRET` must match the backend's `RAZORPAY_KEY_SECRET` — spec 04 signs a fake payment with it.

### Useful env overrides

| Variable | Default | Purpose |
|---|---|---|
| `E2E_FRONTEND_URL` | `http://localhost:3000` | Where Playwright points the browser |
| `E2E_API_URL` | `http://localhost:8000` | Where helpers send direct API calls |
| `E2E_RAZORPAY_KEY_SECRET` | `fake_secret_for_e2e` | HMAC secret for the signed-verify spec |

### Artifacts

- HTML report: `frontend/playwright-report/` (open with `npx playwright show-report`)
- Failure traces / screenshots / video: `frontend/test-results/`

Both are gitignored. In CI the report is uploaded as the `playwright-report` artifact on every run.

### Tear-down

```bash
docker compose -f frontend/docker-compose.yml --profile dev down -v
docker compose -f backend/docker-compose.yml --profile dev down -v
```

---

## API Type Contract (OpenAPI → TypeScript)

The frontend ships generated TS types derived from the backend's FastAPI OpenAPI schema. Two files are committed and kept in lockstep:

- [backend/openapi.json](../backend/openapi.json) — dumped from `app.openapi()`.
- [frontend/src/types/openapi.d.ts](src/types/openapi.d.ts) — generated by `openapi-typescript` from the JSON.

CI's `contract-types` job ([.github/workflows/ci.yml](../.github/workflows/ci.yml)) re-runs both generators and `git diff --exit-code`s the result. Any drift between the live FastAPI app and the committed types fails the build.

### Regenerate after a backend API change

```bash
# 1. Dump the live OpenAPI schema. SECRET_KEY/DATABASE_URL are required by
#    pydantic-settings even though openapi() never uses them — any values are fine.
cd backend
SECRET_KEY=dev DATABASE_URL=postgresql+asyncpg://x:x@localhost/x \
  python scripts/dump_openapi.py openapi.json

# 2. Regenerate the TS types.
cd ../frontend
npm run gen:types

# 3. Commit both.
git add backend/openapi.json frontend/src/types/openapi.d.ts
git commit -m "chore: regen API types"
```

If CI fails with "API contract drift detected," run those three steps on the branch and push.

### Bootstrap (first time only)

The committed files don't exist yet on `main`. The first person to land a backend API change after this job is added should run the regen workflow above and commit the result; from that point on the diff check enforces drift detection.

---

## Pull Request Guidelines

Before opening a PR, make sure:

- [ ] Your branch is up to date with `main`.
- [ ] `npm run dev` starts without errors.
- [ ] No ESLint warnings or Prettier violations.
- [ ] No `console.log` statements left in code.
- [ ] New tool definitions include all required fields.
- [ ] API endpoints match the backend routes.
- [ ] The UI works in both dark and light mode.
- [ ] Components are under 300 lines.

### PR Checklist (include in your PR description)

```markdown
- [ ] Tested locally with the backend running
- [ ] No console warnings or errors
- [ ] Works in both dark and light mode
- [ ] Responsive on mobile viewports
- [ ] Followed conventional commit messages
```

## Review Process

1. Open a PR against `main` with a clear title and description.
2. A maintainer will review your code, usually within a few days.
3. Address any requested changes by pushing new commits (do not force-push).
4. Once approved, a maintainer will merge your PR.

## Reporting Issues

- Use the GitHub Issues tab to report bugs or request features.
- Include steps to reproduce, expected behavior, and actual behavior.
- Screenshots or screen recordings are very helpful.
- Tag issues with appropriate labels (`bug`, `enhancement`, `good first issue`, etc.).

---

Thank you for helping improve FixMyText!
