import '@testing-library/jest-dom';
import { expect } from 'vitest';
import * as axeMatchers from 'vitest-axe/matchers';

expect.extend(axeMatchers);

window.HTMLElement.prototype.scrollIntoView = vi.fn();

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  captureException: vi.fn(),
  setUser: vi.fn(),
  withSentryReactRouterV7Routing: vi.fn((component) => component),
  reactRouterV7BrowserTracingIntegration: vi.fn(() => ({})),
  browserTracingIntegration: vi.fn(() => ({})),
}));

vi.mock('@velobits/app-core/auth/userManager', () => ({
  hasAuthHint: vi.fn(() => false), // no persisted session hint in tests
  // loadUser/resetLoadUser are the in-memory session bootstrap added with the
  // H-8 tokens-off-sessionStorage change; useOidcAuth calls loadUser() on mount.
  // Resolve to null (unauthenticated) so tests don't hit the real silent-renew.
  loadUser: vi.fn().mockResolvedValue(null),
  resetLoadUser: vi.fn(),
  userManager: {
    getUser: vi.fn().mockResolvedValue(null),
    storeUser: vi.fn().mockResolvedValue(undefined),
    removeUser: vi.fn().mockResolvedValue(undefined),
    signinRedirect: vi.fn().mockResolvedValue(undefined),
    signinSilent: vi.fn().mockRejectedValue(new Error('No Keycloak in test env')),
    signinSilentCallback: vi.fn().mockResolvedValue(undefined),
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
