import { renderHook, act } from '@testing-library/react';
import useGenerators from './useGenerators';

describe('useGenerators', () => {
  let setText, showAlert;

  beforeEach(() => {
    setText = vi.fn();
    showAlert = vi.fn();
    // Mock crypto.getRandomValues
    vi.stubGlobal('crypto', {
      getRandomValues: (arr) => {
        for (let i = 0; i < arr.length; i++) arr[i] = i * 7 + 3;
        return arr;
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useGenerators(setText, showAlert));
    expect(result.current.textGenType).toBe('words');
    expect(result.current.textGenCount).toBe(50);
    expect(result.current.pwdLen).toBe(16);
    expect(result.current.generatedPwd).toBe('');
  });

  it('generates random words', () => {
    const { result } = renderHook(() => useGenerators(setText, showAlert));
    let res;
    act(() => {
      res = result.current.handleGenerateText();
    });
    expect(setText).toHaveBeenCalled();
    const words = setText.mock.calls[0][0].split(' ');
    expect(words.length).toBe(50);
    expect(showAlert).toHaveBeenCalledWith('Random text generated', 'success');
  });

  it('generates random sentences', () => {
    const { result } = renderHook(() => useGenerators(setText, showAlert));
    act(() => {
      result.current.setTextGenType('sentences');
    });
    act(() => {
      result.current.setTextGenCount(3);
    });
    act(() => {
      result.current.handleGenerateText();
    });
    const text = setText.mock.calls[0][0];
    // Sentences end with periods
    expect(text).toContain('.');
    expect(showAlert).toHaveBeenCalledWith('Random text generated', 'success');
  });

  it('generates random paragraphs', () => {
    const { result } = renderHook(() => useGenerators(setText, showAlert));
    act(() => {
      result.current.setTextGenType('paragraphs');
    });
    act(() => {
      result.current.setTextGenCount(2);
    });
    act(() => {
      result.current.handleGenerateText();
    });
    const text = setText.mock.calls[0][0];
    expect(text).toContain('\n\n');
  });

  it('generates a password with all character types', () => {
    const { result } = renderHook(() => useGenerators(setText, showAlert));
    let pwd;
    act(() => {
      pwd = result.current.handleGeneratePassword();
    });
    expect(pwd).toBeDefined();
    expect(pwd.length).toBe(16);
    expect(result.current.generatedPwd).toBe(pwd);
    expect(showAlert).toHaveBeenCalledWith('Password generated', 'success');
  });

  it('shows alert when no character type selected', () => {
    const { result } = renderHook(() => useGenerators(setText, showAlert));
    act(() => {
      result.current.setPwdOpts({ upper: false, lower: false, numbers: false, symbols: false });
    });
    act(() => {
      result.current.handleGeneratePassword();
    });
    expect(showAlert).toHaveBeenCalledWith('Select at least one character type', 'danger');
  });

  it('generates password with custom length', () => {
    const { result } = renderHook(() => useGenerators(setText, showAlert));
    act(() => {
      result.current.setPwdLen(8);
    });
    let pwd;
    act(() => {
      pwd = result.current.handleGeneratePassword();
    });
    expect(pwd.length).toBe(8);
  });
});
