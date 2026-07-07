vi.mock('../../hooks/useFingerprint', () => ({
  getVisitorId: vi.fn(() => 'test-visitor-id'),
}));

import { configureStore } from '@reduxjs/toolkit';
import { textApi, useTransformTextMutation } from './textApi';

describe('textApi', () => {
  it('has reducerPath "textApi"', () => {
    expect(textApi.reducerPath).toBe('textApi');
  });

  it('has a reducer function', () => {
    expect(typeof textApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof textApi.middleware).toBe('function');
  });

  it('defines transformText endpoint', () => {
    expect(textApi.endpoints).toHaveProperty('transformText');
  });

  it('exports useTransformTextMutation hook', () => {
    expect(typeof useTransformTextMutation).toBe('function');
  });
});

describe('textApi endpoint execution', () => {
  const mockFetch = vi.fn();

  function makeStore() {
    return configureStore({
      reducer: { [textApi.reducerPath]: textApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(textApi.middleware),
    });
  }

  beforeEach(() => {
    mockFetch.mockReset();
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ output: 'HELLO' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('transformText POSTs the text payload to the given endpoint', async () => {
    const store = makeStore();

    await store.dispatch(
      textApi.endpoints.transformText.initiate({
        endpoint: '/api/v1/text/uppercase',
        text: 'hello',
      })
    );

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const request = mockFetch.mock.calls[0][0] as Request;
    expect(request.url).toContain('/api/v1/text/uppercase');
    expect(request.method).toBe('POST');
  });

  it('transformText sends the X-Visitor-Id fingerprint header', async () => {
    const store = makeStore();

    await store.dispatch(
      textApi.endpoints.transformText.initiate({
        endpoint: '/api/v1/text/lowercase',
        text: 'HELLO',
      })
    );

    const request = mockFetch.mock.calls[0][0] as Request;
    expect(request.headers.get('X-Visitor-Id')).toBe('test-visitor-id');
  });
});
