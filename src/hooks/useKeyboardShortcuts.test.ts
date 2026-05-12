import { renderHook, act } from '@testing-library/react';
import useKeyboardShortcuts, {
  DEFAULT_SHORTCUT_GROUPS,
  detectConflicts,
  formatShortcut,
  eventToBinding,
} from './useKeyboardShortcuts';

vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => null),
}));

vi.mock('../store/api/userDataApi', () => ({
  useGetUiSettingsQuery: vi.fn(() => ({ data: undefined })),
  useUpdateUiSettingsMutation: () => [vi.fn(() => ({ unwrap: () => Promise.resolve({}) }))],
}));

vi.mock('../constants/tools', () => ({
  TOOLS: [
    { id: 'uppercase', label: 'UPPERCASE' },
    { id: 'lowercase', label: 'lowercase' },
    { id: 'fix_grammar', label: 'Fix Grammar' },
  ],
}));

import { useSelector } from 'react-redux';

describe('useKeyboardShortcuts', () => {
  let actions;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useSelector.mockReturnValue(null);
    actions = {
      openPalette: vi.fn(),
      toggleSidebar: vi.fn(),
      toggleSettings: vi.fn(),
      onEscape: vi.fn(),
      runActiveTool: vi.fn(),
      saveTemplate: vi.fn(),
      closeActiveTab: vi.fn(),
      clearText: vi.fn(),
      undo: vi.fn(),
      redo: vi.fn(),
      copyOutput: vi.fn(),
      clearPaste: vi.fn(),
      goToTab: vi.fn(),
      nextTab: vi.fn(),
      prevTab: vi.fn(),
      runTool: vi.fn(),
    };
  });

  it('returns default groups and overrides', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    expect(result.current.groups.length).toBe(DEFAULT_SHORTCUT_GROUPS.length);
    expect(result.current.overrides).toEqual({});
    expect(result.current.shortcutsOpen).toBe(false);
  });

  it('loads custom bindings from localStorage', () => {
    localStorage.setItem(
      'fmx_keybindings',
      JSON.stringify({
        palette: { keys: 'p', ctrl: true, shift: false, alt: false },
      })
    );
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const palette = result.current.groups
      .flatMap((g) => g.shortcuts)
      .find((s) => s.id === 'palette');
    expect(palette.keys).toBe('p');
  });

  it('updateBinding persists a custom binding', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    act(() => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true, shift: false, alt: false });
    });
    expect(result.current.overrides.palette).toBeDefined();
    expect(localStorage.getItem('fmx_keybindings')).toContain('palette');
  });

  it('updateBinding removes override when matching default', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    // First override
    act(() => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true });
    });
    expect(result.current.overrides.palette).toBeDefined();
    // Reset to default
    act(() => {
      result.current.updateBinding('palette', { keys: 'k', ctrl: true });
    });
    expect(result.current.overrides.palette).toBeUndefined();
  });

  it('resetAll clears all overrides', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    act(() => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true });
    });
    act(() => {
      result.current.resetAll();
    });
    expect(result.current.overrides).toEqual({});
  });

  it('resetOne clears a single override', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    act(() => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true });
      result.current.updateBinding('toggle_sidebar', { keys: 'm', ctrl: true });
    });
    act(() => {
      result.current.resetOne('palette');
    });
    expect(result.current.overrides.palette).toBeUndefined();
    expect(result.current.overrides.toggle_sidebar).toBeDefined();
  });

  it('isCustomized returns correct value', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    expect(result.current.isCustomized('palette')).toBe(false);
    act(() => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true });
    });
    expect(result.current.isCustomized('palette')).toBe(true);
  });

  it('handles Ctrl+K keydown for palette', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'DIV' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(actions.openPalette).toHaveBeenCalled();
  });

  it('handles Ctrl+B keydown for toggle sidebar', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: 'b',
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'DIV' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(actions.toggleSidebar).toHaveBeenCalled();
  });

  it('handles Escape keydown', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'DIV' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(actions.onEscape).toHaveBeenCalled();
  });

  it('handles Ctrl+Enter for run tool', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: 'Enter',
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'TEXTAREA' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(actions.runActiveTool).toHaveBeenCalled();
  });

  it('handles Alt+1 for tab navigation', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: '1',
      ctrlKey: false,
      shiftKey: false,
      altKey: true,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'DIV' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(actions.goToTab).toHaveBeenCalledWith(0);
  });

  it('handles Ctrl+] for next tab', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: ']',
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'DIV' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(actions.nextTab).toHaveBeenCalled();
  });

  it('handles Ctrl+Shift+U for tool_uppercase', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      shiftKey: true,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'DIV' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(actions.runTool).toHaveBeenCalled();
  });

  it('ignores keydown in INPUT without modifier', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: 'a',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'INPUT' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(actions.openPalette).not.toHaveBeenCalled();
  });

  it('toggles shortcutsOpen via Ctrl+/', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    const event = new KeyboardEvent('keydown', {
      key: '/',
      ctrlKey: true,
      shiftKey: false,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'DIV' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(result.current.shortcutsOpen).toBe(true);
  });

  it('Escape closes shortcuts panel when open', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    // Open shortcuts panel
    act(() => {
      result.current.setShortcutsOpen(true);
    });
    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      bubbles: true,
    });
    Object.defineProperty(event, 'target', { value: { tagName: 'DIV' } });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(result.current.shortcutsOpen).toBe(false);
  });

  it('cleans up keydown listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useKeyboardShortcuts(actions));
    unmount();
    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function));
    spy.mockRestore();
  });
});

describe('detectConflicts', () => {
  it('finds conflicts with same binding', () => {
    const conflicts = detectConflicts(DEFAULT_SHORTCUT_GROUPS, 'palette', {
      keys: 'b',
      ctrl: true,
    });
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].id).toBe('toggle_sidebar');
  });

  it('returns empty when no conflicts', () => {
    const conflicts = detectConflicts(DEFAULT_SHORTCUT_GROUPS, 'palette', {
      keys: 'q',
      ctrl: true,
    });
    expect(conflicts).toEqual([]);
  });

  it('excludes the editing shortcut itself', () => {
    const conflicts = detectConflicts(DEFAULT_SHORTCUT_GROUPS, 'palette', {
      keys: 'k',
      ctrl: true,
    });
    expect(conflicts.find((c) => c.id === 'palette')).toBeUndefined();
  });
});

describe('formatShortcut', () => {
  it('formats a ctrl shortcut', () => {
    const parts = formatShortcut({ keys: 'k', ctrl: true });
    expect(parts).toContain('K');
    expect(parts.some((p) => p === 'Ctrl' || p === '⌘')).toBe(true);
  });

  it('formats a shift shortcut', () => {
    const parts = formatShortcut({ keys: 'u', ctrl: true, shift: true });
    expect(parts).toContain('U');
    expect(parts.some((p) => p === 'Shift' || p === '⇧')).toBe(true);
  });

  it('formats Enter key', () => {
    const parts = formatShortcut({ keys: 'Enter', ctrl: true });
    expect(parts).toContain('↵');
  });

  it('formats Escape key', () => {
    const parts = formatShortcut({ keys: 'Escape' });
    expect(parts).toContain('Esc');
  });

  it('formats special characters', () => {
    expect(formatShortcut({ keys: ',', ctrl: true })).toContain(',');
    expect(formatShortcut({ keys: '/', ctrl: true })).toContain('/');
    expect(formatShortcut({ keys: '[', ctrl: true })).toContain('[');
    expect(formatShortcut({ keys: ']', ctrl: true })).toContain(']');
  });

  it('formats alt shortcut', () => {
    const parts = formatShortcut({ keys: '1', alt: true });
    expect(parts.some((p) => p === 'Alt' || p === '⌥')).toBe(true);
  });

  it('formats Tab key', () => {
    const parts = formatShortcut({ keys: 'Tab' });
    expect(parts).toContain('Tab');
  });
});

describe('eventToBinding', () => {
  it('returns binding from a keyboard event', () => {
    const e = { key: 'k', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false };
    const binding = eventToBinding(e);
    expect(binding).toBeTruthy();
    expect(binding.keys).toBe('k');
  });

  it('returns null for bare modifier press', () => {
    const e = { key: 'Control', ctrlKey: true, shiftKey: false, altKey: false, metaKey: false };
    expect(eventToBinding(e)).toBeNull();
    expect(
      eventToBinding({
        key: 'Shift',
        ctrlKey: false,
        shiftKey: true,
        altKey: false,
        metaKey: false,
      })
    ).toBeNull();
    expect(
      eventToBinding({ key: 'Alt', ctrlKey: false, shiftKey: false, altKey: true, metaKey: false })
    ).toBeNull();
    expect(
      eventToBinding({ key: 'Meta', ctrlKey: false, shiftKey: false, altKey: false, metaKey: true })
    ).toBeNull();
  });
});
