import { configureStore } from '@reduxjs/toolkit';
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

describe('subscriptionApi endpoint execution', () => {
  const mockFetch = vi.fn();

  function makeStore() {
    return configureStore({
      reducer: { [subscriptionApi.reducerPath]: subscriptionApi.reducer },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(subscriptionApi.middleware),
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

  it('getSubscriptionStatus issues a GET to /api/v1/subscription/status', async () => {
    const store = makeStore();

    await store.dispatch(subscriptionApi.endpoints.getSubscriptionStatus.initiate());

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/subscription/status');
    expect(request.method).toBe('GET');
  });

  it('createProCheckout issues a POST to /api/v1/subscription/checkout', async () => {
    const store = makeStore();

    await store.dispatch(subscriptionApi.endpoints.createProCheckout.initiate());

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/subscription/checkout');
    expect(request.method).toBe('POST');
  });

  it('verifyProPayment issues a POST to /api/v1/subscription/verify', async () => {
    const store = makeStore();

    await store.dispatch(
      subscriptionApi.endpoints.verifyProPayment.initiate({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'sig',
      })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/subscription/verify');
    expect(request.method).toBe('POST');
  });

  it('cancelSubscription issues a POST to /api/v1/subscription/cancel', async () => {
    const store = makeStore();

    await store.dispatch(subscriptionApi.endpoints.cancelSubscription.initiate());

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/subscription/cancel');
    expect(request.method).toBe('POST');
  });
});
