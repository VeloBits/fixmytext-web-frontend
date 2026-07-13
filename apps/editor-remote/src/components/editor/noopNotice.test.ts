import { describe, it, expect } from 'vitest';

import { noopNotice } from './noopNotice';

describe('noopNotice', () => {
  it('returns null when the transform actually changed the text', () => {
    expect(noopNotice('hello', 'HELLO', 'case')).toBeNull();
    expect(noopNotice('a,b', 'a\nb', 'lines')).toBeNull();
  });

  it('explains the caseless case for case-group no-ops', () => {
    const msg = noopNotice('😀👍 日本語 مرحبا', '😀👍 日本語 مرحبا', 'case');
    expect(msg).toMatch(/no cased characters/i);
  });

  it('flags math-styled letters as caseless (they never map)', () => {
    // U+1D421.. MATHEMATICAL BOLD SMALL letters — JS leaves them unchanged.
    const bold = '\u{1D421}\u{1D41E}\u{1D425}\u{1D425}\u{1D428}';
    const msg = noopNotice(bold, bold, 'case');
    expect(msg).toMatch(/no cased characters/i);
  });

  it('uses the generic message when a case tool no-ops on already-cased text', () => {
    // "HELLO" has cased characters, so the caseless explanation would be wrong.
    const msg = noopNotice('HELLO', 'HELLO', 'case');
    expect(msg).toBe('No changes — the result is identical to your input.');
  });

  it('uses the generic message for non-case tools that no-op', () => {
    expect(noopNotice('hello', 'hello', 'encode')).toBe(
      'No changes — the result is identical to your input.'
    );
    // group omitted entirely
    expect(noopNotice('hello', 'hello')).toBe(
      'No changes — the result is identical to your input.'
    );
  });
});
