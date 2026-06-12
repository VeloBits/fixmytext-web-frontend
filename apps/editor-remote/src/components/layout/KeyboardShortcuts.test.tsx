import { render, screen, fireEvent } from '@testing-library/react';
import type { ShortcutDef } from '@/hooks/useKeyboardShortcuts';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const filtered = { ...props };
      ['initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover', 'variants'].forEach(
        (k) => delete filtered[k]
      );
      return <div {...(filtered as Record<string, unknown>)}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

const mockDetectConflicts = vi.fn((..._args: unknown[]): ShortcutDef[] => []);

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  formatShortcut: (sc: {
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    keys?: string;
    key?: string;
  }) => {
    const parts: string[] = [];
    if (sc.ctrl) parts.push('Ctrl');
    if (sc.shift) parts.push('Shift');
    if (sc.alt) parts.push('Alt');
    parts.push(sc.keys || sc.key || '?');
    return parts;
  },
  eventToBinding: (e: {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
  }) => {
    if (
      e.key === 'Escape' ||
      e.key === 'Shift' ||
      e.key === 'Control' ||
      e.key === 'Alt' ||
      e.key === 'Meta'
    )
      return null;
    return {
      keys: e.key,
      ctrl: e.ctrlKey || false,
      shift: e.shiftKey || false,
      alt: e.altKey || false,
    };
  },
  detectConflicts: (...args: unknown[]) => mockDetectConflicts(...args),
  DEFAULT_SHORTCUT_GROUPS: [
    {
      group: 'General',
      shortcuts: [
        { keys: 'k', ctrl: true, label: 'Command Palette', id: 'palette' },
        { keys: 'b', ctrl: true, label: 'Toggle Sidebar', id: 'toggle_sidebar' },
      ],
    },
  ],
}));

import KeyboardShortcuts from './KeyboardShortcuts';

const defaultGroups = [
  {
    group: 'General',
    shortcuts: [
      { keys: 'k', ctrl: true, label: 'Command Palette', id: 'palette' },
      { keys: 'b', ctrl: true, label: 'Toggle Sidebar', id: 'toggle_sidebar' },
    ],
  },
];

function renderShortcuts(props = {}) {
  return render(
    <KeyboardShortcuts
      isOpen={true}
      onClose={vi.fn()}
      groups={defaultGroups}
      overrides={{}}
      updateBinding={vi.fn()}
      resetAll={vi.fn()}
      resetOne={vi.fn()}
      isCustomized={() => false}
      {...props}
    />
  );
}

describe('KeyboardShortcuts', () => {
  it('renders nothing when not open', () => {
    const { container } = renderShortcuts({ isOpen: false });
    expect(container.querySelector('.tu-shortcuts')).not.toBeInTheDocument();
  });

  it('renders header with title', () => {
    renderShortcuts();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
  });

  it('renders shortcut groups and items', () => {
    renderShortcuts();
    expect(screen.getByText('General')).toBeInTheDocument();
    expect(screen.getByText('Command Palette')).toBeInTheDocument();
    expect(screen.getByText('Toggle Sidebar')).toBeInTheDocument();
  });

  it('renders close button', () => {
    const onClose = vi.fn();
    renderShortcuts({ onClose });
    fireEvent.click(screen.getByText('✕'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose on overlay click', () => {
    const onClose = vi.fn();
    renderShortcuts({ onClose });
    fireEvent.click(document.querySelector('.tu-shortcuts-overlay')!);
    expect(onClose).toHaveBeenCalled();
  });

  it('does not show Reset All button when no overrides', () => {
    renderShortcuts({ overrides: {} });
    expect(screen.queryByText('Reset All')).not.toBeInTheDocument();
  });

  it('shows Reset All button when overrides exist', () => {
    const resetAll = vi.fn();
    renderShortcuts({ overrides: { palette: { keys: 'j', ctrl: true } }, resetAll });
    const btn = screen.getByText('Reset All');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(resetAll).toHaveBeenCalled();
  });

  it('shows customized indicator for customized shortcuts', () => {
    renderShortcuts({ isCustomized: (id: string) => id === 'palette' });
    expect(screen.getByTitle('Customized')).toBeInTheDocument();
  });

  it('shows reset button for customized shortcut', () => {
    const resetOne = vi.fn();
    renderShortcuts({ isCustomized: (id: string) => id === 'palette', resetOne });
    fireEvent.click(screen.getByTitle('Reset to default'));
    expect(resetOne).toHaveBeenCalledWith('palette');
  });

  it('renders footer text', () => {
    renderShortcuts();
    expect(screen.getByText(/Click a shortcut to rebind/)).toBeInTheDocument();
  });

  it('starts recording when shortcut keys button is clicked', () => {
    renderShortcuts();
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    expect(screen.getByText('Press keys...')).toBeInTheDocument();
  });

  it('closes on Escape key when not recording', () => {
    const onClose = vi.fn();
    renderShortcuts({ onClose });
    const panel = document.querySelector('.tu-shortcuts')!;
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('cancels recording when Escape is pressed while recording', () => {
    renderShortcuts();
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    expect(screen.getByText('Press keys...')).toBeInTheDocument();
    // Press Escape while recording — triggers cancelRecording
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Press keys...')).not.toBeInTheDocument();
  });

  it('records a key binding with modifier and calls updateBinding (no conflict)', () => {
    const updateBinding = vi.fn();
    mockDetectConflicts.mockReturnValue([]);
    renderShortcuts({ updateBinding });
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    // Press Ctrl+J while recording — valid modifier key
    fireEvent.keyDown(window, { key: 'j', ctrlKey: true, shiftKey: false, altKey: false });
    expect(updateBinding).toHaveBeenCalledWith(
      'palette',
      expect.objectContaining({ keys: 'j', ctrl: true })
    );
    expect(screen.queryByText('Press keys...')).not.toBeInTheDocument();
  });

  it('ignores bare letter keys during recording (no modifier)', () => {
    const updateBinding = vi.fn();
    mockDetectConflicts.mockReturnValue([]);
    renderShortcuts({ updateBinding });
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    // Press bare letter 'a' — should be ignored
    fireEvent.keyDown(window, { key: 'a', ctrlKey: false, shiftKey: false, altKey: false });
    expect(updateBinding).not.toHaveBeenCalled();
    expect(screen.getByText('Press keys...')).toBeInTheDocument();
  });

  it('ignores bare modifier keys during recording', () => {
    const updateBinding = vi.fn();
    renderShortcuts({ updateBinding });
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    // Press bare Shift — eventToBinding returns null, should be ignored
    fireEvent.keyDown(window, { key: 'Shift', shiftKey: true });
    expect(updateBinding).not.toHaveBeenCalled();
    expect(screen.getByText('Press keys...')).toBeInTheDocument();
  });

  it('shows conflict bar when a conflicting key is pressed', () => {
    const conflictingSc = { id: 'toggle_sidebar', label: 'Toggle Sidebar', keys: 'b', ctrl: true };
    mockDetectConflicts.mockReturnValue([conflictingSc]);
    renderShortcuts();
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true, shiftKey: false, altKey: false });
    expect(screen.getByText(/already used by/)).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Override')).toBeInTheDocument();
  });

  it('clicking Cancel in conflict bar dismisses the conflict and stops recording', () => {
    const conflictingSc = { id: 'toggle_sidebar', label: 'Toggle Sidebar', keys: 'b', ctrl: true };
    mockDetectConflicts.mockReturnValueOnce([conflictingSc]);
    renderShortcuts();
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Press keys...')).not.toBeInTheDocument();
    expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
  });

  it('clicking Override in conflict bar calls updateBinding and stops recording', () => {
    const updateBinding = vi.fn();
    const conflictingSc = { id: 'toggle_sidebar', label: 'Toggle Sidebar', keys: 'b', ctrl: true };
    mockDetectConflicts.mockReturnValueOnce([conflictingSc]);
    renderShortcuts({ updateBinding });
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    expect(screen.getByText('Override')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Override'));
    expect(updateBinding).toHaveBeenCalledWith(
      'palette',
      expect.objectContaining({ keys: 'b', ctrl: true })
    );
    expect(screen.queryByText('Override')).not.toBeInTheDocument();
  });

  it('resets recording state when isOpen toggles to false', () => {
    const { rerender } = renderShortcuts({ isOpen: true });
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    expect(screen.getByText('Press keys...')).toBeInTheDocument();
    rerender(
      <KeyboardShortcuts
        isOpen={false}
        onClose={vi.fn()}
        groups={defaultGroups}
        overrides={{}}
        updateBinding={vi.fn()}
        resetAll={vi.fn()}
        resetOne={vi.fn()}
        isCustomized={() => false}
      />
    );
    // After close, recording state should be cleared (though modal is not rendered)
    expect(screen.queryByText('Press keys...')).not.toBeInTheDocument();
  });

  it('shows conflict indicator in ShortcutRow when recording and conflict exists', () => {
    const conflictingSc = { id: 'toggle_sidebar', label: 'Toggle Sidebar', keys: 'b', ctrl: true };
    mockDetectConflicts.mockReturnValue([conflictingSc]);
    renderShortcuts();
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    fireEvent.keyDown(window, { key: 'b', ctrlKey: true });
    // The ShortcutRow for palette should show conflict text inline
    expect(screen.getByText(/Conflicts with/)).toBeInTheDocument();
  });

  it('panel does NOT close on Escape if currently recording', () => {
    const onClose = vi.fn();
    renderShortcuts({ onClose });
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    // Press Escape from the PANEL keydown handler (not window)
    const panel = document.querySelector('.tu-shortcuts')!;
    fireEvent.keyDown(panel, { key: 'Escape' });
    // onClose should NOT be called — we're recording; window listener handles Escape→cancelRecording
    expect(onClose).not.toHaveBeenCalled();
  });

  it('records Enter key (special key, no modifier needed)', () => {
    const updateBinding = vi.fn();
    mockDetectConflicts.mockReturnValue([]);
    renderShortcuts({ updateBinding });
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]!);
    fireEvent.keyDown(window, { key: 'Enter', ctrlKey: false, shiftKey: false, altKey: false });
    expect(updateBinding).toHaveBeenCalledWith(
      'palette',
      expect.objectContaining({ keys: 'Enter' })
    );
  });
});
