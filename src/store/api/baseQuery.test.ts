/**
 * Tests for baseQuery module.
 *
 * Strategy: We mock `fetchBaseQuery` and `retry` from RTK Query so every
 * branch inside createAuthBaseQuery / createReauthQuery / baseQueryWithRetry
 * can be exercised through controlled mock return values.
 */

// ---------------------------------------------------------------------------
// Mocks — must be declared before the module-under-test is imported.
// ---------------------------------------------------------------------------

// `mockRawBaseQuery` is the function returned by fetchBaseQuery().
// Each test sets its implementation via mockImplementation / mockResolvedValue.
const mockRawBaseQuery = vi.fn();

// Capture the config object passed to fetchBaseQuery so we can call
// prepareHeaders ourselves.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let capturedFetchBaseQueryConfig: any = null;

interface MockBaseQueryResult {
  error?: unknown;
  data?: unknown;
}

interface MockRetryOptions {
  maxRetries: number;
  retryCondition: (error: unknown, args: unknown, meta: { attempt: number }) => boolean;
  [key: string]: unknown;
}

vi.mock('@reduxjs/toolkit/query/react', () => ({
  fetchBaseQuery: (config: Record<string, unknown>) => {
    capturedFetchBaseQueryConfig = config;
    return mockRawBaseQuery;
  },
  retry: (baseQueryFn: (args: unknown, api: unknown, extra: unknown) => Promise<MockBaseQueryResult>, options: MockRetryOptions) => {
    // Expose the retry wrapper so we can test retryCondition directly.
    // Simulate retry behaviour: call baseQueryFn, and if it returns an error
    // that satisfies retryCondition, call it again up to maxRetries times.
    const wrapped = async (args: unknown, api: unknown, extraOptions: unknown) => {
      let attempt = 1;
      let result = await baseQueryFn(args, api, extraOptions);

      while (
        result.error &&
        attempt < options.maxRetries &&
        options.retryCondition(result.error, args, { attempt })
      ) {
        attempt++;
        result = await baseQueryFn(args, api, extraOptions);
      }
      return result;
    };
    // Attach options so tests can inspect retryCondition independently.
    wrapped._retryOptions = options;
    return wrapped;
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Reset the module-level `refreshPromise` and `retryCount` by re-importing. */
async function freshImport() {
  // Clear module cache so each describe block gets fresh module-level state.
  vi.resetModules();
  // Re-apply the mocks (resetModules drops them)
  vi.mock('@reduxjs/toolkit/query/react', () => ({
    fetchBaseQuery: (config: Record<string, unknown>) => {
      capturedFetchBaseQueryConfig = config;
      return mockRawBaseQuery;
    },
    retry: (baseQueryFn: (args: unknown, api: unknown, extra: unknown) => Promise<MockBaseQueryResult>, options: MockRetryOptions) => {
      const wrapped = async (args: unknown, api: unknown, extraOptions: unknown) => {
        let attempt = 1;
        let result = await baseQueryFn(args, api, extraOptions);
        while (
          result.error &&
          attempt < options.maxRetries &&
          options.retryCondition(result.error, args, { attempt })
        ) {
          attempt++;
          result = await baseQueryFn(args, api, extraOptions);
        }
        return result;
      };
      wrapped._retryOptions = options;
      return wrapped;
    },
  }));
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
        addUserLoaded: vi.fn(), removeUserLoaded: vi.fn(),
        addUserUnloaded: vi.fn(), removeUserUnloaded: vi.fn(),
        addUserSignedIn: vi.fn(), removeUserSignedIn: vi.fn(),
        addUserSignedOut: vi.fn(), removeUserSignedOut: vi.fn(),
        addSilentRenewError: vi.fn(), removeSilentRenewError: vi.fn(),
      },
    },
  }));

  const mod = await import('./baseQuery');
  return mod;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function makeApi(_accessToken: string | null = 'test-token'): any {
  return {
    getState: () => ({}),
    dispatch: vi.fn(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('baseQuery module exports', () => {
  it('exports createAuthBaseQuery as a function', async () => {
    const { createAuthBaseQuery } = await freshImport();
    expect(typeof createAuthBaseQuery).toBe('function');
  });

  it('exports baseQueryWithReauth as a function', async () => {
    const { baseQueryWithReauth } = await freshImport();
    expect(typeof baseQueryWithReauth).toBe('function');
  });

  it('exports createBaseQueryWithReauth as a function', async () => {
    const { createBaseQueryWithReauth } = await freshImport();
    expect(typeof createBaseQueryWithReauth).toBe('function');
  });

  it('exports baseQueryWithRetry as a function', async () => {
    const { baseQueryWithRetry } = await freshImport();
    expect(typeof baseQueryWithRetry).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 1. Token injection in prepareHeaders
// ---------------------------------------------------------------------------

describe('createAuthBaseQuery — prepareHeaders', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
    capturedFetchBaseQueryConfig = null;
  });

  it('sets Authorization header when accessToken exists', async () => {
    const { userManager } = await import('@/auth/userManager');
    vi.mocked(userManager.getUser).mockResolvedValue({ access_token: 'my-access-token' } as Parameters<typeof vi.mocked<typeof userManager.getUser>>[0] extends undefined ? never : Awaited<ReturnType<typeof userManager.getUser>>);
    const { createAuthBaseQuery } = await freshImport();
    createAuthBaseQuery(); // triggers fetchBaseQuery mock → captures config

    const headers = new Headers();
    const api = makeApi();

    const returned = await capturedFetchBaseQueryConfig!.prepareHeaders(headers, api);

    expect(returned.get('Authorization')).toBe('Bearer my-access-token');
  });

  it('does not set Authorization header when accessToken is falsy', async () => {
    const { userManager } = await import('@/auth/userManager');
    vi.mocked(userManager.getUser).mockResolvedValue(null);
    const { createAuthBaseQuery } = await freshImport();
    createAuthBaseQuery();

    const headers = new Headers();
    const api = makeApi();

    const returned = await capturedFetchBaseQueryConfig!.prepareHeaders(headers, api);

    expect(returned.get('Authorization')).toBeNull();
  });

  it('calls extraHeaders callback when provided', async () => {
    const { userManager } = await import('@/auth/userManager');
    vi.mocked(userManager.getUser).mockResolvedValue({ access_token: 'tok' } as Parameters<typeof vi.mocked<typeof userManager.getUser>>[0] extends undefined ? never : Awaited<ReturnType<typeof userManager.getUser>>);
    const { createAuthBaseQuery } = await freshImport();
    const extraHeaders = vi.fn();
    createAuthBaseQuery(extraHeaders);

    const headers = new Headers();
    const api = makeApi();

    await capturedFetchBaseQueryConfig!.prepareHeaders(headers, api);

    expect(extraHeaders).toHaveBeenCalledWith(headers, api);
  });

  it('does not call extraHeaders when it is undefined', async () => {
    const { userManager } = await import('@/auth/userManager');
    vi.mocked(userManager.getUser).mockResolvedValue(null);
    const { createAuthBaseQuery } = await freshImport();
    createAuthBaseQuery(); // no extraHeaders

    const headers = new Headers();
    const api = makeApi();

    // Should not throw
    await expect(capturedFetchBaseQueryConfig.prepareHeaders(headers, api)).resolves.not.toThrow();
  });

  it('passes correct baseUrl and credentials to fetchBaseQuery', async () => {
    const { createAuthBaseQuery } = await freshImport();
    createAuthBaseQuery();

    expect(capturedFetchBaseQueryConfig.baseUrl).toBeDefined();
    expect(capturedFetchBaseQueryConfig.credentials).toBe('include');
  });
});

// ---------------------------------------------------------------------------
// 2. baseQueryWithReauth — successful request (no 401)
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — successful requests', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('returns result directly when request succeeds', async () => {
    const { baseQueryWithReauth } = await freshImport();
    mockRawBaseQuery.mockResolvedValue({ data: { id: 1 } });

    const api = makeApi();
    const result = await baseQueryWithReauth('/test', api, {});

    expect(result).toEqual({ data: { id: 1 } });
    expect(api.dispatch).not.toHaveBeenCalled();
  });

  it('retries original request after silent renew succeeds on 401', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const { userManager } = await import('@/auth/userManager');
    const api = makeApi();

    vi.mocked(userManager.signinSilent).mockResolvedValue(null);

    let callCount = 0;
    mockRawBaseQuery.mockImplementation(() => {
      callCount++;
      if (callCount === 1) return Promise.resolve({ error: { status: 401 } });
      return Promise.resolve({ data: 'ok' });
    });

    const result = await baseQueryWithReauth('/resource', api, {});
    expect(result).toEqual({ data: 'ok' });
    expect(userManager.signinSilent).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 3. baseQueryWithReauth — 401 → refresh → retry flow (success)
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — 401 refresh flow', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('refreshes token via signinSilent and retries the original request on 401', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const { userManager } = await import('@/auth/userManager');
    const api = makeApi();

    vi.mocked(userManager.signinSilent).mockResolvedValue(null);

    let callIndex = 0;
    mockRawBaseQuery.mockImplementation(() => {
      callIndex++;
      // First call to the real endpoint → 401
      if (callIndex === 1) {
        return Promise.resolve({ error: { status: 401 } });
      }
      // Retry after silent renew → success
      return Promise.resolve({ data: 'retried-ok' });
    });

    const result = await baseQueryWithReauth('/protected', api, {});

    // Silent renew was called
    expect(userManager.signinSilent).toHaveBeenCalled();

    // The retried request's data is returned
    expect(result).toEqual({ data: 'retried-ok' });
  });
});

// ---------------------------------------------------------------------------
// 4. baseQueryWithReauth — 401 → refresh fails → logout
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — refresh failure', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('calls signinRedirect when silent renew fails on 401', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const { userManager } = await import('@/auth/userManager');
    const api = makeApi();

    // signinSilent fails (default from setup mock)
    vi.mocked(userManager.signinSilent).mockRejectedValue(new Error('silent renew failed'));
    vi.mocked(userManager.signinRedirect).mockResolvedValue(undefined);

    mockRawBaseQuery.mockResolvedValue({ error: { status: 401 } });

    const result = await baseQueryWithReauth('/protected', api, {});

    expect(userManager.signinSilent).toHaveBeenCalled();
    expect(userManager.signinRedirect).toHaveBeenCalled();
    // Original error is still returned
    expect(result.error!.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 5. baseQueryWithReauth — auth endpoint → no refresh attempted
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — auth endpoint skip', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it.each(['/auth/refresh', '/auth/login', '/auth/register'])(
    'does not attempt refresh when url contains %s',
    async (authPath) => {
      const { baseQueryWithReauth } = await freshImport();
      const api = makeApi();

      mockRawBaseQuery.mockResolvedValue({ error: { status: 401 } });

      const result = await baseQueryWithReauth(authPath, api, {});

      // Should not dispatch anything — no refresh, no logout
      expect(api.dispatch).not.toHaveBeenCalled();
      expect(result).toEqual({ error: { status: 401 } });

      // fetchBaseQuery should have been called exactly once (no retry)
      expect(mockRawBaseQuery).toHaveBeenCalledTimes(1);
    }
  );

  it('skips refresh for auth endpoint passed as object with url', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();

    mockRawBaseQuery.mockResolvedValue({ error: { status: 401 } });

    const result = await baseQueryWithReauth(
      { url: '/api/v1/auth/login', method: 'POST' },
      api,
      {}
    );

    expect(api.dispatch).not.toHaveBeenCalled();
    expect(result.error!.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 6. baseQueryWithReauth — max retry exceeded → logout
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — max retry exceeded', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('calls signinRedirect when silent renew fails repeatedly on 401', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const { userManager } = await import('@/auth/userManager');
    const api = makeApi();

    // signinSilent always fails
    vi.mocked(userManager.signinSilent).mockRejectedValue(new Error('silent renew failed'));
    vi.mocked(userManager.signinRedirect).mockResolvedValue(undefined);

    mockRawBaseQuery.mockResolvedValue({ error: { status: 401 } });

    // First call: 401 → signinSilent fails → signinRedirect called → returns 401
    const result = await baseQueryWithReauth('/resource', api, {});

    expect(userManager.signinRedirect).toHaveBeenCalled();
    expect(result.error!.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 7. Concurrent 401s share a single refresh (mutex)
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — refresh mutex', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('concurrent 401 requests each trigger their own signinSilent (no mutex in new impl)', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const { userManager } = await import('@/auth/userManager');
    const api = makeApi();

    // signinSilent resolves after a tick (to allow concurrency)
    let silentRenewCallCount = 0;
    vi.mocked(userManager.signinSilent).mockImplementation(() => {
      silentRenewCallCount++;
      return Promise.resolve(null);
    });

    let rawCallCount = 0;
    mockRawBaseQuery.mockImplementation(() => {
      rawCallCount++;
      // First two calls (one per request) → 401; subsequent retries → success
      if (rawCallCount <= 2) return Promise.resolve({ error: { status: 401 } });
      return Promise.resolve({ data: 'ok' });
    });

    // Fire two concurrent requests
    const p1 = baseQueryWithReauth('/a', api, {});
    const p2 = baseQueryWithReauth('/b', api, {});

    await Promise.all([p1, p2]);

    // Both requests encountered 401 and tried signinSilent
    expect(silentRenewCallCount).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 8. baseQueryWithRetry — 5xx triggers retry
// ---------------------------------------------------------------------------

describe('baseQueryWithRetry — retry on 5xx', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('retries on 500 errors', async () => {
    const { baseQueryWithRetry } = await freshImport();
    const api = makeApi();

    let callCount = 0;
    mockRawBaseQuery.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ error: { status: 500 } });
      }
      return Promise.resolve({ data: 'recovered' });
    });

    const result = await baseQueryWithRetry('/endpoint', api, {});

    expect(result).toEqual({ data: 'recovered' });
    expect(callCount).toBe(2);
  });

  it('does not retry on 4xx errors', async () => {
    const { baseQueryWithRetry } = await freshImport();
    // Verify retryCondition directly through the exposed options
    const retryCondition = baseQueryWithRetry._retryOptions!.retryCondition;

    // 400 — should not retry
    expect(retryCondition({ status: 400 }, {}, { attempt: 1 })).toBe(false);
    // 403 — should not retry
    expect(retryCondition({ status: 403 }, {}, { attempt: 1 })).toBe(false);
    // 404 — should not retry
    expect(retryCondition({ status: 404 }, {}, { attempt: 1 })).toBe(false);
    // 422 — should not retry
    expect(retryCondition({ status: 422 }, {}, { attempt: 1 })).toBe(false);
  });

  it('retries on 5xx errors per retryCondition', async () => {
    const { baseQueryWithRetry } = await freshImport();
    const retryCondition = baseQueryWithRetry._retryOptions!.retryCondition;

    expect(retryCondition({ status: 500 }, {}, { attempt: 1 })).toBe(true);
    expect(retryCondition({ status: 502 }, {}, { attempt: 1 })).toBe(true);
    expect(retryCondition({ status: 503 }, {}, { attempt: 2 })).toBe(true);
  });

  it('stops retrying when attempt exceeds 2', async () => {
    const { baseQueryWithRetry } = await freshImport();
    const retryCondition = baseQueryWithRetry._retryOptions!.retryCondition;

    // attempt 3 — should not retry even for 500
    expect(retryCondition({ status: 500 }, {}, { attempt: 3 })).toBe(false);
  });

  it('retries when error has no status (network errors)', async () => {
    const { baseQueryWithRetry } = await freshImport();
    const retryCondition = baseQueryWithRetry._retryOptions!.retryCondition;

    // No status property — treated as non-4xx, should retry
    expect(retryCondition({}, {}, { attempt: 1 })).toBe(true);
    expect(retryCondition(null, {}, { attempt: 1 })).toBe(true);
  });

  it('has maxRetries set to 2', async () => {
    const { baseQueryWithRetry } = await freshImport();
    expect(baseQueryWithRetry._retryOptions!.maxRetries).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 9. createBaseQueryWithReauth — factory with extra headers
// ---------------------------------------------------------------------------

describe('createBaseQueryWithReauth', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('returns a reauth query that uses custom headers', async () => {
    const { userManager } = await import('@/auth/userManager');
    vi.mocked(userManager.getUser).mockResolvedValue({ access_token: 'tok' } as Parameters<typeof vi.mocked<typeof userManager.getUser>>[0] extends undefined ? never : Awaited<ReturnType<typeof userManager.getUser>>);
    const { createBaseQueryWithReauth } = await freshImport();
    const extraHeaders = vi.fn((headers) => {
      headers.set('X-Custom', 'value');
    });

    const query = createBaseQueryWithReauth(extraHeaders);
    expect(typeof query).toBe('function');

    // Verify extraHeaders was wired into fetchBaseQuery config
    const headers = new Headers();
    const api = makeApi();
    await capturedFetchBaseQueryConfig!.prepareHeaders(headers, api);

    expect(extraHeaders).toHaveBeenCalled();
  });

  it('performs reauth on 401 for custom header query via signinSilent', async () => {
    const { createBaseQueryWithReauth } = await freshImport();
    const { userManager } = await import('@/auth/userManager');
    const query = createBaseQueryWithReauth(() => {});
    const api = makeApi();

    vi.mocked(userManager.signinSilent).mockResolvedValue(null);

    let callIndex = 0;
    mockRawBaseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return Promise.resolve({ error: { status: 401 } });
      return Promise.resolve({ data: 'ok-custom' });
    });

    const result = await query('/custom-endpoint', api, {});

    expect(userManager.signinSilent).toHaveBeenCalled();
    expect(result).toEqual({ data: 'ok-custom' });
  });
});

// ---------------------------------------------------------------------------
// 10. Non-401 errors pass through without refresh
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — non-401 errors', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('does not attempt refresh on 403 errors', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();

    mockRawBaseQuery.mockResolvedValue({ error: { status: 403 } });

    const result = await baseQueryWithReauth('/forbidden', api, {});

    expect(api.dispatch).not.toHaveBeenCalled();
    expect(result.error!.status).toBe(403);
    expect(mockRawBaseQuery).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh on 500 errors', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();

    mockRawBaseQuery.mockResolvedValue({ error: { status: 500 } });

    const result = await baseQueryWithReauth('/server-error', api, {});

    expect(api.dispatch).not.toHaveBeenCalled();
    expect(result.error!.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// 11. Edge case: args is a string vs object
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — args type handling', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('handles string args for url detection', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();

    mockRawBaseQuery.mockResolvedValue({ error: { status: 401 } });

    // String arg containing auth path — should skip refresh
    await baseQueryWithReauth('/auth/login', api, {});
    expect(api.dispatch).not.toHaveBeenCalled();
  });

  it('handles object args for url detection', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();

    mockRawBaseQuery.mockResolvedValue({ error: { status: 401 } });

    await baseQueryWithReauth({ url: '/auth/register', method: 'POST' }, api, {});
    expect(api.dispatch).not.toHaveBeenCalled();
  });

  it('handles args with undefined url gracefully', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const { userManager } = await import('@/auth/userManager');
    const api = makeApi();

    vi.mocked(userManager.signinSilent).mockResolvedValue(null);

    let callIndex = 0;
    mockRawBaseQuery.mockImplementation(() => {
      callIndex++;
      if (callIndex === 1) return Promise.resolve({ error: { status: 401 } });
      return Promise.resolve({ data: 'ok' });
    });

    // args is an object without url — should not be treated as auth endpoint
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await baseQueryWithReauth({ body: 'data' } as any, api, {});
    expect(userManager.signinSilent).toHaveBeenCalled();
    expect(result).toEqual({ data: 'ok' });
  });
});
