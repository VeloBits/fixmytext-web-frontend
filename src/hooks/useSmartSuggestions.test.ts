import { renderHook, act } from '@testing-library/react';
import useSmartSuggestions from './useSmartSuggestions';

vi.mock('../constants/tools', () => ({
  SMART_SUGGESTION_RULES: [
    {
      test: (t) => t.includes('json'),
      toolIds: ['json_fmt', 'json_yaml'],
    },
    {
      test: (t) => t.includes('<html>'),
      toolIds: ['strip_html', 'html_fmt'],
    },
    {
      test: (t) => t === t.toUpperCase() && /[A-Z]/.test(t),
      toolIds: ['lowercase'],
    },
    {
      test: () => {
        throw new Error('rule error');
      },
      toolIds: ['broken'],
    },
  ],
  TOOLS: [
    { id: 'json_fmt', label: 'Format JSON' },
    { id: 'json_yaml', label: 'JSON to YAML' },
    { id: 'strip_html', label: 'Strip HTML' },
    { id: 'html_fmt', label: 'Format HTML' },
    { id: 'lowercase', label: 'lowercase' },
  ],
}));

describe('useSmartSuggestions', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns empty suggestions for empty text', () => {
    const { result } = renderHook(() => useSmartSuggestions(''));
    expect(result.current.suggestions).toEqual([]);
  });

  it('returns empty suggestions for short text', () => {
    const { result } = renderHook(() => useSmartSuggestions('ab'));
    expect(result.current.suggestions).toEqual([]);
  });

  it('detects JSON-related suggestions after debounce', () => {
    const { result } = renderHook(() => useSmartSuggestions('this is json data'));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.length).toBeGreaterThan(0);
    expect(result.current.suggestions.map((s) => s.id)).toContain('json_fmt');
  });

  it('detects HTML-related suggestions', () => {
    const { result } = renderHook(() => useSmartSuggestions('this has <html> tags'));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.map((s) => s.id)).toContain('strip_html');
  });

  it('detects uppercase text suggestions', () => {
    const { result } = renderHook(() => useSmartSuggestions('ALL UPPERCASE TEXT'));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.map((s) => s.id)).toContain('lowercase');
  });

  it('limits suggestions to 4', () => {
    const { result } = renderHook(() => useSmartSuggestions('json <html>'));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.length).toBeLessThanOrEqual(4);
  });

  it('handles rule errors gracefully', () => {
    // The broken rule throws but should not crash
    const { result } = renderHook(() => useSmartSuggestions('some text here'));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    // Should not throw, suggestions may be empty or have other matches
    expect(Array.isArray(result.current.suggestions)).toBe(true);
  });

  it('dismiss removes a tool from suggestions', () => {
    const { result } = renderHook(() => useSmartSuggestions('this is json data'));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.map((s) => s.id)).toContain('json_fmt');
    act(() => {
      result.current.dismiss('json_fmt');
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.map((s) => s.id)).not.toContain('json_fmt');
  });

  it('clearDismissed restores dismissed tools', () => {
    const { result } = renderHook(() => useSmartSuggestions('this is json data'));
    act(() => {
      vi.advanceTimersByTime(600);
    });
    act(() => {
      result.current.dismiss('json_fmt');
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.map((s) => s.id)).not.toContain('json_fmt');
    act(() => {
      result.current.clearDismissed();
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.map((s) => s.id)).toContain('json_fmt');
  });

  it('debounces detection - clears previous timer on text change', () => {
    const { result, rerender } = renderHook(({ text }) => useSmartSuggestions(text), {
      initialProps: { text: 'json content here' },
    });
    // Don't advance enough for first debounce
    act(() => {
      vi.advanceTimersByTime(300);
    });
    rerender({ text: 'different json text' });
    // First timeout should be cleared, advance for second
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.length).toBeGreaterThan(0);
  });

  it('clears suggestions when text becomes empty', () => {
    const { result, rerender } = renderHook(({ text }) => useSmartSuggestions(text), {
      initialProps: { text: 'json data here' },
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.suggestions.length).toBeGreaterThan(0);
    rerender({ text: '' });
    expect(result.current.suggestions).toEqual([]);
  });
});
