import ripemd160 from './ripemd160';

describe('ripemd160', () => {
  // Known test vectors from the RIPEMD-160 specification
  it('hashes empty string correctly', () => {
    expect(ripemd160('')).toBe('9c1185a5c5e9fc54612808977ee8f548b2258d31');
  });

  it('hashes "a" correctly', () => {
    expect(ripemd160('a')).toBe('0bdc9d2d256b3ee9daae347be6f4dc835a467ffe');
  });

  it('hashes "abc" correctly', () => {
    expect(ripemd160('abc')).toBe('8eb208f7e05d987a9b044a8e98c6b087f15a0bfc');
  });

  it('hashes "message digest" correctly', () => {
    expect(ripemd160('message digest')).toBe('5d0689ef49d2fae572b881b123a85ffa21595f36');
  });

  it('hashes alphabetic string correctly', () => {
    expect(ripemd160('abcdefghijklmnopqrstuvwxyz')).toBe(
      'f71c27109c692c1b56bbdceb5b9d2865b3708dbc'
    );
  });

  it('returns a 40-character hex string', () => {
    const hash = ripemd160('test');
    expect(hash).toHaveLength(40);
    expect(hash).toMatch(/^[0-9a-f]{40}$/);
  });

  it('produces consistent output for same input', () => {
    expect(ripemd160('hello')).toBe(ripemd160('hello'));
  });

  it('produces different output for different input', () => {
    expect(ripemd160('hello')).not.toBe(ripemd160('world'));
  });
});
