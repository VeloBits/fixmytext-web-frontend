import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, clearSession } from '../src/client';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function makeResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: () => Promise.resolve(body),
  } as Response;
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('apiFetch', () => {
  it('calls fetch with the correct URL', async () => {
    mockFetch.mockResolvedValue(makeResponse({ result: 'ok' }));

    await apiFetch('/api/v1/text/uppercase', {
      baseUrl: 'http://localhost:8000',
      method: 'POST',
      body: JSON.stringify({ text: 'hello' }),
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/text/uppercase',
      expect.objectContaining({ method: 'POST' })
    );
  });

  it('sends credentials: include by default', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiFetch('/api/v1/text/uppercase', { baseUrl: 'http://localhost:8000' });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(options.credentials).toBe('include');
  });

  it('injects X-Request-ID header', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiFetch('/health', { baseUrl: 'http://localhost:8000' });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.has('X-Request-ID')).toBe(true);
  });

  it('throws ApiError on non-2xx response', async () => {
    mockFetch.mockResolvedValue(makeResponse({ detail: 'Not found' }, 404));

    await expect(
      apiFetch('/missing', { baseUrl: 'http://localhost:8000' })
    ).rejects.toMatchObject({ status: 404 });
  });

  it('returns parsed JSON on success', async () => {
    mockFetch.mockResolvedValue(makeResponse({ output: 'HELLO' }));

    const result = await apiFetch<{ output: string }>('/api/v1/text/uppercase', {
      baseUrl: 'http://localhost:8000',
    });

    expect(result.output).toBe('HELLO');
  });
});

describe('ENDPOINTS', () => {
  it('exports ENDPOINTS constant', async () => {
    const { ENDPOINTS } = await import('../src/endpoints');
    expect(ENDPOINTS.UPPERCASE).toBe('/api/v1/text/uppercase');
    expect(ENDPOINTS.FIX_GRAMMAR).toBe('/api/v1/ai/fix-grammar');
  });
});

describe('clearSession', () => {
  it('POSTs to /api/v1/auth/session/clear with credentials include', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, 204));

    await clearSession({ baseUrl: 'http://localhost:8000' });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/v1/auth/session/clear',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      })
    );
  });

  it('swallows network errors silently', async () => {
    mockFetch.mockRejectedValue(new Error('network down'));

    // Should not throw
    await expect(
      clearSession({ baseUrl: 'http://localhost:8000' })
    ).resolves.toBeUndefined();
  });

  it('uses default base URL when not provided', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, 204));

    await clearSession();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/auth/session/clear');
  });
});
