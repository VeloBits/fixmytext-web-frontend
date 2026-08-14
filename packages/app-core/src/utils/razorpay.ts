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

// ── loadRazorpayScript ───────────────────────────────────────────────────────

const RAZORPAY_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

let razorpayScriptPromise: Promise<boolean> | null = null;

/**
 * Injects the Razorpay checkout SDK on demand (it is not loaded in index.html
 * to keep it off the critical path). Concurrent calls share one in-flight
 * load; the cache clears once settled so a failed load can be retried.
 */
export function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  if (!razorpayScriptPromise) {
    razorpayScriptPromise = new Promise<boolean>((resolve) => {
      const script = document.createElement('script');
      script.src = RAZORPAY_SCRIPT_URL;
      script.async = true;
      script.onload = (): void => resolve(true);
      script.onerror = (): void => {
        script.remove();
        resolve(false);
      };
      document.head.appendChild(script);
    }).finally(() => {
      razorpayScriptPromise = null;
    });
  }
  return razorpayScriptPromise;
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
 * Loads the SDK on first use; never rejects - failures go to onFailure.
 */
export async function openRazorpayCheckout({
  orderId,
  amount,
  currency,
  keyId,
  userEmail,
  userName,
  description,
  onSuccess,
  onFailure,
}: OpenRazorpayCheckoutParams): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    onFailure?.('Payment service unavailable. Please check your connection and try again.');
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
  openCheckout: (params: Record<string, unknown>) => void | Promise<void>;
  verifyPayment: (response: RazorpayPaymentResponse) => Promise<unknown>;
  successPath: string;
  failPath: string;
  /** Where to land when the backend refunded the payment instead of
   * fulfilling it (verify returns status: "refunded"). Falls back to failPath. */
  refundedPath?: string;
  showAlert?: (msg: string, variant: string) => void;
  navigate: (path: string) => void;
  errorMessage?: string;
}

interface VerifyResult {
  status?: string;
  welcome_gift?: boolean;
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
  refundedPath,
  showAlert,
  navigate,
  errorMessage = 'Failed to create order. Please try again.',
}: ExecuteCheckoutFlowParams): Promise<void> {
  try {
    const orderData = await createOrder();
    await openCheckout({
      ...orderData,
      onSuccess: async (response: RazorpayPaymentResponse): Promise<void> => {
        try {
          const result = (await verifyPayment(response)) as VerifyResult | undefined;
          if (result?.status === 'refunded') {
            navigate(refundedPath ?? failPath);
            return;
          }
          navigate(result?.welcome_gift ? `${successPath}&welcome=1` : successPath);
        } catch {
          navigate(failPath);
        }
      },
      onFailure: (msg: string): void => showAlert?.(msg || 'Payment cancelled', 'info'),
    });
  } catch (err) {
    const apiErr = err as { data?: { detail?: string } } | null;
    showAlert?.(apiErr?.data?.detail || errorMessage, 'danger');
  }
}
