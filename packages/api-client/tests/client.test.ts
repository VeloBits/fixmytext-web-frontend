import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { apiFetch, clearSession } from '../src/client';
import type * as ClientModule from '../src/client';
import type { loadNative as LoadNative } from './native-loader';

// Vitest inlines `import.meta.env` (including the dev container's VITE_API_URL)
// into the Vite-transformed module at transform time, so the copy imported above
// can never reach getDefaultBaseUrl's process.env / localhost fallbacks (the
// `viteEnv?.VITE_API_URL` check always returns early). To exercise those
// branches we load a SECOND copy of the module through Node's own ESM loader
// (native TypeScript type-stripping, no Vite transform): there
// `import.meta.env` is undefined. The `?native` query gives the copy a distinct
// V8 script URL so its coverage is remapped against the original source and
// merged into src/client.ts. native-loader.ts must itself be require()d
// natively so its dynamic import() runs on Node's loader (Vitest's module
// runner has no dynamic-import callback for raw file URLs).
// Note: node builtins are imported dynamically because this package's tsconfig
// only loads "vitest/globals" ambient types (no @types/node).
const testDir = (import.meta as unknown as { dirname?: string }).dirname ?? '';
const nativeClientUrl = `file://${testDir.replace(/\/tests$/, '')}/src/client.ts?native`;
let nativeClient: typeof ClientModule;

beforeAll(async () => {
  const nodeModule = (await import(/* @vite-ignore */ 'node' + ':module')) as unknown as {
    createRequire: (filename: string) => (id: string) => unknown;
  };
  const nativeRequire = nodeModule.createRequire(`${testDir}/client.test.ts`);
  const { loadNative } = nativeRequire('./native-loader.ts') as { loadNative: typeof LoadNative };
  nativeClient = await loadNative<typeof ClientModule>(nativeClientUrl);
});

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

    await expect(apiFetch('/missing', { baseUrl: 'http://localhost:8000' })).rejects.toMatchObject({
      status: 404,
    });
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
    await expect(clearSession({ baseUrl: 'http://localhost:8000' })).resolves.toBeUndefined();
  });

  it('uses default base URL when not provided', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, 204));

    await clearSession();

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/v1/auth/session/clear');
  });
});

describe('default base URL resolution', () => {
  const viteEnvUrl = (import.meta as unknown as { env?: Record<string, string> }).env?.VITE_API_URL;

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Only meaningful when the environment provides VITE_API_URL (the dev
  // container does); the transformed module copy sees the same inlined env.
  it.runIf(viteEnvUrl)('uses VITE_API_URL when set', async () => {
    mockFetch.mockResolvedValue(makeResponse({}, 204));

    await clearSession();

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${viteEnvUrl}/api/v1/auth/session/clear`);
  });

  it('falls back to NEXT_PUBLIC_API_URL when import.meta.env is unavailable', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', 'http://next-env:8888');
    mockFetch.mockResolvedValue(makeResponse({}, 204));

    await nativeClient.clearSession();

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://next-env:8888/api/v1/auth/session/clear');
  });

  it('falls back to http://localhost:8000 when no env URL is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_URL', '');
    mockFetch.mockResolvedValue(makeResponse({}, 204));

    await nativeClient.clearSession();

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8000/api/v1/auth/session/clear');
  });

  it('ignores a process global without NEXT_PUBLIC_API_URL', async () => {
    vi.stubGlobal('process', undefined);
    mockFetch.mockResolvedValue(makeResponse({}, 204));

    await nativeClient.clearSession();

    vi.unstubAllGlobals();
    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:8000/api/v1/auth/session/clear');
  });
});

describe('apiFetch - defaults and edge cases', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('uses the default base URL when options are omitted entirely', async () => {
    mockFetch.mockResolvedValue(makeResponse({ ok: true }));

    const result = await apiFetch<{ ok: boolean }>('/health');

    const [url] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toMatch(/\/health$/);
    expect(result.ok).toBe(true);
  });

  it('preserves an explicit Content-Type header', async () => {
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiFetch('/upload', {
      baseUrl: 'http://localhost:8000',
      headers: { 'Content-Type': 'text/plain' },
    });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.get('Content-Type')).toBe('text/plain');
  });

  it('falls back to a req-<timestamp> request id when crypto is unavailable', async () => {
    vi.stubGlobal('crypto', undefined);
    mockFetch.mockResolvedValue(makeResponse({}));

    await apiFetch('/health', { baseUrl: 'http://localhost:8000' });

    const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Headers;
    expect(headers.get('X-Request-ID')).toMatch(/^req-\d+$/);
  });

  it('sets detail to undefined when the error body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('not json')),
    } as unknown as Response);

    await expect(apiFetch('/broken', { baseUrl: 'http://localhost:8000' })).rejects.toMatchObject({
      status: 500,
      message: 'Internal Server Error',
      detail: undefined,
    });
  });
});
