# Lint & Format Guide (Frontend)

> How to check and fix linting and formatting issues in the FixMyText frontend.

All commands must be run from the `frontend/` directory.

The frontend uses [ESLint](https://eslint.org/) for linting and [Prettier](https://prettier.io/) for formatting. They serve different purposes:

- **ESLint** — catches code quality issues (unused variables, React hook rules, etc.)
- **Prettier** — enforces consistent code style (quotes, semicolons, indentation)

---

## Configuration

**ESLint** — `eslint.config.js`:

- Rules: `@eslint/js` recommended + `react` + `react-hooks` plugins
- `react/prop-types` and `react/display-name` are disabled

**Prettier** — `.prettierrc`:

| Setting         | Value          |
| --------------- | -------------- |
| Semicolons      | required       |
| Quotes          | single         |
| Tab width       | 2 spaces       |
| Trailing commas | ES5            |
| Print width     | 100 characters |

---

## Check for issues (no changes made)

```bash
# Lint check
npm run lint

# Format check — shows files that would be reformatted
npx prettier --check src/
```

Both commands exit with a non-zero code if issues are found.

---

## Fix issues

```bash
# Auto-fix safe lint violations
npm run lint:fix

# Auto-format all files
npx prettier --write src/
```

### Fix everything in one shot

```bash
npm run lint:fix && npx prettier --write src/
```

---

## Common violations

| Tool     | Violation                     | Fix                                                  |
| -------- | ----------------------------- | ---------------------------------------------------- |
| ESLint   | `no-unused-vars`              | Remove the unused variable or import                 |
| ESLint   | `react-hooks/rules-of-hooks`  | Move the hook call to the top level of the component |
| ESLint   | `react-hooks/exhaustive-deps` | Add the missing dependency to the `useEffect` array  |
| Prettier | Wrong quotes or semicolons    | Run `npx prettier --write src/`                      |
| Prettier | Line exceeds 100 chars        | Prettier will wrap it automatically                  |

---

## CI behavior

The lint job runs before tests — a failure blocks the test job.

CI runs (`.github/workflows/ci.yml`):

```bash
npx eslint src/
```

> Note: CI only runs ESLint, not Prettier. Run Prettier locally before pushing to avoid style drift.

---

## Pre-push checklist

```bash
npm run lint:fix && npx prettier --write src/
npm run test
```
