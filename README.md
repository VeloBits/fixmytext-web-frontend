# FixMyText — Frontend

> React + Vite frontend for the FixMyText text manipulation platform.

## Prerequisites

- Node.js 18+
- npm or yarn
- Backend running at http://localhost:8000 (see [backend README](../backend/README.md))

## Setup

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:3000

**With Docker:**
```bash
cd frontend
cp .env.example .env
docker compose --profile dev up --build
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | Yes | `http://localhost:8000` | Backend API base URL |

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 3000 with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run Playwright end-to-end tests |
| `npm run test:e2e:install` | Install Playwright browser (Chromium) |
| `npm run gen:types` | Regenerate TypeScript types from `backend/openapi.json` |

## Tech Stack

- **React 18.2** + React Router v6
- **Vite 6.2** — build tool with HMR
- **Redux Toolkit** + RTK Query — state management and API calls
- **Framer Motion** — animations and transitions
- **jsPDF** + **docx** — PDF and DOCX export
- **CSS Modules** — scoped component styles

## Project Structure

```
src/
├── pages/                      # Route-level page components
│   ├── Home.jsx                # Main text editor (TextForm)
│   ├── LoginPage.jsx           # User login
│   ├── SignupPage.jsx          # User registration
│   ├── DashboardPage.jsx       # Stats, history, subscriptions
│   ├── PricingPage.jsx         # Plans and passes
│   ├── SharePage.jsx           # View shared results
│   └── AboutPage.jsx           # Project info
│
├── components/
│   ├── editor/                 # Main text editor UI (TextForm)
│   ├── layout/                 # Navbar, Alert, ErrorBoundary, OnboardingModal, CommandPalette
│   ├── drawers/                # Tool-specific panels (CipherDrawer, LineToolsDrawer, DevToolsDrawer...)
│   ├── gamification/           # XP display, streak counter, achievement badges
│   └── subscription/           # PassPurchaseModal, upgrade prompts
│
├── store/
│   ├── api/                    # RTK Query API slices
│   │   ├── baseQuery.js        # Base query with auto JWT refresh
│   │   ├── textApi.js          # Text transformation endpoints
│   │   ├── authApi.js          # Auth endpoints
│   │   ├── userDataApi.js      # User profile & settings
│   │   ├── historyApi.js       # Operation history
│   │   ├── subscriptionApi.js  # Billing endpoints
│   │   ├── passApi.js          # Prepaid passes
│   │   └── shareApi.js         # Shareable links
│   ├── slices/                 # Redux state slices (auth)
│   └── middleware/             # Error handling middleware
│
├── hooks/                      # 24+ custom hooks (see reference below)
│
├── constants/
│   ├── tools.js                # All 254 tool definitions
│   ├── endpoints.js            # API endpoint path constants
│   └── routes.js               # Frontend route constants
│
├── assets/
│   └── css/                    # CSS modules per feature/component
│
└── utils/                      # Formatting, validation, helper functions
```

## Routing

| Route | Component | Auth Required | Description |
|-------|-----------|---------------|-------------|
| `/` | Home | No | Main text editor with tool search |
| `/about` | AboutPage | No | Project information |
| `/login` | LoginPage | No | Login (redirects if already logged in) |
| `/signup` | SignupPage | No | Registration (redirects if already logged in) |
| `/pricing` | PricingPage | No | Plans, passes, pricing |
| `/dashboard` | DashboardPage | Yes | User stats, history, settings |
| `/share/:id` | SharePage | No | View a shared result |

## Custom Hooks

| Hook | Purpose |
|------|---------|
| `useAuth` | Login, logout, register, current user state |
| `useTransformText` | RTK Query mutation for text transformation tools |
| `useHistory` | Operation history (fetch, clear, paginate) |
| `useGamification` | XP, streaks, achievements, daily quests |
| `useSubscription` | Billing tier, active passes, upgrade logic |
| `useTheme` | Dark/light mode toggle with persistence |
| `useAlert` | Show/dismiss toast notifications |
| `useToolSearch` | Filter tools by query string and category |
| `useExport` | Export result to PDF or DOCX |
| `useRegexTester` | Live regex pattern testing |
| `useFormatter` | JSON/CSV/XML pretty-printing |
| `useTextCompare` | Side-by-side text diff viewer |
| `useSpeech` | Text-to-speech playback |
| `useKeyboardShortcuts` | Register/unregister keyboard shortcuts |
| `usePipeline` | Chain multiple tools sequentially |
| `useFindReplace` | Find and replace in text |
| `useWordFrequency` | Word frequency analysis |
| `useTrialLimit` | Track and enforce free-tier usage limits |
| `usePasses` | Prepaid pass balance and consumption |
| `useAiTools` | AI-specific tool handling and state |
| `useGenerators` | Text generator tools |
| `useSmartSuggestions` | Context-aware tool recommendations |
| `useFingerprint` | Visitor fingerprinting for anonymous trial |
| `useTemplates` | Saved operation templates |

## Tool Definition Schema

Every tool in `src/constants/tools.js` follows this shape:

```javascript
{
  id: 'reverse_words',                         // Unique snake_case identifier
  label: 'Reverse Words',                       // Display name in UI
  description: 'Reverses word order per line',  // Tooltip + search index
  icon: 'icon-refresh',                         // Icon key
  color: 'purple',                              // Theme color for card
  group: 'lines',                               // Category (one of 14 groups)
  tabs: ['transform'],                          // Tab visibility
  type: 'api',                                  // api | ai | local | select | action | drawer
  endpoint: '/api/v1/text/reverse-words',       // Must match backend route exactly
  successMsg: 'Words reversed!',                // Toast on success
  keywords: ['flip', 'invert', 'order']         // Extra search terms
}
```

**Available groups:** `case`, `cleanup`, `encoding`, `lines`, `ciphers`, `developer`, `ai_writing`, `ai_content`, `language`, `generate`, `utility`, `hashing`, `compare`, `escaping`

See [Adding a Tool](../docs/adding-a-tool.md) for the complete guide.

## State Management

- **RTK Query** handles all API calls with automatic caching, deduplication, and re-fetch
- **Auth slice** stores login state and user info (persisted to localStorage)
- **Base query** includes JWT auto-refresh: 401 errors trigger token refresh via the httpOnly cookie, then retry the original request
- **Error middleware** surfaces API errors as user-visible alerts via `useAlert`

## Component Guidelines

- Functional components only — no class components
- Co-locate CSS in `src/assets/css/` with matching filename (e.g., `Dashboard.css`)
- Use `useAlert` for notifications, not `console.log` or `window.alert`
- All API calls via RTK Query mutations — never use raw `fetch` or `axios`
- Use Framer Motion `variants` pattern for animations
- Keep components under 300 lines — extract logic to custom hooks
- Handle loading and error states from RTK Query hooks

## Accessibility

We enforce a per-component a11y baseline using [axe-core](https://github.com/dequelabs/axe-core).

### Two checkpoints

1. **Dev runtime** — `src/index.jsx` dynamically imports `@axe-core/react` when `import.meta.env.DEV` is true. Violations stream to the browser console as you click around. Zero runtime cost in production (the import is tree-shaken).
2. **Unit tests** — every component test in the baseline calls `expectNoA11yViolations(container)` (helper at [src/test/axeHelper.js](src/test/axeHelper.js)). CI fails on new violations.

### Baseline scope

The following components have a passing `it('has no axe violations', …)` test and must stay clean:

| Component | Test file |
|---|---|
| `Navbar` | `src/components/layout/Navbar.test.jsx` |
| `TextForm` | `src/components/editor/TextForm.test.jsx` |
| `OutputPanel` | `src/components/editor/OutputPanel.test.jsx` |
| `PricingPage` | `src/pages/PricingPage.test.jsx` |
| `LoginPage` | `src/pages/LoginPage.test.jsx` |
| `SignupPage` | `src/pages/SignupPage.test.jsx` |

There is no `Sidebar` component in the codebase; the equivalent navigation rail lives inside `TextForm` and is covered by that test.

### Rules disabled in unit tests

The helper turns off two axe rules in jsdom that would produce false positives:

- **`color-contrast`** — jsdom can't compute laid-out colors. Contrast is checked at runtime via `@axe-core/react` in a real browser instead.
- **`region`** — landmark regions are an App-level concern; component-scoped tests don't render `<main>` / `<nav>` wrappers.

If a test legitimately needs one of these on, pass an override: `expectNoA11yViolations(container, { region: { enabled: true } })`.

### Adding axe to a new component test

```js
import { expectNoA11yViolations } from '../test/axeHelper';

it('has no axe violations', async () => {
  const { container } = render(<MyComponent {...defaultProps} />);
  await expectNoA11yViolations(container);
});
```

### Baseline status

All six baseline components pass their axe assertions. New violations should be fixed at the markup level — do not relax the helper's rule list or skip the assertions.
