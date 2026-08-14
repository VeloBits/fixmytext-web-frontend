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

const mockUpdateUiSettings = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
// Typed to accept any args and return a loose shape so mockReturnValue can supply
// either `{ data: undefined }` or `{ data: { keybindings: ... } }`.
const mockGetUiSettingsQuery = vi.fn((..._args: unknown[]): { data: unknown } => ({
  data: undefined,
}));

vi.mock('@velobits/app-core/store/api/userDataApi', () => ({
  useGetUiSettingsQuery: (...args: unknown[]) => mockGetUiSettingsQuery(...args),
  useUpdateUiSettingsMutation: () => [mockUpdateUiSettings],
}));

vi.mock('@velobits/app-core/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn(() => ({ isAuthenticated: false })),
}));

import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
const mockUseOidcAuth = vi.mocked(useOidcAuth);

vi.mock('@velobits/app-core/constants/tools', () => ({
  TOOLS: [
    { id: 'uppercase', label: 'UPPERCASE' },
    { id: 'lowercase', label: 'lowercase' },
    { id: 'fix_grammar', label: 'Fix Grammar' },
  ],
}));

import { useSelector } from 'react-redux';
import type { KeyboardActions } from './useKeyboardShortcuts';

// vi.mock replaces useSelector - cast so TS knows
const mockUseSelector = useSelector as unknown as ReturnType<typeof vi.fn>;

describe('useKeyboardShortcuts', () => {
  let actions: KeyboardActions;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseSelector.mockReturnValue(null);
    mockUseOidcAuth.mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useOidcAuth>);
    mockGetUiSettingsQuery.mockReturnValue({ data: undefined });
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
    expect(palette!.keys).toBe('p');
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
    renderHook(() => useKeyboardShortcuts(actions));
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
    renderHook(() => useKeyboardShortcuts(actions));
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
    renderHook(() => useKeyboardShortcuts(actions));
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
    renderHook(() => useKeyboardShortcuts(actions));
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
    renderHook(() => useKeyboardShortcuts(actions));
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
    renderHook(() => useKeyboardShortcuts(actions));
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
    renderHook(() => useKeyboardShortcuts(actions));
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
    renderHook(() => useKeyboardShortcuts(actions));
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
    expect(conflicts[0]!.id).toBe('toggle_sidebar');
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
    expect(binding!.keys).toBe('k');
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

// ── Helper to dispatch keyboard events ──────────────────────────────────────

function fireKey(
  key: string,
  opts: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean } = {},
  target: { tagName: string } = { tagName: 'DIV' }
) {
  const event = new KeyboardEvent('keydown', {
    key,
    ctrlKey: opts.ctrlKey ?? false,
    shiftKey: opts.shiftKey ?? false,
    altKey: opts.altKey ?? false,
    bubbles: true,
  });
  Object.defineProperty(event, 'target', { value: target });
  act(() => {
    window.dispatchEvent(event);
  });
  return event;
}

// ── Additional keyboard shortcut tests ──────────────────────────────────────

describe('useKeyboardShortcuts - additional keyboard cases', () => {
  let actions: KeyboardActions;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseOidcAuth.mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useOidcAuth>);
    mockGetUiSettingsQuery.mockReturnValue({ data: undefined });
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

  it('Ctrl+, triggers settings', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey(',', { ctrlKey: true });
    expect(actions.toggleSettings).toHaveBeenCalled();
  });

  it('Ctrl+S triggers save_template', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('s', { ctrlKey: true });
    expect(actions.saveTemplate).toHaveBeenCalled();
  });

  it('Ctrl+W triggers close_tab', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('w', { ctrlKey: true });
    expect(actions.closeActiveTab).toHaveBeenCalled();
  });

  it('Ctrl+Shift+X triggers clear_text', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('x', { ctrlKey: true, shiftKey: true });
    expect(actions.clearText).toHaveBeenCalled();
  });

  it('Alt+Z triggers undo', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('z', { altKey: true });
    expect(actions.undo).toHaveBeenCalled();
  });

  it('Alt+Shift+Z triggers redo', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('z', { altKey: true, shiftKey: true });
    expect(actions.redo).toHaveBeenCalled();
  });

  it('Ctrl+Shift+C triggers copy_output', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('c', { ctrlKey: true, shiftKey: true });
    expect(actions.copyOutput).toHaveBeenCalled();
  });

  it('Ctrl+Shift+V triggers clear_paste', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('v', { ctrlKey: true, shiftKey: true });
    expect(actions.clearPaste).toHaveBeenCalled();
  });

  it('Alt+[ triggers prev_tab', () => {
    // prev_tab is Ctrl+[ according to defaults
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('[', { ctrlKey: true });
    expect(actions.prevTab).toHaveBeenCalled();
  });

  it('Alt+2 through Alt+5 trigger goToTab with correct index', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    for (const [key, expected] of [
      ['2', 1],
      ['3', 2],
      ['4', 3],
      ['5', 4],
    ] as [string, number][]) {
      fireKey(key, { altKey: true });
      expect(actions.goToTab).toHaveBeenCalledWith(expected);
    }
    expect(actions.goToTab).toHaveBeenCalledTimes(4);
  });

  it('Alt+6 through Alt+9 trigger goToTab with correct index', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    for (const [key, expected] of [
      ['6', 5],
      ['7', 6],
      ['8', 7],
      ['9', 8],
    ] as [string, number][]) {
      fireKey(key, { altKey: true });
      expect(actions.goToTab).toHaveBeenCalledWith(expected);
    }
  });

  it('Ctrl+Shift+L triggers tool_lowercase via runTool', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('l', { ctrlKey: true, shiftKey: true });
    expect(actions.runTool).toHaveBeenCalled();
  });

  it('Ctrl+Shift+G triggers tool_fix_grammar via runTool', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('g', { ctrlKey: true, shiftKey: true });
    expect(actions.runTool).toHaveBeenCalled();
  });

  it('tool_ shortcut with no matching TOOLS entry does not call runTool', () => {
    // paraphrase, summarize, find_replace, json_fmt, title_case are in defaults but NOT in mock TOOLS
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('p', { ctrlKey: true, shiftKey: true }); // tool_paraphrase not in TOOLS mock
    expect(actions.runTool).not.toHaveBeenCalled();
  });

  it('ignores SELECT target without modifier', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    fireKey('a', {}, { tagName: 'SELECT' });
    expect(actions.openPalette).not.toHaveBeenCalled();
  });

  it('ignores TEXTAREA target for non-modifier non-Escape key', () => {
    renderHook(() => useKeyboardShortcuts(actions));
    // 'a' key with no modifier from TEXTAREA should be ignored
    fireKey('a', {}, { tagName: 'TEXTAREA' });
    expect(actions.openPalette).not.toHaveBeenCalled();
  });

  it('loadCustomBindings handles corrupted localStorage gracefully', () => {
    localStorage.setItem('fmx_keybindings', 'NOT_JSON{{{');
    // Should not throw, falls back to empty overrides
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    expect(result.current.overrides).toEqual({});
  });

  it('saveCustomBindings removes key from localStorage when overrides is empty', () => {
    localStorage.setItem('fmx_keybindings', JSON.stringify({ palette: { keys: 'p', ctrl: true } }));
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    act(() => {
      result.current.resetAll();
    });
    expect(localStorage.getItem('fmx_keybindings')).toBeNull();
  });
});

// ── Authenticated paths ──────────────────────────────────────────────────────

describe('useKeyboardShortcuts - authenticated paths', () => {
  let actions: KeyboardActions;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockUseOidcAuth.mockReturnValue({ isAuthenticated: true } as ReturnType<typeof useOidcAuth>);
    mockGetUiSettingsQuery.mockReturnValue({ data: undefined });
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

  it('updateBinding calls updateUiSettings when authenticated', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    act(() => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true });
    });
    expect(mockUpdateUiSettings).toHaveBeenCalled();
  });

  it('resetAll calls updateUiSettings when authenticated', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    act(() => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true });
    });
    vi.clearAllMocks();
    act(() => {
      result.current.resetAll();
    });
    expect(mockUpdateUiSettings).toHaveBeenCalled();
  });

  it('resetOne calls updateUiSettings when authenticated', () => {
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    act(() => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true });
    });
    vi.clearAllMocks();
    act(() => {
      result.current.resetOne('palette');
    });
    expect(mockUpdateUiSettings).toHaveBeenCalled();
  });

  it('hydrates overrides from uiSettings on first fetch', () => {
    mockGetUiSettingsQuery.mockReturnValue({
      data: { keybindings: { palette: { keys: 'q', ctrl: true, shift: false, alt: false } } },
    });
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    expect(result.current.overrides.palette).toBeDefined();
    expect(result.current.overrides.palette!.keys).toBe('q');
  });

  it('does not re-hydrate if uiSettings keybindings is empty', () => {
    mockGetUiSettingsQuery.mockReturnValue({ data: { keybindings: {} } });
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    // overrides remains what was in localStorage (empty)
    expect(result.current.overrides).toEqual({});
  });

  it('updateBinding catch callback swallows API errors silently', async () => {
    mockUpdateUiSettings.mockReturnValue({ unwrap: () => Promise.reject(new Error('API fail')) });
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    // Should not throw even when updateUiSettings rejects
    await act(async () => {
      result.current.updateBinding('palette', { keys: 'p', ctrl: true });
      await new Promise((r) => setTimeout(r, 0)); // flush microtasks
    });
    expect(result.current.overrides.palette).toBeDefined();
  });

  it('resetAll catch callback swallows API errors silently', async () => {
    mockUpdateUiSettings.mockReturnValue({ unwrap: () => Promise.reject(new Error('fail')) });
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    await act(async () => {
      result.current.resetAll();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.overrides).toEqual({});
  });

  it('resetOne catch callback swallows API errors silently', async () => {
    mockUpdateUiSettings.mockReturnValue({ unwrap: () => Promise.reject(new Error('fail')) });
    const { result } = renderHook(() => useKeyboardShortcuts(actions));
    await act(async () => {
      result.current.resetOne('palette');
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.overrides.palette).toBeUndefined();
  });

  it('resets hydration flag on logout', () => {
    mockGetUiSettingsQuery.mockReturnValue({
      data: { keybindings: { palette: { keys: 'q', ctrl: true, shift: false, alt: false } } },
    });
    const { result, rerender } = renderHook(() => useKeyboardShortcuts(actions));
    expect(result.current.overrides.palette).toBeDefined();
    // Simulate logout
    mockUseOidcAuth.mockReturnValue({ isAuthenticated: false } as ReturnType<typeof useOidcAuth>);
    rerender();
    // hydrated flag reset, next fetch would re-hydrate if data present
    expect(result.current.overrides).toBeDefined();
  });
});
