import { getVisitorId, initVisitorId, _resetForTest } from './useFingerprint';

describe('useFingerprint / getVisitorId', () => {
  beforeEach(() => {
    _resetForTest();
    localStorage.clear();
  });

  it('returns a string visitor ID', () => {
    const id = getVisitorId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('returns same ID on subsequent calls (cached)', () => {
    localStorage.setItem('fmx_visitor_id', 'test-id-123');
    const id1 = getVisitorId();
    const id2 = getVisitorId();
    expect(id1).toBe(id2);
    expect(id1).toBe('test-id-123');
  });

  it('returns cached ID from localStorage', () => {
    localStorage.setItem('fmx_visitor_id', 'cached-abc');
    const id = getVisitorId();
    expect(id).toBe('cached-abc');
  });

  it('initVisitorId generates and stores a SHA-256 fingerprint', async () => {
    const id = await initVisitorId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    // SHA-256 produces a 64-char hex string
    expect(id).toMatch(/^[0-9a-f]{64}$/);
    expect(localStorage.getItem('fmx_visitor_id')).toBe(id);
  });

  it('initVisitorId returns cached value if present', async () => {
    localStorage.setItem('fmx_visitor_id', 'pre-existing');
    const id = await initVisitorId();
    expect(id).toBe('pre-existing');
  });

  it('handles localStorage errors gracefully', () => {
    const originalGetItem = Storage.prototype.getItem;
    const originalSetItem = Storage.prototype.setItem;
    Storage.prototype.getItem = () => {
      throw new Error('denied');
    };
    Storage.prototype.setItem = () => {
      throw new Error('denied');
    };

    expect(() => getVisitorId()).not.toThrow();
    const id = getVisitorId();
    expect(typeof id).toBe('string');

    Storage.prototype.getItem = originalGetItem;
    Storage.prototype.setItem = originalSetItem;
  });
});
