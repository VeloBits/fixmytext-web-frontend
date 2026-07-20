import { configureStore } from '@reduxjs/toolkit';
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

describe('passesApi endpoint execution', () => {
  const mockFetch = vi.fn();

  function makeStore() {
    return configureStore({
      reducer: { [passesApi.reducerPath]: passesApi.reducer },
      middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(passesApi.middleware),
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

  it('getPassCatalog issues a GET to /api/v1/passes/catalog with region', async () => {
    const store = makeStore();

    await store.dispatch(passesApi.endpoints.getPassCatalog.initiate());

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/passes/catalog?region=');
    expect(request.method).toBe('GET');
  });

  it('getActivePasses issues a GET to /api/v1/passes/active', async () => {
    const store = makeStore();

    await store.dispatch(passesApi.endpoints.getActivePasses.initiate());

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/passes/active');
    expect(request.method).toBe('GET');
  });

  it('createPassOrder issues a POST to /api/v1/passes/order', async () => {
    const store = makeStore();

    await store.dispatch(
      passesApi.endpoints.createPassOrder.initiate({
        pass_id: 'day_triple',
        tool_ids: ['uppercase'],
        region: 'US',
      })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/passes/order');
    expect(request.method).toBe('POST');
  });

  it('createCreditOrder issues a POST to /api/v1/passes/credit-order', async () => {
    const store = makeStore();

    await store.dispatch(
      passesApi.endpoints.createCreditOrder.initiate({ pack_id: 'credits_15', region: 'US' })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/passes/credit-order');
    expect(request.method).toBe('POST');
  });

  it('verifyPayment issues a POST to /api/v1/passes/verify', async () => {
    const store = makeStore();

    await store.dispatch(
      passesApi.endpoints.verifyPayment.initiate({
        razorpay_order_id: 'order_1',
        razorpay_payment_id: 'pay_1',
        razorpay_signature: 'sig',
        item_id: 'day_triple',
        item_type: 'pass',
      })
    );

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/passes/verify');
    expect(request.method).toBe('POST');
  });

  it('spinWheel issues a POST to /api/v1/passes/spin', async () => {
    const store = makeStore();

    await store.dispatch(passesApi.endpoints.spinWheel.initiate());

    const request = lastRequest();
    expect(request.url).toContain('/api/v1/passes/spin');
    expect(request.method).toBe('POST');
  });
});
