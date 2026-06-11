// ── Razorpay global type augmentation ───────────────────────────────────────

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string | undefined;
  prefill: { email: string | undefined; name: string | undefined };
  theme: { color: string };
  handler: (response: RazorpayPaymentResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayInstance {
  open(): void;
}

export interface RazorpayConstructor {
  new (options: RazorpayOptions): RazorpayInstance;
}

declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

// ── openRazorpayCheckout ─────────────────────────────────────────────────────

export interface OpenRazorpayCheckoutParams {
  orderId?: string;
  amount?: number;
  currency?: string;
  keyId?: string;
  userEmail?: string;
  userName?: string;
  description?: string;
  onSuccess: (response: RazorpayPaymentResponse) => void;
  onFailure?: (msg: string) => void;
}

/**
 * Opens the Razorpay checkout modal for one-time payments (passes/credits).
 */
export function openRazorpayCheckout({
  orderId,
  amount,
  currency,
  keyId,
  userEmail,
  userName,
  description,
  onSuccess,
  onFailure,
}: OpenRazorpayCheckoutParams): void {
  if (!window.Razorpay) {
    onFailure?.('Payment service unavailable. Please refresh the page.');
    return;
  }
  const options: RazorpayOptions = {
    key: keyId ?? '',
    amount: amount ?? 0,
    currency: (currency ?? '').toUpperCase(),
    name: 'FixMyText',
    description: description || 'Pass / Credits Purchase',
    order_id: orderId,
    prefill: { email: userEmail, name: userName },
    theme: { color: '#007ACC' },
    handler(response: RazorpayPaymentResponse): void {
      // response = { razorpay_payment_id, razorpay_order_id, razorpay_signature }
      onSuccess(response);
    },
    modal: {
      ondismiss(): void {
        onFailure?.('Payment cancelled');
      },
    },
  };
  const rzp = new window.Razorpay(options);
  rzp.open();
}

// ── executeCheckoutFlow ──────────────────────────────────────────────────────

export interface ExecuteCheckoutFlowParams {
  createOrder: () => Promise<Record<string, unknown>>;
  openCheckout: (params: Record<string, unknown>) => void;
  verifyPayment: (response: RazorpayPaymentResponse) => Promise<unknown>;
  successPath: string;
  failPath: string;
  showAlert?: (msg: string, variant: string) => void;
  navigate: (path: string) => void;
  errorMessage?: string;
}

/**
 * Shared checkout flow: create order -> open Razorpay -> verify -> navigate.
 * Reduces duplication across pass, credit, and subscription purchase hooks.
 */
export async function executeCheckoutFlow({
  createOrder,
  openCheckout,
  verifyPayment,
  successPath,
  failPath,
  showAlert,
  navigate,
  errorMessage = 'Failed to create order. Please try again.',
}: ExecuteCheckoutFlowParams): Promise<void> {
  try {
    const orderData = await createOrder();
    openCheckout({
      ...orderData,
      onSuccess: async (response: RazorpayPaymentResponse): Promise<void> => {
        try {
          await verifyPayment(response);
          navigate(successPath);
        } catch {
          navigate(failPath);
        }
      },
      onFailure: (msg: string): void =>
        showAlert?.(msg || 'Payment cancelled', 'info'),
    });
  } catch (err) {
    const apiErr = err as { data?: { detail?: string } } | null;
    showAlert?.(apiErr?.data?.detail || errorMessage, 'danger');
  }
}
