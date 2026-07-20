/**
 * Billing display constants shared by the pricing page, dashboard
 * subscription tab, and the daily-limit upsell modal.
 */

export type SupportedCurrency = 'inr' | 'usd' | 'gbp' | 'eur';

/**
 * Display prices for the Pro plan per supported currency.
 * Must mirror backend PRO_PLAN_PRICES
 * (backend/services/payments-svc/app/services/razorpay_service.py).
 */
export const PRO_PRICES: Record<SupportedCurrency, string> = {
  inr: '₹399',
  usd: '$5',
  gbp: '£4',
  eur: '€4.50',
};

/**
 * Tools that never consume quota, passes, or credits.
 * Superset of backend ALWAYS_FREE_TOOL_IDS
 * (backend/services/payments-svc/app/core/pass_catalog.py) plus
 * frontend-only free tools — buying pass scope for any of these is wasted
 * money, so pickers must exclude them too.
 */
export const ALWAYS_FREE_IDS = new Set([
  'find_replace',
  'compare',
  'random_text',
  'password',
  'fmt_settings',
  'regex_test',
  'markdown',
  'save_txt',
  'save_json',
]);
