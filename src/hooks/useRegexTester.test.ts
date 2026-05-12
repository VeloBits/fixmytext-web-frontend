import { renderHook, act } from '@testing-library/react';
import useRegexTester from './useRegexTester';

describe('useRegexTester', () => {
  let showAlert;

  beforeEach(() => {
    showAlert = vi.fn();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useRegexTester('text', showAlert));
    expect(result.current.regexPattern).toBe('');
    expect(result.current.regexFlags).toBe('g');
    expect(result.current.regexResult).toBeNull();
  });

  it('shows alert when pattern is empty', () => {
    const { result } = renderHook(() => useRegexTester('text', showAlert));
    act(() => {
      result.current.handleRegexTest();
    });
    expect(showAlert).toHaveBeenCalledWith('Enter a regex pattern', 'danger');
  });

  it('shows alert when text is empty', () => {
    const { result } = renderHook(() => useRegexTester('', showAlert));
    act(() => {
      result.current.setRegexPattern('\\w+');
    });
    act(() => {
      result.current.handleRegexTest();
    });
    expect(showAlert).toHaveBeenCalledWith('Enter some text to test against', 'danger');
  });

  it('finds global matches', () => {
    const { result } = renderHook(() => useRegexTester('hello world hello', showAlert));
    act(() => {
      result.current.setRegexPattern('hello');
    });
    act(() => {
      result.current.handleRegexTest();
    });
    expect(result.current.regexResult.total).toBe(2);
    expect(result.current.regexResult.matches[0].match).toBe('hello');
    expect(result.current.regexResult.matches[0].index).toBe(0);
    expect(showAlert).toHaveBeenCalledWith('2 matches found', 'success');
  });

  it('finds non-global match', () => {
    const { result } = renderHook(() => useRegexTester('hello world', showAlert));
    act(() => {
      result.current.setRegexPattern('world');
    });
    act(() => {
      result.current.setRegexFlags('');
    });
    act(() => {
      result.current.handleRegexTest();
    });
    expect(result.current.regexResult.total).toBe(1);
    expect(result.current.regexResult.matches[0].match).toBe('world');
  });

  it('reports 0 matches with info', () => {
    const { result } = renderHook(() => useRegexTester('hello', showAlert));
    act(() => {
      result.current.setRegexPattern('xyz');
    });
    act(() => {
      result.current.handleRegexTest();
    });
    expect(result.current.regexResult.total).toBe(0);
    expect(showAlert).toHaveBeenCalledWith('0 matches found', 'info');
  });

  it('shows alert for invalid regex', () => {
    const { result } = renderHook(() => useRegexTester('text', showAlert));
    act(() => {
      result.current.setRegexPattern('[bad');
    });
    act(() => {
      result.current.handleRegexTest();
    });
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Invalid regex'), 'danger');
  });

  it('captures groups', () => {
    const { result } = renderHook(() => useRegexTester('2024-01-15', showAlert));
    act(() => {
      result.current.setRegexPattern('(\\d{4})-(\\d{2})-(\\d{2})');
    });
    act(() => {
      result.current.handleRegexTest();
    });
    expect(result.current.regexResult.matches[0].groups).toEqual(['2024', '01', '15']);
  });

  it('handles non-global with no match', () => {
    const { result } = renderHook(() => useRegexTester('abc', showAlert));
    act(() => {
      result.current.setRegexPattern('xyz');
    });
    act(() => {
      result.current.setRegexFlags('');
    });
    act(() => {
      result.current.handleRegexTest();
    });
    expect(result.current.regexResult.total).toBe(0);
  });

  it('handles zero-length matches (advances lastIndex)', () => {
    const { result } = renderHook(() => useRegexTester('ab', showAlert));
    act(() => {
      result.current.setRegexPattern('(?=a)');
    });
    act(() => {
      result.current.setRegexFlags('g');
    });
    // Zero-length lookahead match - shouldn't infinite loop
    act(() => {
      result.current.handleRegexTest();
    });
    expect(result.current.regexResult.total).toBe(1);
  });

  it('singular match text', () => {
    const { result } = renderHook(() => useRegexTester('hello', showAlert));
    act(() => {
      result.current.setRegexPattern('hello');
    });
    act(() => {
      result.current.handleRegexTest();
    });
    expect(showAlert).toHaveBeenCalledWith('1 match found', 'success');
  });
});
