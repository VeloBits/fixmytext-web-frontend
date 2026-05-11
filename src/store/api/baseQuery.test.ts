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
let capturedFetchBaseQueryConfig = null;

vi.mock('@reduxjs/toolkit/query/react', () => ({
  fetchBaseQuery: (config) => {
    capturedFetchBaseQueryConfig = config;
    return mockRawBaseQuery;
  },
  retry: (baseQueryFn, options) => {
    // Expose the retry wrapper so we can test retryCondition directly.
    // Simulate retry behaviour: call baseQueryFn, and if it returns an error
    // that satisfies retryCondition, call it again up to maxRetries times.
    const wrapped = async (args, api, extraOptions) => {
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
  // Re-apply the mock (resetModules drops it)
  vi.mock('@reduxjs/toolkit/query/react', () => ({
    fetchBaseQuery: (config) => {
      capturedFetchBaseQueryConfig = config;
      return mockRawBaseQuery;
    },
    retry: (baseQueryFn, options) => {
      const wrapped = async (args, api, extraOptions) => {
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

  const mod = await import('./baseQuery');
  return mod;
}

function makeApi(accessToken = 'test-token') {
  return {
    getState: () => ({ auth: { accessToken } }),
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
    const { createAuthBaseQuery } = await freshImport();
    createAuthBaseQuery(); // triggers fetchBaseQuery mock → captures config

    const headers = new Headers();
    const api = makeApi('my-access-token');

    const returned = capturedFetchBaseQueryConfig.prepareHeaders(headers, api);

    expect(returned.get('Authorization')).toBe('Bearer my-access-token');
  });

  it('does not set Authorization header when accessToken is falsy', async () => {
    const { createAuthBaseQuery } = await freshImport();
    createAuthBaseQuery();

    const headers = new Headers();
    const api = makeApi(null);

    const returned = capturedFetchBaseQueryConfig.prepareHeaders(headers, api);

    expect(returned.get('Authorization')).toBeNull();
  });

  it('calls extraHeaders callback when provided', async () => {
    const { createAuthBaseQuery } = await freshImport();
    const extraHeaders = vi.fn();
    createAuthBaseQuery(extraHeaders);

    const headers = new Headers();
    const api = makeApi('tok');

    capturedFetchBaseQueryConfig.prepareHeaders(headers, api);

    expect(extraHeaders).toHaveBeenCalledWith(headers, api);
  });

  it('does not call extraHeaders when it is undefined', async () => {
    const { createAuthBaseQuery } = await freshImport();
    createAuthBaseQuery(); // no extraHeaders

    const headers = new Headers();
    const api = makeApi('tok');

    // Should not throw
    expect(() => capturedFetchBaseQueryConfig.prepareHeaders(headers, api)).not.toThrow();
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

  it('resets retryCount on successful request after a prior 401 cycle', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();

    // First call: 401 → refresh succeeds → retry succeeds
    let callCount = 0;
    mockRawBaseQuery.mockImplementation((args) => {
      const url = typeof args === 'string' ? args : args?.url;
      if (url === '/api/v1/auth/refresh') {
        return Promise.resolve({ data: { access_token: 'new-tok' } });
      }
      callCount++;
      if (callCount === 1) return Promise.resolve({ error: { status: 401 } });
      return Promise.resolve({ data: 'ok' });
    });

    await baseQueryWithReauth('/resource', api, {});

    // Now make another 401 call — it should still attempt refresh
    // because retryCount was reset by the successful result.
    callCount = 0;
    const result = await baseQueryWithReauth('/resource2', api, {});
    expect(result).toEqual({ data: 'ok' });
  });
});

// ---------------------------------------------------------------------------
// 3. baseQueryWithReauth — 401 → refresh → retry flow (success)
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — 401 refresh flow', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('refreshes token and retries the original request on 401', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi('old-token');

    let callIndex = 0;
    mockRawBaseQuery.mockImplementation((args) => {
      const url = typeof args === 'string' ? args : args?.url;

      // Refresh endpoint → success
      if (url === '/api/v1/auth/refresh') {
        return Promise.resolve({ data: { access_token: 'new-token' } });
      }

      callIndex++;
      // First call to the real endpoint → 401
      if (callIndex === 1) {
        return Promise.resolve({ error: { status: 401 } });
      }
      // Retry after refresh → success
      return Promise.resolve({ data: 'retried-ok' });
    });

    const result = await baseQueryWithReauth('/protected', api, {});

    // Token refresh dispatched
    expect(api.dispatch).toHaveBeenCalledWith({
      type: 'auth/tokenRefreshed',
      payload: 'new-token',
    });

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

  it('dispatches logout when token refresh fails', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi('old-token');

    mockRawBaseQuery.mockImplementation((args) => {
      const url = typeof args === 'string' ? args : args?.url;

      if (url === '/api/v1/auth/refresh') {
        // Refresh returns error (no data)
        return Promise.resolve({ error: { status: 401 } });
      }

      // Original request → 401
      return Promise.resolve({ error: { status: 401 } });
    });

    const result = await baseQueryWithReauth('/protected', api, {});

    expect(api.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
    // Original error is still returned
    expect(result.error.status).toBe(401);
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
    expect(result.error.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 6. baseQueryWithReauth — max retry exceeded → logout
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — max retry exceeded', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('forces logout when refresh retry limit is exceeded', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();

    // Every call returns 401, refresh always "succeeds" so retryCount increments
    mockRawBaseQuery.mockImplementation((args) => {
      const url = typeof args === 'string' ? args : args?.url;
      if (url === '/api/v1/auth/refresh') {
        return Promise.resolve({ data: { access_token: 'tok' } });
      }
      return Promise.resolve({ error: { status: 401 } });
    });

    // First call: 401 → refresh (retryCount 0→1) → retry → still 401 (retryCount reset won't happen because still error)
    await baseQueryWithReauth('/resource', api, {});

    // Second call: retryCount is now 1 (== MAX_REFRESH_RETRIES), so it should
    // skip refresh and force logout immediately.
    const result2 = await baseQueryWithReauth('/resource', api, {});

    expect(api.dispatch).toHaveBeenCalledWith({ type: 'auth/logout' });
    expect(result2.error.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// 7. Concurrent 401s share a single refresh (mutex)
// ---------------------------------------------------------------------------

describe('baseQueryWithReauth — refresh mutex', () => {
  beforeEach(() => {
    mockRawBaseQuery.mockReset();
  });

  it('concurrent 401 requests share one refresh call', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();
    let refreshCallCount = 0;

    // Use a deferred promise for the refresh so we can control timing
    let resolveRefresh;
    const refreshDeferred = new Promise((r) => {
      resolveRefresh = r;
    });

    mockRawBaseQuery.mockImplementation((args) => {
      const url = typeof args === 'string' ? args : args?.url;
      if (url === '/api/v1/auth/refresh') {
        refreshCallCount++;
        return refreshDeferred;
      }
      // First time each request is called → 401
      // After refresh → success
      if (!args._retried) {
        const newArgs =
          typeof args === 'string' ? { url: args, _retried: true } : { ...args, _retried: true };
        // Store that we've retried by checking call count per url
        return Promise.resolve({ error: { status: 401 } });
      }
      return Promise.resolve({ data: 'ok' });
    });

    // Fire two concurrent requests
    const p1 = baseQueryWithReauth('/a', api, {});
    const p2 = baseQueryWithReauth('/b', api, {});

    // Let the event loop settle so both enter the 401 branch
    await new Promise((r) => setTimeout(r, 0));

    // Resolve the single refresh
    resolveRefresh({ data: { access_token: 'fresh' } });

    await Promise.all([p1, p2]);

    // Refresh endpoint should have been called only once due to mutex
    expect(refreshCallCount).toBe(1);
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
    const retryCondition = baseQueryWithRetry._retryOptions.retryCondition;

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
    const retryCondition = baseQueryWithRetry._retryOptions.retryCondition;

    expect(retryCondition({ status: 500 }, {}, { attempt: 1 })).toBe(true);
    expect(retryCondition({ status: 502 }, {}, { attempt: 1 })).toBe(true);
    expect(retryCondition({ status: 503 }, {}, { attempt: 2 })).toBe(true);
  });

  it('stops retrying when attempt exceeds 2', async () => {
    const { baseQueryWithRetry } = await freshImport();
    const retryCondition = baseQueryWithRetry._retryOptions.retryCondition;

    // attempt 3 — should not retry even for 500
    expect(retryCondition({ status: 500 }, {}, { attempt: 3 })).toBe(false);
  });

  it('retries when error has no status (network errors)', async () => {
    const { baseQueryWithRetry } = await freshImport();
    const retryCondition = baseQueryWithRetry._retryOptions.retryCondition;

    // No status property — treated as non-4xx, should retry
    expect(retryCondition({}, {}, { attempt: 1 })).toBe(true);
    expect(retryCondition(null, {}, { attempt: 1 })).toBe(true);
  });

  it('has maxRetries set to 2', async () => {
    const { baseQueryWithRetry } = await freshImport();
    expect(baseQueryWithRetry._retryOptions.maxRetries).toBe(2);
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
    const { createBaseQueryWithReauth } = await freshImport();
    const extraHeaders = vi.fn((headers) => {
      headers.set('X-Custom', 'value');
    });

    const query = createBaseQueryWithReauth(extraHeaders);
    expect(typeof query).toBe('function');

    // Verify extraHeaders was wired into fetchBaseQuery config
    const headers = new Headers();
    const api = makeApi('tok');
    capturedFetchBaseQueryConfig.prepareHeaders(headers, api);

    expect(extraHeaders).toHaveBeenCalled();
  });

  it('performs reauth on 401 for custom header query', async () => {
    const { createBaseQueryWithReauth } = await freshImport();
    const query = createBaseQueryWithReauth(() => {});
    const api = makeApi();

    let callIndex = 0;
    mockRawBaseQuery.mockImplementation((args) => {
      const url = typeof args === 'string' ? args : args?.url;
      if (url === '/api/v1/auth/refresh') {
        return Promise.resolve({ data: { access_token: 'new' } });
      }
      callIndex++;
      if (callIndex === 1) return Promise.resolve({ error: { status: 401 } });
      return Promise.resolve({ data: 'ok-custom' });
    });

    const result = await query('/custom-endpoint', api, {});

    expect(api.dispatch).toHaveBeenCalledWith({
      type: 'auth/tokenRefreshed',
      payload: 'new',
    });
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
    expect(result.error.status).toBe(403);
    expect(mockRawBaseQuery).toHaveBeenCalledTimes(1);
  });

  it('does not attempt refresh on 500 errors', async () => {
    const { baseQueryWithReauth } = await freshImport();
    const api = makeApi();

    mockRawBaseQuery.mockResolvedValue({ error: { status: 500 } });

    const result = await baseQueryWithReauth('/server-error', api, {});

    expect(api.dispatch).not.toHaveBeenCalled();
    expect(result.error.status).toBe(500);
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
    const api = makeApi();

    let callIndex = 0;
    mockRawBaseQuery.mockImplementation((args) => {
      const url = typeof args === 'string' ? args : args?.url;
      if (url === '/api/v1/auth/refresh') {
        return Promise.resolve({ data: { access_token: 'tok' } });
      }
      callIndex++;
      if (callIndex === 1) return Promise.resolve({ error: { status: 401 } });
      return Promise.resolve({ data: 'ok' });
    });

    // args is an object without url — should not be treated as auth endpoint
    const result = await baseQueryWithReauth({ body: 'data' }, api, {});
    expect(api.dispatch).toHaveBeenCalledWith({
      type: 'auth/tokenRefreshed',
      payload: 'tok',
    });
  });
});
