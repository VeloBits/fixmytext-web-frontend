# Testing Guide (Frontend)

> How to run, write, and interpret tests for the FixMyText frontend.

## Stack

| Tool                                                                                    | Role                           |
| --------------------------------------------------------------------------------------- | ------------------------------ |
| [Vitest](https://vitest.dev/)                                                           | Test runner                    |
| [jsdom](https://github.com/jsdom/jsdom)                                                 | Browser environment simulation |
| [@testing-library/react](https://testing-library.com/docs/react-testing-library/intro/) | Component rendering & queries  |
| [@testing-library/jest-dom](https://github.com/testing-library/jest-dom)                | Custom DOM matchers            |
| [v8](https://v8.dev/blog/javascript-code-coverage)                                      | Coverage provider              |

---

## Running Tests

All commands must be run from the `frontend/` directory.

### Run all tests once

```bash
npx vitest run
```

### Run all tests with coverage report

```bash
npx vitest run --coverage
```

Coverage thresholds are enforced — the command exits with a non-zero code if any metric falls below **70%** (statements, branches, functions, lines).

### Watch mode (re-runs on file save)

```bash
npx vitest
```

Useful during development. Tests matching changed files re-run automatically.

### Run a single test file

```bash
npx vitest run src/components/editor/ToolPanel.test.jsx
```

### Run all tests in a directory

```bash
npx vitest run src/components/editor/
```

### Run tests matching a name pattern

```bash
npx vitest run -t "shows tooltip on hover"
```

### Verbose output (see each test name)

```bash
npx vitest run --reporter=verbose
```

### Combine flags

```bash
npx vitest run --reporter=verbose src/hooks/useAiTools.test.js
```

---

## Coverage Report

After running with `--coverage`, two outputs are produced:

| Output           | Location                          | Use                           |
| ---------------- | --------------------------------- | ----------------------------- |
| Terminal summary | Printed after tests               | Quick pass/fail check         |
| HTML report      | `coverage/lcov-report/index.html` | Line-by-line visual breakdown |

Open the HTML report in a browser:

```bash
open coverage/lcov-report/index.html     # macOS
xdg-open coverage/lcov-report/index.html # Linux
```

### Coverage thresholds (vitest.config.js)

```
Statements : 70%
Branches   : 70%
Functions  : 70%
Lines      : 70%
```

If any threshold is not met, `vitest run --coverage` exits with an error.

---

## Test File Conventions

- Test files live **co-located** with the source file they test.
- Naming: `Foo.jsx` → `Foo.test.jsx`, `useBar.js` → `useBar.test.js`
- All test files must match the glob `src/**/*.{test,spec}.{js,jsx}`.

```
src/
  components/
    editor/
      ToolPanel.jsx
      ToolPanel.test.jsx      ← co-located test
  hooks/
    useAiTools.js
    useAiTools.test.js
```

---

## Writing Tests

### Component test (basic pattern)

```jsx
import { render, screen, fireEvent } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders the title', () => {
    render(<MyComponent title="Hello" />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('calls onClick when button is clicked', () => {
    const onClick = vi.fn();
    render(<MyComponent onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });
});
```

### Hook test (basic pattern)

```js
import { renderHook, act } from '@testing-library/react';
import useCounter from './useCounter';

it('increments the count', () => {
  const { result } = renderHook(() => useCounter());
  act(() => {
    result.current.increment();
  });
  expect(result.current.count).toBe(1);
});
```

### Mocking modules

```js
// Mock a module before imports
vi.mock('../store/api/textApi', () => ({
  useTransformTextMutation: () => [vi.fn()],
}));

// Mock react-redux
vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => ({ accessToken: 'token' })),
  useDispatch: () => vi.fn(),
}));
```

### Mocking framer-motion (required for animated components)

```js
vi.mock('framer-motion', () => {
  const m =
    (tag) =>
    ({ children, ...props }) => {
      const p = { ...props };
      ['initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover'].forEach(
        (k) => delete p[k]
      );
      return React.createElement(tag, p, children);
    };
  return {
    motion: new Proxy({}, { get: (_, t) => m(t) }),
    AnimatePresence: ({ children }) => children,
    useReducedMotion: () => false,
  };
});
```

### Avoiding TDZ errors with vi.hoisted

When a mock factory references a variable defined with `const`, use `vi.hoisted` to avoid a temporal dead zone (TDZ) `ReferenceError`:

```js
const mocks = vi.hoisted(() => ({
  mockFn: vi.fn(),
}));

vi.mock('../utils/someModule', () => ({
  someExport: mocks.mockFn,
}));
```

---

## Common Patterns

### Text split across elements

Use `document.body.textContent` when text is rendered as individual characters (e.g. typing animations):

```js
expect(document.body.textContent).toContain('Welcome');
```

### Multiple elements with the same text

```js
// Instead of getByText (throws if multiple match):
expect(screen.getAllByText('Submit').length).toBeGreaterThan(0);

// Or target by role for specificity:
expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
```

### Async interactions

```js
import { waitFor } from '@testing-library/react';

it('shows result after async action', async () => {
  render(<MyComponent />);
  fireEvent.click(screen.getByText('Fetch'));
  await waitFor(() => {
    expect(screen.getByText('Result')).toBeInTheDocument();
  });
});
```

---

## Setup File

Global test setup lives in `src/test/setup.js`. It runs before every test file and includes:

- `@testing-library/jest-dom` matchers
- `window.HTMLElement.prototype.scrollIntoView` polyfill (jsdom does not implement it)

---

## Debugging a Failing Test

1. **Run the single file** to isolate noise:

   ```bash
   npx vitest run path/to/Failing.test.jsx --reporter=verbose
   ```

2. **Print the rendered DOM** inside a test:

   ```js
   import { render } from '@testing-library/react';
   const { debug } = render(<MyComponent />);
   debug(); // logs the full DOM to the terminal
   ```

3. **Check mock is wired correctly** — `require()` bypasses the Vitest mock registry in ESM. Always use `import` at the top of the file for mocked modules.

4. **Check for hoisting issues** — `vi.mock()` is hoisted above `const` declarations. Use `vi.hoisted()` if your mock factory references a variable.
