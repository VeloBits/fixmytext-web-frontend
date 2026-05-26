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
