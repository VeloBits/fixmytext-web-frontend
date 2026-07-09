import { configureStore } from '@reduxjs/toolkit';
import { shareApi, useCreateShareMutation, useGetShareQuery } from './shareApi';

describe('shareApi', () => {
  it('has reducerPath "shareApi"', () => {
    expect(shareApi.reducerPath).toBe('shareApi');
  });

  it('has a reducer function', () => {
    expect(typeof shareApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof shareApi.middleware).toBe('function');
  });

  it('defines all expected endpoints', () => {
    const names = Object.keys(shareApi.endpoints);
    expect(names).toContain('createShare');
    expect(names).toContain('getShare');
  });

  it('exports all hooks', () => {
    expect(typeof useCreateShareMutation).toBe('function');
    expect(typeof useGetShareQuery).toBe('function');
  });
});

describe('shareApi endpoint execution', () => {
  const mockFetch = vi.fn();

  function makeStore() {
    return configureStore({
      reducer: { [shareApi.reducerPath]: shareApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(shareApi.middleware),
    });
  }

  function lastRequest(): Request {
    return mockFetch.mock.calls[mockFetch.mock.calls.length - 1]![0] as Request;
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

  it('createShare issues a POST to /api/v1/share', async () => {
    const store = makeStore();

    await store.dispatch(
      shareApi.endpoints.createShare.initiate({
        tool_id: 'uppercase',
        tool_label: 'UPPERCASE',
        output_text: 'HELLO',
      })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/share');
    expect(request.method).toBe('POST');
  });

  it('getShare issues a GET to /api/v1/share/:id', async () => {
    const store = makeStore();

    await store.dispatch(shareApi.endpoints.getShare.initiate('share-1'));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/share/share-1');
    expect(request.method).toBe('GET');
  });
});
