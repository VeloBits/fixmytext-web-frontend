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
