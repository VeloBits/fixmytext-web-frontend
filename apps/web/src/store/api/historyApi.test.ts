import { configureStore } from '@reduxjs/toolkit';
import {
  historyApi,
  useGetHistoryQuery,
  useRecordOperationMutation,
  useDeleteHistoryEntryMutation,
  useClearHistoryMutation,
} from './historyApi';

function createStore() {
  return configureStore({
    reducer: { [historyApi.reducerPath]: historyApi.reducer },
    middleware: (gDM) => gDM().concat(historyApi.middleware),
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

describe('historyApi', () => {
  it('has reducerPath "historyApi"', () => {
    expect(historyApi.reducerPath).toBe('historyApi');
  });

  it('has a reducer function', () => {
    expect(typeof historyApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof historyApi.middleware).toBe('function');
  });

  it('defines all expected endpoints', () => {
    const names = Object.keys(historyApi.endpoints);
    expect(names).toContain('getHistory');
    expect(names).toContain('recordOperation');
    expect(names).toContain('deleteHistoryEntry');
    expect(names).toContain('clearHistory');
  });

  it('exports all hooks', () => {
    expect(typeof useGetHistoryQuery).toBe('function');
    expect(typeof useRecordOperationMutation).toBe('function');
    expect(typeof useDeleteHistoryEntryMutation).toBe('function');
    expect(typeof useClearHistoryMutation).toBe('function');
  });
});

describe('historyApi endpoint query callbacks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    vi.spyOn(global, 'fetch').mockResolvedValue(ok200());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getHistory with no args uses default page=1 and page_size=25', async () => {
    await store.dispatch(historyApi.endpoints.getHistory.initiate());
    const url = lastRequest().url;
    expect(url).toContain('/api/v1/history');
    expect(url).toContain('page=1');
    expect(url).toContain('page_size=25');
  });

  it('getHistory with custom page and pageSize', async () => {
    await store.dispatch(
      historyApi.endpoints.getHistory.initiate({ page: 3, pageSize: 10 }),
    );
    const url = lastRequest().url;
    expect(url).toContain('page=3');
    expect(url).toContain('page_size=10');
  });

  it('getHistory with toolId appends tool_id param (branch: toolId truthy)', async () => {
    await store.dispatch(
      historyApi.endpoints.getHistory.initiate({ toolId: 'hash-md5' }),
    );
    expect(lastRequest().url).toContain('tool_id=hash-md5');
  });

  it('getHistory without toolId omits tool_id param (branch: toolId falsy)', async () => {
    await store.dispatch(historyApi.endpoints.getHistory.initiate({ page: 1, pageSize: 5 }));
    expect(lastRequest().url).not.toContain('tool_id');
  });

  it('recordOperation sends POST to /history', async () => {
    await store.dispatch(
      historyApi.endpoints.recordOperation.initiate({ tool_id: 'md5', input: 'hi', output: 'abc' } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/history');
    expect(req.method).toBe('POST');
  });

  it('deleteHistoryEntry sends DELETE to /history/:id', async () => {
    await store.dispatch(historyApi.endpoints.deleteHistoryEntry.initiate('entry-42'));
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/history/entry-42');
    expect(req.method).toBe('DELETE');
  });

  it('clearHistory sends DELETE to /history', async () => {
    await store.dispatch(historyApi.endpoints.clearHistory.initiate());
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/history');
    expect(req.method).toBe('DELETE');
  });
});
