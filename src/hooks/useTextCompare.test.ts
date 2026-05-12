import { renderHook, act } from '@testing-library/react';
import useTextCompare from './useTextCompare';

describe('useTextCompare', () => {
  let showAlert;

  beforeEach(() => {
    showAlert = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useTextCompare('text', showAlert));
    expect(result.current.compareText).toBe('');
    expect(result.current.diffResult).toBeNull();
  });

  it('handleCompare shows alert when text is empty', () => {
    const { result } = renderHook(() => useTextCompare('', showAlert));
    act(() => {
      result.current.handleCompare();
    });
    expect(showAlert).toHaveBeenCalledWith('Both text fields must have content', 'danger');
  });

  it('handleCompare shows alert when compareText is empty', () => {
    const { result } = renderHook(() => useTextCompare('hello', showAlert));
    act(() => {
      result.current.handleCompare();
    });
    expect(showAlert).toHaveBeenCalledWith('Both text fields must have content', 'danger');
  });

  it('computes diff for identical texts', () => {
    const { result } = renderHook(() => useTextCompare('hello\nworld', showAlert));
    act(() => {
      result.current.setCompareText('hello\nworld');
    });
    act(() => {
      result.current.handleCompare();
    });
    expect(result.current.diffResult).toEqual([
      { type: 'same', line: 'hello' },
      { type: 'same', line: 'world' },
    ]);
  });

  it('computes diff for different texts', () => {
    const { result } = renderHook(() => useTextCompare('line1\nline2', showAlert));
    act(() => {
      result.current.setCompareText('line1\nline3');
    });
    act(() => {
      result.current.handleCompare();
    });
    expect(result.current.diffResult).toBeDefined();
    const types = result.current.diffResult.map((d) => d.type);
    expect(types).toContain('same');
    expect(types.some((t) => t === 'added' || t === 'removed')).toBe(true);
  });

  it('shows alert when text is too large', () => {
    const bigText = Array(1001).fill('line').join('\n');
    const { result } = renderHook(() => useTextCompare(bigText, showAlert));
    act(() => {
      result.current.setCompareText(bigText);
    });
    act(() => {
      result.current.handleCompare();
    });
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('too large'), 'danger');
  });

  it('auto-compares after 3 seconds of inactivity', () => {
    const { result } = renderHook(() => useTextCompare('a', showAlert));
    act(() => {
      result.current.setCompareText('b');
    });
    expect(result.current.diffResult).toBeNull();
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.diffResult).toBeDefined();
  });

  it('does not auto-compare when one text is empty', () => {
    const { result } = renderHook(() => useTextCompare('', showAlert));
    act(() => {
      result.current.setCompareText('b');
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.diffResult).toBeNull();
  });

  it('handles added lines', () => {
    const { result } = renderHook(() => useTextCompare('a', showAlert));
    act(() => {
      result.current.setCompareText('a\nb');
    });
    act(() => {
      result.current.handleCompare();
    });
    const types = result.current.diffResult.map((d) => d.type);
    expect(types).toContain('added');
  });

  it('handles removed lines', () => {
    const { result } = renderHook(() => useTextCompare('a\nb', showAlert));
    act(() => {
      result.current.setCompareText('a');
    });
    act(() => {
      result.current.handleCompare();
    });
    const types = result.current.diffResult.map((d) => d.type);
    expect(types).toContain('removed');
  });
});
