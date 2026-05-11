import type { Mock } from 'vitest';
import { openRazorpayCheckout, executeCheckoutFlow } from './razorpay';
import type { RazorpayOptions, RazorpayConstructor, RazorpayPaymentResponse } from './razorpay';

// Helper to extract the options passed to the Razorpay constructor mock.
// vi.fn() mock.calls is typed as [] when no generics provided; cast is safe here.
function getRazorpayOpts(mock: Mock): RazorpayOptions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (mock.mock as any).calls[0][0] as RazorpayOptions;
}

describe('openRazorpayCheckout', () => {
  let onSuccess: Mock<(response: RazorpayPaymentResponse) => void>;
  let onFailure: Mock<(msg: string) => void>;

  beforeEach(() => {
    onSuccess = vi.fn();
    onFailure = vi.fn();
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Razorpay = undefined;
  });

  it('calls onFailure when Razorpay is not loaded', () => {
    openRazorpayCheckout({ onSuccess, onFailure });
    expect(onFailure).toHaveBeenCalledWith('Payment service unavailable. Please refresh the page.');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('does not throw when Razorpay missing and no onFailure', () => {
    expect(() => openRazorpayCheckout({ onSuccess })).not.toThrow();
  });

  it('creates Razorpay instance and calls open', () => {
    const openMock = vi.fn();
    const RazorpayMock = vi.fn(function () { return { open: openMock }; });
    window.Razorpay = RazorpayMock as unknown as RazorpayConstructor;

    openRazorpayCheckout({
      orderId: 'order_123',
      amount: 1000,
      currency: 'inr',
      keyId: 'key_test',
      userEmail: 'test@example.com',
      userName: 'Test User',
      description: 'Test purchase',
      onSuccess,
      onFailure,
    });

    expect(RazorpayMock).toHaveBeenCalledTimes(1);
    expect(openMock).toHaveBeenCalledTimes(1);

    const opts = getRazorpayOpts(RazorpayMock);
    expect(opts.key).toBe('key_test');
    expect(opts.amount).toBe(1000);
    expect(opts.currency).toBe('INR');
    expect(opts.order_id).toBe('order_123');
    expect(opts.prefill.email).toBe('test@example.com');
    expect(opts.name).toBe('FixMyText');
  });

  it('calls onSuccess via handler', () => {
    const openMock = vi.fn();
    const RazorpayMock = vi.fn(function () { return { open: openMock }; });
    window.Razorpay = RazorpayMock as unknown as RazorpayConstructor;

    openRazorpayCheckout({
      orderId: 'o',
      amount: 1,
      currency: 'usd',
      keyId: 'k',
      onSuccess,
      onFailure,
    });

    const opts = getRazorpayOpts(RazorpayMock);
    const response = { razorpay_payment_id: 'pay_1' } as RazorpayPaymentResponse;
    opts.handler(response);
    expect(onSuccess).toHaveBeenCalledWith(response);
  });

  it('calls onFailure on modal dismiss', () => {
    const openMock = vi.fn();
    const RazorpayMock = vi.fn(function () { return { open: openMock }; });
    window.Razorpay = RazorpayMock as unknown as RazorpayConstructor;

    openRazorpayCheckout({
      orderId: 'o',
      amount: 1,
      currency: 'usd',
      keyId: 'k',
      onSuccess,
      onFailure,
    });

    const opts = getRazorpayOpts(RazorpayMock);
    opts.modal.ondismiss();
    expect(onFailure).toHaveBeenCalledWith('Payment cancelled');
  });

  it('uses default description when not provided', () => {
    const openMock = vi.fn();
    const RazorpayMock = vi.fn(function () { return { open: openMock }; });
    window.Razorpay = RazorpayMock as unknown as RazorpayConstructor;

    openRazorpayCheckout({
      orderId: 'o',
      amount: 1,
      currency: 'usd',
      keyId: 'k',
      onSuccess,
      onFailure,
    });

    const opts = getRazorpayOpts(RazorpayMock);
    expect(opts.description).toBe('Pass / Credits Purchase');
  });
});

describe('executeCheckoutFlow', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let createOrder: Mock<() => Promise<any>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let openCheckout: Mock<(params: any) => void>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let verifyPayment: Mock<(r: any) => Promise<unknown>>;
  let showAlert: Mock<(msg: string, variant: string) => void>;
  let navigate: Mock<(path: string) => void>;

  beforeEach(() => {
    createOrder = vi.fn();
    openCheckout = vi.fn();
    verifyPayment = vi.fn();
    showAlert = vi.fn();
    navigate = vi.fn();
  });

  it('calls createOrder and openCheckout with merged data', async () => {
    const orderData = { orderId: 'o1', amount: 500 };
    createOrder.mockResolvedValue(orderData);

    await executeCheckoutFlow({
      createOrder,
      openCheckout,
      verifyPayment,
      successPath: '/success',
      failPath: '/fail',
      showAlert,
      navigate,
    });

    expect(createOrder).toHaveBeenCalled();
    expect(openCheckout).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (openCheckout.mock as any).calls[0][0];
    expect(callArgs.orderId).toBe('o1');
    expect(callArgs.amount).toBe(500);
    expect(typeof callArgs.onSuccess).toBe('function');
    expect(typeof callArgs.onFailure).toBe('function');
  });

  it('navigates to successPath on successful verification', async () => {
    createOrder.mockResolvedValue({ orderId: 'o1' });
    verifyPayment.mockResolvedValue({});

    await executeCheckoutFlow({
      createOrder,
      openCheckout,
      verifyPayment,
      successPath: '/success',
      failPath: '/fail',
      showAlert,
      navigate,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (openCheckout.mock as any).calls[0][0];
    await callArgs.onSuccess({ razorpay_payment_id: 'pay_1' });
    expect(verifyPayment).toHaveBeenCalledWith({ razorpay_payment_id: 'pay_1' });
    expect(navigate).toHaveBeenCalledWith('/success');
  });

  it('navigates to failPath when verification fails', async () => {
    createOrder.mockResolvedValue({ orderId: 'o1' });
    verifyPayment.mockRejectedValue(new Error('fail'));

    await executeCheckoutFlow({
      createOrder,
      openCheckout,
      verifyPayment,
      successPath: '/success',
      failPath: '/fail',
      showAlert,
      navigate,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (openCheckout.mock as any).calls[0][0];
    await callArgs.onSuccess({ razorpay_payment_id: 'pay_1' });
    expect(navigate).toHaveBeenCalledWith('/fail');
  });

  it('shows alert on onFailure callback', async () => {
    createOrder.mockResolvedValue({});

    await executeCheckoutFlow({
      createOrder,
      openCheckout,
      verifyPayment,
      successPath: '/s',
      failPath: '/f',
      showAlert,
      navigate,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (openCheckout.mock as any).calls[0][0];
    callArgs.onFailure('Payment cancelled');
    expect(showAlert).toHaveBeenCalledWith('Payment cancelled', 'info');
  });

  it('shows alert with default message on onFailure with empty msg', async () => {
    createOrder.mockResolvedValue({});

    await executeCheckoutFlow({
      createOrder,
      openCheckout,
      verifyPayment,
      successPath: '/s',
      failPath: '/f',
      showAlert,
      navigate,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const callArgs = (openCheckout.mock as any).calls[0][0];
    callArgs.onFailure('');
    expect(showAlert).toHaveBeenCalledWith('Payment cancelled', 'info');
  });

  it('shows alert when createOrder throws', async () => {
    createOrder.mockRejectedValue({ data: { detail: 'Server error' } });

    await executeCheckoutFlow({
      createOrder,
      openCheckout,
      verifyPayment,
      successPath: '/s',
      failPath: '/f',
      showAlert,
      navigate,
    });

    expect(showAlert).toHaveBeenCalledWith('Server error', 'danger');
  });

  it('shows default error message when createOrder throws without detail', async () => {
    createOrder.mockRejectedValue(new Error('network'));

    await executeCheckoutFlow({
      createOrder,
      openCheckout,
      verifyPayment,
      successPath: '/s',
      failPath: '/f',
      showAlert,
      navigate,
    });

    expect(showAlert).toHaveBeenCalledWith('Failed to create order. Please try again.', 'danger');
  });

  it('uses custom errorMessage when provided', async () => {
    createOrder.mockRejectedValue(new Error('x'));

    await executeCheckoutFlow({
      createOrder,
      openCheckout,
      verifyPayment,
      successPath: '/s',
      failPath: '/f',
      showAlert,
      navigate,
      errorMessage: 'Custom error',
    });

    expect(showAlert).toHaveBeenCalledWith('Custom error', 'danger');
  });
});
