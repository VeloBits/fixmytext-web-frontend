import { renderHook, act } from '@testing-library/react';
import useWordFrequency from './useWordFrequency';

describe('useWordFrequency', () => {
  let showAlert, setAiResult, setPreviewMode, pushHistory;

  beforeEach(() => {
    showAlert = vi.fn();
    setAiResult = vi.fn();
    setPreviewMode = vi.fn();
    pushHistory = vi.fn();
  });

  it('does nothing when text is empty', () => {
    const { result } = renderHook(() =>
      useWordFrequency('', showAlert, setAiResult, setPreviewMode, pushHistory)
    );
    act(() => {
      result.current.handleWordFrequency();
    });
    expect(showAlert).not.toHaveBeenCalled();
  });

  it('shows alert when no words found', () => {
    const { result } = renderHook(() =>
      useWordFrequency('123 456', showAlert, setAiResult, setPreviewMode, pushHistory)
    );
    act(() => {
      result.current.handleWordFrequency();
    });
    expect(showAlert).toHaveBeenCalledWith('No words found', 'info');
  });

  it('computes word frequency', () => {
    const { result } = renderHook(() =>
      useWordFrequency('hello world hello', showAlert, setAiResult, setPreviewMode, pushHistory)
    );
    act(() => {
      result.current.handleWordFrequency();
    });

    expect(setAiResult).toHaveBeenCalled();
    const call = setAiResult.mock.calls[0][0];
    expect(call.label).toBe('Word Frequency');
    expect(call.result).toContain('hello');
    expect(call.result).toContain('world');
    expect(call.result).toContain('**Total words:** 3');
    expect(call.result).toContain('**Unique:** 2');

    expect(setPreviewMode).toHaveBeenCalledWith('result');
    expect(pushHistory).toHaveBeenCalledWith(
      'Word Frequency',
      'hello world hello',
      expect.any(String),
      { toolId: 'word_freq', toolType: 'local' }
    );
    expect(showAlert).toHaveBeenCalledWith('2 unique words found', 'success');
  });

  it('works without pushHistory', () => {
    const { result } = renderHook(() =>
      useWordFrequency('test', showAlert, setAiResult, setPreviewMode, null)
    );
    act(() => {
      result.current.handleWordFrequency();
    });
    expect(setAiResult).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith('1 unique words found', 'success');
  });
});
