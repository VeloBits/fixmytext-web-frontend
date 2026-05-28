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

function createStore() {
  return configureStore({
    reducer: { [passesApi.reducerPath]: passesApi.reducer },
    middleware: (gDM) => gDM().concat(passesApi.middleware),
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

describe('passesApi endpoint query callbacks', () => {
  let store: ReturnType<typeof createStore>;

  beforeEach(() => {
    store = createStore();
    vi.spyOn(global, 'fetch').mockResolvedValue(ok200());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getPassCatalog builds catalog URL with region query param', async () => {
    await store.dispatch(passesApi.endpoints.getPassCatalog.initiate());
    expect(lastRequest().url).toContain('/api/v1/passes/catalog');
  });

  it('getActivePasses fetches the active passes URL', async () => {
    await store.dispatch(passesApi.endpoints.getActivePasses.initiate());
    expect(lastRequest().url).toContain('/api/v1/passes/active');
  });

  it('createPassOrder sends POST to /passes/order', async () => {
    await store.dispatch(
      passesApi.endpoints.createPassOrder.initiate({ pass_id: 'p1', quantity: 1 } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/passes/order');
    expect(req.method).toBe('POST');
  });

  it('createCreditOrder sends POST to /passes/credit-order', async () => {
    await store.dispatch(
      passesApi.endpoints.createCreditOrder.initiate({ credits: 10 } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/passes/credit-order');
    expect(req.method).toBe('POST');
  });

  it('verifyPayment sends POST to /passes/verify', async () => {
    await store.dispatch(
      passesApi.endpoints.verifyPayment.initiate({
        razorpay_payment_id: 'pay_1',
        razorpay_order_id: 'ord_1',
        razorpay_signature: 'sig',
      } as never),
    );
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/passes/verify');
    expect(req.method).toBe('POST');
  });

  it('spinWheel sends POST to /passes/spin', async () => {
    await store.dispatch(passesApi.endpoints.spinWheel.initiate());
    const req = lastRequest();
    expect(req.url).toContain('/api/v1/passes/spin');
    expect(req.method).toBe('POST');
  });
});
