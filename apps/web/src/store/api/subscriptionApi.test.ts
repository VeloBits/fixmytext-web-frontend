import { configureStore } from '@reduxjs/toolkit';
import {
  subscriptionApi,
  useGetSubscriptionStatusQuery,
  useCreateProCheckoutMutation,
  useVerifyProPaymentMutation,
  useCancelSubscriptionMutation,
} from './subscriptionApi';

function createStore() {
  return configureStore({
    reducer: { [subscriptionApi.reducerPath]: subscriptionApi.reducer },
    middleware: (gDM) => gDM().concat(subscriptionApi.middleware),
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

describe('subscriptionApi endpoint query callbacks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    vi.spyOn(global, 'fetch').mockResolvedValue(ok200());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getSubscriptionStatus fetches the status URL', async () => {
    await store.dispatch(subscriptionApi.endpoints.getSubscriptionStatus.initiate());
    expect(lastRequest().url).toContain('/api/v1/subscription/status');
  });

  it('createProCheckout sends POST to /subscription/checkout', async () => {
    await store.dispatch(subscriptionApi.endpoints.createProCheckout.initiate());
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/subscription/checkout');
    expect(req.method).toBe('POST');
  });

  it('verifyProPayment sends POST to /subscription/verify', async () => {
    await store.dispatch(
      subscriptionApi.endpoints.verifyProPayment.initiate({
        razorpay_payment_id: 'pay_1',
        razorpay_order_id: 'ord_1',
        razorpay_signature: 'sig',
      } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/subscription/verify');
    expect(req.method).toBe('POST');
  });

  it('cancelSubscription sends POST to /subscription/cancel', async () => {
    await store.dispatch(subscriptionApi.endpoints.cancelSubscription.initiate());
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/subscription/cancel');
    expect(req.method).toBe('POST');
  });
});
