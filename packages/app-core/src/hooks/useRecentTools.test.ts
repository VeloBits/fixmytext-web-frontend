import { renderHook, act } from '@testing-library/react';
import useRecentTools, { MAX_RECENT_TOOLS, RECENT_TOOLS_STORAGE_KEY } from './useRecentTools';

describe('useRecentTools', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts empty', () => {
    const { result } = renderHook(() => useRecentTools());
    expect(result.current.recentToolIds).toEqual([]);
  });

  it('records uses most-recent-first and dedupes', () => {
    const { result } = renderHook(() => useRecentTools());
    act(() => result.current.recordToolUse('a'));
    act(() => result.current.recordToolUse('b'));
    act(() => result.current.recordToolUse('a'));
    expect(result.current.recentToolIds).toEqual(['a', 'b']);
  });

  it('persists to localStorage and hydrates on next mount', () => {
    const { result } = renderHook(() => useRecentTools());
    act(() => result.current.recordToolUse('uppercase'));
    expect(JSON.parse(localStorage.getItem(RECENT_TOOLS_STORAGE_KEY)!)).toEqual(['uppercase']);

    const { result: second } = renderHook(() => useRecentTools());
    expect(second.current.recentToolIds).toEqual(['uppercase']);
  });

  it('caps the list at MAX_RECENT_TOOLS', () => {
    const { result } = renderHook(() => useRecentTools());
    act(() => {
      for (let i = 0; i < MAX_RECENT_TOOLS + 5; i++) {
        result.current.recordToolUse(`tool-${i}`);
      }
    });
    expect(result.current.recentToolIds).toHaveLength(MAX_RECENT_TOOLS);
    expect(result.current.recentToolIds[0]).toBe(`tool-${MAX_RECENT_TOOLS + 4}`);
  });

  it('ignores malformed stored data', () => {
    localStorage.setItem(RECENT_TOOLS_STORAGE_KEY, '{"not":"an array"}');
    const { result } = renderHook(() => useRecentTools());
    expect(result.current.recentToolIds).toEqual([]);
  });
});
