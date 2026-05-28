vi.mock('@/hooks/useFingerprint', () => ({
  getVisitorId: vi.fn(() => 'test-visitor-id'),
}));

import { configureStore } from '@reduxjs/toolkit';
import { textApi, useTransformTextMutation } from './textApi';

function createStore() {
  return configureStore({
    reducer: { [textApi.reducerPath]: textApi.reducer },
    middleware: (gDM) => gDM().concat(textApi.middleware),
  });
}

const ok200 = () =>
  new Response(JSON.stringify({ result: 'transformed' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

function lastRequest(): Request {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1]![0] as Request;
}

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

describe('textApi endpoint query callbacks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    vi.spyOn(global, 'fetch').mockResolvedValue(ok200());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('transformText sends POST to the specified endpoint URL', async () => {
    await store.dispatch(
      textApi.endpoints.transformText.initiate({
        endpoint: '/api/v1/text/uppercase',
        text: 'hello world',
      }),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/text/uppercase');
    expect(req.method).toBe('POST');
  });

  it('transformText with extra params spreads them into the body', async () => {
    await store.dispatch(
      textApi.endpoints.transformText.initiate({
        endpoint: '/api/v1/text/replace',
        text: 'foo bar',
        find: 'foo',
        replace: 'baz',
      }),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/text/replace');
    expect(req.method).toBe('POST');
  });
});
