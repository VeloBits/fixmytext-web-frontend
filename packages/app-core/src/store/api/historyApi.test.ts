import { configureStore } from '@reduxjs/toolkit';
import {
  historyApi,
  useGetHistoryQuery,
  useRecordOperationMutation,
  useDeleteHistoryEntryMutation,
  useClearHistoryMutation,
} from './historyApi';

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

describe('historyApi endpoint execution', () => {
  const mockFetch = vi.fn();

  function makeStore() {
    return configureStore({
      reducer: { [historyApi.reducerPath]: historyApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(historyApi.middleware),
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

  it('getHistory defaults to page=1 and page_size=25', async () => {
    const store = makeStore();

    await store.dispatch(historyApi.endpoints.getHistory.initiate());

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/history?page=1&page_size=25');
    expect(request.url).not.toContain('tool_id');
    expect(request.method).toBe('GET');
  });

  it('getHistory forwards page, pageSize and toolId', async () => {
    const store = makeStore();

    await store.dispatch(
      historyApi.endpoints.getHistory.initiate({ page: 3, pageSize: 10, toolId: 'uppercase' })
    );

    const request = lastRequest();
    expect(request.url).toContain('page=3');
    expect(request.url).toContain('page_size=10');
    expect(request.url).toContain('tool_id=uppercase');
  });

  it('recordOperation issues a POST to /api/v1/history', async () => {
    const store = makeStore();

    await store.dispatch(
      historyApi.endpoints.recordOperation.initiate({
        tool_id: 'uppercase',
        tool_label: 'UPPERCASE',
        tool_type: 'transform',
        input_preview: 'hello',
        output_preview: 'HELLO',
        input_length: 5,
        output_length: 5,
        status: 'success',
      })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/history');
    expect(request.method).toBe('POST');
  });

  it('deleteHistoryEntry issues a DELETE to /api/v1/history/:id', async () => {
    const store = makeStore();

    await store.dispatch(historyApi.endpoints.deleteHistoryEntry.initiate('entry-1'));

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/history/entry-1');
    expect(request.method).toBe('DELETE');
  });

  it('clearHistory issues a DELETE to /api/v1/history', async () => {
    const store = makeStore();

    await store.dispatch(historyApi.endpoints.clearHistory.initiate());

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/history');
    expect(request.method).toBe('DELETE');
  });
});
