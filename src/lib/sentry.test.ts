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

  it('returns object unchanged when no PII fields present', () => {
    const result = scrubObject({ action: 'submit', count: 3 });
    expect(result['action']).toBe('submit');
    expect(result['count']).toBe(3);
  });
});
