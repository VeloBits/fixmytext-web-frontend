import { configureStore } from '@reduxjs/toolkit';
import { shareApi, useCreateShareMutation, useGetShareQuery } from './shareApi';

function createStore() {
  return configureStore({
    reducer: { [shareApi.reducerPath]: shareApi.reducer },
    middleware: (gDM) => gDM().concat(shareApi.middleware),
  });
}

const ok200 = () =>
  new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

function lastRequest(): Request {
  const calls = (fetch as ReturnType<typeof vi.fn>).mock.calls;
  return calls[calls.length - 1]![0] as Request;
}

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

describe('shareApi endpoint query callbacks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    vi.spyOn(global, 'fetch').mockResolvedValue(ok200());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('createShare sends POST to /share', async () => {
    await store.dispatch(
      shareApi.endpoints.createShare.initiate({ tool_id: 'md5', result: 'abc' } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/share');
    expect(req.method).toBe('POST');
  });

  it('getShare builds URL with the share id', async () => {
    await store.dispatch(shareApi.endpoints.getShare.initiate('share-xyz'));
    expect(lastRequest().url).toContain('/api/v1/share/share-xyz');
  });
});
