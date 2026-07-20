import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry, scrubObject } from './sentry';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  reactRouterV7BrowserTracingIntegration: vi.fn(() => ({})),
}));

vi.mock('react-router-dom', () => ({
  useEffect: vi.fn(),
  useLocation: vi.fn(),
  useNavigationType: vi.fn(),
  createRoutesFromChildren: vi.fn(),
  matchRoutes: vi.fn(),
}));

describe('initSentry', () => {
  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
    vi.unstubAllEnvs();
  });

  it('does not call Sentry.init when DSN is empty', () => {
    vi.stubEnv('VITE_SENTRY_DSN', '');
    initSentry();
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('calls Sentry.init when DSN is provided', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    expect(Sentry.init).toHaveBeenCalledOnce();
  });
});

type SentryOptions = Parameters<typeof Sentry.init>[0] & {
  integrations: (defaults: { name: string }[]) => { name: string }[];
  beforeSend: (event: Record<string, unknown>) => Record<string, unknown> | null;
  beforeBreadcrumb: (breadcrumb: Record<string, unknown>) => Record<string, unknown> | null;
};

function initWithEnv(environment?: string): SentryOptions {
  vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
  if (environment !== undefined) vi.stubEnv('VITE_SENTRY_ENVIRONMENT', environment);
  initSentry();
  return vi.mocked(Sentry.init).mock.calls[0]?.[0] as SentryOptions;
}

describe('initSentry config', () => {
  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
    vi.mocked(Sentry.reactRouterV7BrowserTracingIntegration).mockClear();
    vi.unstubAllEnvs();
  });

  it('adds router tracing integration in production', () => {
    const options = initWithEnv('production');
    const defaults = [{ name: 'BrowserSession' }, { name: 'Breadcrumbs' }];
    const integrations = options.integrations(defaults);
    expect(Sentry.reactRouterV7BrowserTracingIntegration).toHaveBeenCalledOnce();
    expect(integrations).toHaveLength(defaults.length + 1);
    expect(options.tracesSampleRate).toBe(0.1);
  });

  it('drops BrowserSession integration and disables tracing outside production', () => {
    const options = initWithEnv('development');
    const integrations = options.integrations([
      { name: 'BrowserSession' },
      { name: 'Breadcrumbs' },
    ]);
    expect(integrations).toEqual([{ name: 'Breadcrumbs' }]);
    expect(Sentry.reactRouterV7BrowserTracingIntegration).not.toHaveBeenCalled();
    expect(options.tracesSampleRate).toBe(0);
  });

  it('beforeSend scrubs PII from request data and extra', () => {
    const options = initWithEnv();
    const event = options.beforeSend({
      request: { data: { text: 'user content', action: 'submit' } },
      extra: { token: 'abc123', count: 3 },
    }) as { request: { data: Record<string, unknown> }; extra: Record<string, unknown> };
    expect(event.request.data['text']).toBe('[Filtered]');
    expect(event.request.data['action']).toBe('submit');
    expect(event.extra['token']).toBe('[Filtered]');
    expect(event.extra['count']).toBe(3);
  });

  it('beforeSend passes through events without request data or extra', () => {
    const options = initWithEnv();
    const event = { message: 'boom' };
    expect(options.beforeSend(event)).toBe(event);
  });

  it('beforeBreadcrumb strips bodies from fetch and xhr breadcrumbs', () => {
    const options = initWithEnv();
    const crumb = options.beforeBreadcrumb({
      category: 'fetch',
      data: { body: 'payload', response_body_size: 42, url: '/api/x' },
    }) as { data: Record<string, unknown> };
    expect(crumb.data['body']).toBeUndefined();
    expect(crumb.data['response_body_size']).toBeUndefined();
    expect(crumb.data['url']).toBe('/api/x');
  });

  it('beforeBreadcrumb drops informational console breadcrumbs but keeps errors', () => {
    const options = initWithEnv();
    expect(options.beforeBreadcrumb({ category: 'console', level: 'log' })).toBeNull();
    expect(options.beforeBreadcrumb({ category: 'console', level: 'error' })).not.toBeNull();
    expect(options.beforeBreadcrumb({ category: 'console', level: 'warning' })).not.toBeNull();
  });

  it('beforeBreadcrumb keeps unrelated breadcrumbs untouched', () => {
    const options = initWithEnv();
    const crumb = { category: 'navigation', data: { from: '/', to: '/pricing' } };
    expect(options.beforeBreadcrumb(crumb)).toBe(crumb);
  });
});

describe('scrubObject (PII scrubber)', () => {
  it('strips text field', () => {
    const result = scrubObject({ text: 'user content', other: 'keep' });
    expect(result['text']).toBe('[Filtered]');
    expect(result['other']).toBe('keep');
  });

  it('strips password field', () => {
    const result = scrubObject({ password: 'secret123' });
    expect(result['password']).toBe('[Filtered]');
  });

  it('strips token field', () => {
    const result = scrubObject({ token: 'abc123', action: 'submit' });
    expect(result['token']).toBe('[Filtered]');
    expect(result['action']).toBe('submit');
  });

  it('strips authorization field', () => {
    const result = scrubObject({ authorization: 'Bearer xyz' });
    expect(result['authorization']).toBe('[Filtered]');
  });

  it('returns object unchanged when no PII fields present', () => {
    const result = scrubObject({ action: 'submit', count: 3 });
    expect(result['action']).toBe('submit');
    expect(result['count']).toBe(3);
  });
});
