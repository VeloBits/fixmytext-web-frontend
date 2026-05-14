import '@testing-library/jest-dom';
import { expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

// Adds expect(result).toHaveNoViolations() for vitest-axe.
expect.extend(axeMatchers);

// jsdom doesn't implement scrollIntoView
window.HTMLElement.prototype.scrollIntoView = vi.fn();

// Prevent Sentry from sending real events during tests
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  withSentryReactRouterV7Routing: vi.fn((component) => component),
  reactRouterV7BrowserTracingIntegration: vi.fn(() => ({})),
  browserTracingIntegration: vi.fn(() => ({})),
}));
