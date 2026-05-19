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

// Prevent oidc-client-ts from attempting real network calls to Keycloak
// during tests. signinRedirect / signinSilent would try to fetch the OIDC
// discovery document from localhost:8080 which isn't running in CI/tests.
vi.mock('@/auth/userManager', () => ({
  userManager: {
    getUser: vi.fn().mockResolvedValue(null),
    storeUser: vi.fn().mockResolvedValue(undefined),
    removeUser: vi.fn().mockResolvedValue(undefined),
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    signinSilent: vi.fn().mockRejectedValue(new Error('No Keycloak in test env')),
    signinRedirectCallback: vi.fn().mockResolvedValue(undefined),
    signoutRedirect: vi.fn().mockResolvedValue(undefined),
    clearStaleState: vi.fn().mockResolvedValue(undefined),
    events: {
      addUserLoaded: vi.fn(),
      removeUserLoaded: vi.fn(),
      addUserUnloaded: vi.fn(),
      removeUserUnloaded: vi.fn(),
      addUserSignedIn: vi.fn(),
      removeUserSignedIn: vi.fn(),
      addUserSignedOut: vi.fn(),
      removeUserSignedOut: vi.fn(),
      addSilentRenewError: vi.fn(),
      removeSilentRenewError: vi.fn(),
    },
  },
}));
