import {
  subscriptionApi,
  useGetSubscriptionStatusQuery,
  useCreateProCheckoutMutation,
  useVerifyProPaymentMutation,
  useCancelSubscriptionMutation,
} from './subscriptionApi';

describe('subscriptionApi', () => {
  it('has reducerPath "subscriptionApi"', () => {
    expect(subscriptionApi.reducerPath).toBe('subscriptionApi');
  });

  it('has a reducer function', () => {
    expect(typeof subscriptionApi.reducer).toBe('function');
  });

  it('has middleware function', () => {
    expect(typeof subscriptionApi.middleware).toBe('function');
  });

  it('defines all expected endpoints', () => {
    const names = Object.keys(subscriptionApi.endpoints);
    expect(names).toContain('getSubscriptionStatus');
    expect(names).toContain('createProCheckout');
    expect(names).toContain('verifyProPayment');
    expect(names).toContain('cancelSubscription');
  });

  it('exports all hooks', () => {
    expect(typeof useGetSubscriptionStatusQuery).toBe('function');
    expect(typeof useCreateProCheckoutMutation).toBe('function');
    expect(typeof useVerifyProPaymentMutation).toBe('function');
    expect(typeof useCancelSubscriptionMutation).toBe('function');
  });
});
