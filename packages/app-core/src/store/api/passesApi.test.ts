import {
  passesApi,
  useGetPassCatalogQuery,
  useGetActivePassesQuery,
  useCreatePassOrderMutation,
  useCreateCreditOrderMutation,
  useVerifyPaymentMutation,
  useSpinWheelMutation,
} from './passesApi';

describe('passesApi', () => {
  it('has reducerPath "passesApi"', () => {
    expect(passesApi.reducerPath).toBe('passesApi');
  });

  it('has a reducer function', () => {
    expect(typeof passesApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof passesApi.middleware).toBe('function');
  });

  it('defines all expected endpoints', () => {
    const names = Object.keys(passesApi.endpoints);
    expect(names).toContain('getPassCatalog');
    expect(names).toContain('getActivePasses');
    expect(names).toContain('createPassOrder');
    expect(names).toContain('createCreditOrder');
    expect(names).toContain('verifyPayment');
    expect(names).toContain('spinWheel');
  });

  it('exports all hooks', () => {
    expect(typeof useGetPassCatalogQuery).toBe('function');
    expect(typeof useGetActivePassesQuery).toBe('function');
    expect(typeof useCreatePassOrderMutation).toBe('function');
    expect(typeof useCreateCreditOrderMutation).toBe('function');
    expect(typeof useVerifyPaymentMutation).toBe('function');
    expect(typeof useSpinWheelMutation).toBe('function');
  });
});
