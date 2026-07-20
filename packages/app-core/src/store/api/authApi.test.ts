import { configureStore } from '@reduxjs/toolkit';
import { authApi, useGetMeQuery } from './authApi';

describe('authApi', () => {
  it('has reducerPath "authApi"', () => {
    expect(authApi.reducerPath).toBe('authApi');
  });

  it('has a reducer function', () => {
    expect(typeof authApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof authApi.middleware).toBe('function');
  });

  it('defines getMe endpoint', () => {
    const endpointNames = Object.keys(authApi.endpoints);
    expect(endpointNames).toContain('getMe');
  });

  it('exports useGetMeQuery hook', () => {
    expect(typeof useGetMeQuery).toBe('function');
  });

  it('has Me tag type', () => {
    expect(authApi).toBeDefined();
  });
});

describe('authApi endpoint execution', () => {
  const mockFetch = vi.fn();

  function makeStore() {
    return configureStore({
      reducer: { [authApi.reducerPath]: authApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(authApi.middleware),
    });
  }

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('getMe issues a GET to /api/v1/auth/me', async () => {
    const store = makeStore();

    await store.dispatch(authApi.endpoints.getMe.initiate());

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const request = mockFetch.mock.calls[0]![0] as Request;
    expect(request.url).toContain('/api/v1/auth/me');
    expect(request.method).toBe('GET');
  });
});
