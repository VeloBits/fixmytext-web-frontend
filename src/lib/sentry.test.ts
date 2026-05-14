import { describe, it, expect, vi, beforeEach } from 'vitest';
import type * as SentryTypes from '@sentry/react';

// Mock @sentry/react before importing the module under test
vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  reactRouterV7BrowserTracingIntegration: vi.fn(() => ({})),
}));

// Mock react-router-dom hooks used by the integration
vi.mock('react-router-dom', () => ({
  useEffect: vi.fn(),
  useLocation: vi.fn(),
  useNavigationType: vi.fn(),
  createRoutesFromChildren: vi.fn(),
  matchRoutes: vi.fn(),
}));

describe('initSentry', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_SENTRY_DSN', '');
  });

  it('does not call Sentry.init when DSN is empty', async () => {
    const { default: Sentry } = await import('@sentry/react');
    const { initSentry } = await import('./sentry');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('calls Sentry.init when DSN is provided', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { default: Sentry } = await import('@sentry/react');
    const { initSentry } = await import('./sentry');
    initSentry();
    expect(Sentry.init).toHaveBeenCalledOnce();
  });
});

describe('PII scrubber (beforeSend)', () => {
  it('strips text field from request data', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { default: Sentry } = await import('@sentry/react');
    const { initSentry } = await import('./sentry');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0]?.[0];
    const beforeSend = initCall?.beforeSend;

    const event = {
      request: { data: { text: 'user content', other: 'keep' } },
    } as Parameters<NonNullable<typeof beforeSend>>[0];

    const result = beforeSend?.(event, {}) as SentryTypes.ErrorEvent | null | undefined;
    expect((result?.request?.data as Record<string, unknown>)?.['text']).toBe('[Filtered]');
    expect((result?.request?.data as Record<string, unknown>)?.['other']).toBe('keep');
  });

  it('strips password field from request data', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { default: Sentry } = await import('@sentry/react');
    const { initSentry } = await import('./sentry');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0]?.[0];
    const beforeSend = initCall?.beforeSend;

    const event = {
      request: { data: { password: 'secret123' } },
    } as Parameters<NonNullable<typeof beforeSend>>[0];

    const result = beforeSend?.(event, {}) as SentryTypes.ErrorEvent | null | undefined;
    expect((result?.request?.data as Record<string, unknown>)?.['password']).toBe('[Filtered]');
  });

  it('returns event unchanged when no PII fields present', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    const { default: Sentry } = await import('@sentry/react');
    const { initSentry } = await import('./sentry');
    initSentry();

    const initCall = vi.mocked(Sentry.init).mock.calls[0]?.[0];
    const beforeSend = initCall?.beforeSend;

    const event = {
      request: { data: { action: 'submit', count: 3 } },
    } as Parameters<NonNullable<typeof beforeSend>>[0];

    const result = beforeSend?.(event, {}) as SentryTypes.ErrorEvent | null | undefined;
    expect((result?.request?.data as Record<string, unknown>)?.['action']).toBe('submit');
  });
});
