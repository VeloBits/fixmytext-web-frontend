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
