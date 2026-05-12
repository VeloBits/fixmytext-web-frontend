import formatPrice from './formatPrice';

describe('formatPrice', () => {
  describe('INR currency', () => {
    it('formats whole number INR without decimals', () => {
      expect(formatPrice(1000, 'inr', '₹')).toBe('₹10');
    });

    it('formats fractional INR with 2 decimals by default', () => {
      expect(formatPrice(1050, 'inr', '₹')).toBe('₹10.50');
    });

    it('formats fractional INR with custom decimals', () => {
      expect(formatPrice(1055, 'inr', '₹', 1)).toBe('₹10.6');
    });

    it('handles zero price for INR', () => {
      expect(formatPrice(0, 'inr', '₹')).toBe('₹0');
    });

    it('handles large INR amounts', () => {
      expect(formatPrice(10000000, 'inr', '₹')).toBe('₹100000');
    });
  });

  describe('non-INR currencies', () => {
    it('formats USD with 2 decimals', () => {
      expect(formatPrice(1000, 'usd', '$')).toBe('$10.00');
    });

    it('formats GBP with 2 decimals', () => {
      expect(formatPrice(999, 'gbp', '£')).toBe('£9.99');
    });

    it('formats EUR with 2 decimals', () => {
      expect(formatPrice(500, 'eur', '€')).toBe('€5.00');
    });

    it('handles zero price for USD', () => {
      expect(formatPrice(0, 'usd', '$')).toBe('$0.00');
    });

    it('always uses 2 decimals for non-INR even for whole numbers', () => {
      expect(formatPrice(2000, 'usd', '$')).toBe('$20.00');
    });
  });
});
