import { renderHook, act } from '@testing-library/react';
import useFindReplace from './useFindReplace';

describe('useFindReplace', () => {
  let setText, showAlert, text;

  beforeEach(() => {
    text = 'Hello world hello World';
    setText = vi.fn();
    showAlert = vi.fn();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useFindReplace(text, setText, showAlert));
    expect(result.current.findText).toBe('');
    expect(result.current.replaceText).toBe('');
    expect(result.current.findCaseSensitive).toBe(false);
    expect(result.current.findUseRegex).toBe(false);
    expect(result.current.replaceCount).toBeNull();
  });

  it('shows alert when findText is empty', () => {
    const { result } = renderHook(() => useFindReplace(text, setText, showAlert));
    act(() => {
      result.current.handleReplaceAll();
    });
    expect(showAlert).toHaveBeenCalledWith('Enter a search term', 'danger');
    expect(setText).not.toHaveBeenCalled();
  });

  it('replaces all case-insensitive by default', () => {
    const { result } = renderHook(() => useFindReplace(text, setText, showAlert));
    act(() => {
      result.current.setFindText('hello');
    });
    act(() => {
      result.current.setReplaceText('hi');
    });
    act(() => {
      result.current.handleReplaceAll();
    });
    expect(setText).toHaveBeenCalledWith('hi world hi World');
    expect(result.current.replaceCount).toBe(2);
    expect(showAlert).toHaveBeenCalledWith('Replaced 2 occurrences', 'success');
  });

  it('replaces case-sensitive when enabled', () => {
    const { result } = renderHook(() => useFindReplace(text, setText, showAlert));
    act(() => {
      result.current.setFindText('Hello');
    });
    act(() => {
      result.current.setReplaceText('Hi');
    });
    act(() => {
      result.current.setFindCaseSensitive(true);
    });
    act(() => {
      result.current.handleReplaceAll();
    });
    expect(setText).toHaveBeenCalledWith('Hi world hello World');
    expect(result.current.replaceCount).toBe(1);
    expect(showAlert).toHaveBeenCalledWith('Replaced 1 occurrence', 'success');
  });

  it('supports regex replacement', () => {
    const { result } = renderHook(() => useFindReplace('abc 123 def 456', setText, showAlert));
    act(() => {
      result.current.setFindText('\\d+');
    });
    act(() => {
      result.current.setReplaceText('NUM');
    });
    act(() => {
      result.current.setFindUseRegex(true);
    });
    act(() => {
      result.current.handleReplaceAll();
    });
    expect(setText).toHaveBeenCalledWith('abc NUM def NUM');
  });

  it('shows alert for invalid regex', () => {
    const { result } = renderHook(() => useFindReplace(text, setText, showAlert));
    act(() => {
      result.current.setFindText('[invalid');
    });
    act(() => {
      result.current.setFindUseRegex(true);
    });
    act(() => {
      result.current.handleReplaceAll();
    });
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Invalid regex'), 'danger');
  });

  it('reports 0 occurrences with info type', () => {
    const { result } = renderHook(() => useFindReplace(text, setText, showAlert));
    act(() => {
      result.current.setFindText('zzz');
    });
    act(() => {
      result.current.handleReplaceAll();
    });
    expect(setText).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('Replaced 0 occurrences', 'info');
  });
});
