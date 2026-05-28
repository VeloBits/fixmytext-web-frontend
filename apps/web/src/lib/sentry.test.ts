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

  it('strips prompt field', () => {
    const result = scrubObject({ prompt: 'do X', id: 1 });
    expect(result['prompt']).toBe('[Filtered]');
    expect(result['id']).toBe(1);
  });

  it('strips cookie field', () => {
    expect(scrubObject({ cookie: 'session=x' })['cookie']).toBe('[Filtered]');
  });

  it('strips keys case-insensitively', () => {
    expect(scrubObject({ TEXT: 'hi' })['TEXT']).toBe('[Filtered]');
    expect(scrubObject({ Password: 'pw' })['Password']).toBe('[Filtered]');
  });

  it('returns object unchanged when no PII fields present', () => {
    const result = scrubObject({ action: 'submit', count: 3 });
    expect(result['action']).toBe('submit');
    expect(result['count']).toBe(3);
  });

  it('returns empty object for empty input', () => {
    expect(scrubObject({})).toEqual({});
  });
});

describe('initSentry callback branches', () => {
  beforeEach(() => {
    vi.mocked(Sentry.init).mockClear();
    vi.unstubAllEnvs();
  });

  it('uses 0.1 tracesSampleRate in production environment', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'production');
    initSentry();
    const initArg = vi.mocked(Sentry.init).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(initArg?.tracesSampleRate).toBe(0.1);
  });

  it('uses 1.0 tracesSampleRate in non-production environment', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    vi.stubEnv('VITE_SENTRY_ENVIRONMENT', 'staging');
    initSentry();
    const initArg = vi.mocked(Sentry.init).mock.calls[0]?.[0] as Record<string, unknown>;
    expect(initArg?.tracesSampleRate).toBe(1.0);
  });

  it('beforeSend scrubs request.data when it is an object', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeSend } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as unknown as {
      beforeSend: (e: Record<string, unknown>) => unknown;
    };
    const event = { request: { data: { text: 'secret', safe: 'ok' } } };
    const result = beforeSend(event as never) as typeof event;
    expect(result.request.data.text).toBe('[Filtered]');
    expect(result.request.data.safe).toBe('ok');
  });

  it('beforeSend scrubs event.extra when present', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeSend } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as unknown as {
      beforeSend: (e: Record<string, unknown>) => unknown;
    };
    const event = { extra: { token: 'abc', id: 1 } };
    const result = beforeSend(event as never) as typeof event;
    expect(result.extra.token).toBe('[Filtered]');
    expect(result.extra.id).toBe(1);
  });

  it('beforeSend returns event unchanged when no request.data or extra', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeSend } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as unknown as {
      beforeSend: (e: Record<string, unknown>) => unknown;
    };
    const event = { message: 'error occurred' };
    expect(beforeSend(event as never)).toBe(event);
  });

  it('beforeBreadcrumb strips body from fetch breadcrumbs', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeBreadcrumb } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as {
      beforeBreadcrumb: (b: Record<string, unknown>) => unknown;
    };
    const crumb = { category: 'fetch', data: { body: 'x', response_body_size: 100, url: '/api' } };
    const result = beforeBreadcrumb(crumb as never) as typeof crumb;
    expect(result).toBe(crumb);
    expect(result.data).not.toHaveProperty('body');
    expect(result.data).not.toHaveProperty('response_body_size');
    expect(result.data.url).toBe('/api');
  });

  it('beforeBreadcrumb strips body from xhr breadcrumbs', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeBreadcrumb } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as {
      beforeBreadcrumb: (b: Record<string, unknown>) => unknown;
    };
    const crumb = { category: 'xhr', data: { body: 'y' } };
    const result = beforeBreadcrumb(crumb as never);
    expect(result).toBe(crumb);
  });

  it('beforeBreadcrumb returns null for non-warning console breadcrumbs', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeBreadcrumb } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as {
      beforeBreadcrumb: (b: Record<string, unknown>) => unknown;
    };
    expect(beforeBreadcrumb({ category: 'console', level: 'log' } as never)).toBeNull();
    expect(beforeBreadcrumb({ category: 'console', level: 'info' } as never)).toBeNull();
  });

  it('beforeBreadcrumb passes through console warning breadcrumbs', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeBreadcrumb } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as {
      beforeBreadcrumb: (b: Record<string, unknown>) => unknown;
    };
    const crumb = { category: 'console', level: 'warning' };
    expect(beforeBreadcrumb(crumb as never)).toBe(crumb);
  });

  it('beforeBreadcrumb passes through console error breadcrumbs', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeBreadcrumb } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as {
      beforeBreadcrumb: (b: Record<string, unknown>) => unknown;
    };
    const crumb = { category: 'console', level: 'error' };
    expect(beforeBreadcrumb(crumb as never)).toBe(crumb);
  });

  it('beforeBreadcrumb passes through non-fetch, non-console breadcrumbs', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeBreadcrumb } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as {
      beforeBreadcrumb: (b: Record<string, unknown>) => unknown;
    };
    const crumb = { category: 'navigation', from: '/', to: '/about' };
    expect(beforeBreadcrumb(crumb as never)).toBe(crumb);
  });

  it('beforeBreadcrumb handles fetch breadcrumb with no data property', () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://test@sentry.io/123');
    initSentry();
    const { beforeBreadcrumb } = vi.mocked(Sentry.init).mock.calls[0]?.[0] as {
      beforeBreadcrumb: (b: Record<string, unknown>) => unknown;
    };
    const crumb = { category: 'fetch' };
    expect(beforeBreadcrumb(crumb as never)).toBe(crumb);
  });
});
