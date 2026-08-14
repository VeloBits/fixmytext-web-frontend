type SupportedCurrency = 'inr' | 'usd' | 'gbp' | 'eur';

/**
 * Format a price in smallest currency unit (paise/cents) for display.
 * @param price    - amount in smallest unit (e.g. 1000 = ₹10 or $10.00)
 * @param currency - 'inr', 'usd', 'gbp', 'eur'
 * @param symbol   - '₹', '$', '£', '€'
 * @param decimals - override decimal places (INR auto-detects)
 */
export function formatPrice(
  price: number,
  currency: SupportedCurrency,
  symbol: string,
  decimals?: number
): string {
  const val = price / 100;
  if (currency === 'inr') {
    return val % 1 === 0 ? `${symbol}${val.toFixed(0)}` : `${symbol}${val.toFixed(decimals ?? 2)}`;
  }
  return `${symbol}${val.toFixed(2)}`;
}

export default formatPrice;
