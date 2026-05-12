import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => {
      const filtered = { ...props };
      ['initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover', 'variants'].forEach(
        (k) => delete filtered[k]
      );
      return <div {...filtered}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }) => children,
}));

vi.mock('../../hooks/useKeyboardShortcuts', () => ({
  formatShortcut: (sc) => {
    const parts = [];
    if (sc.ctrl) parts.push('Ctrl');
    if (sc.shift) parts.push('Shift');
    if (sc.alt) parts.push('Alt');
    parts.push(sc.keys || sc.key || '?');
    return parts;
  },
  eventToBinding: (e) => {
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
  detectConflicts: () => [],
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
    fireEvent.click(document.querySelector('.tu-shortcuts-overlay'));
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
    renderShortcuts({ isCustomized: (id) => id === 'palette' });
    expect(screen.getByTitle('Customized')).toBeInTheDocument();
  });

  it('shows reset button for customized shortcut', () => {
    const resetOne = vi.fn();
    renderShortcuts({ isCustomized: (id) => id === 'palette', resetOne });
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
    fireEvent.click(rebindBtns[0]);
    expect(screen.getByText('Press keys...')).toBeInTheDocument();
  });

  it('closes on Escape key when not recording', () => {
    const onClose = vi.fn();
    renderShortcuts({ onClose });
    const panel = document.querySelector('.tu-shortcuts');
    fireEvent.keyDown(panel, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('cancels recording when Escape is pressed while recording', () => {
    renderShortcuts();
    const rebindBtns = screen.getAllByTitle('Click to rebind');
    fireEvent.click(rebindBtns[0]);
    expect(screen.getByText('Press keys...')).toBeInTheDocument();
    // Press Escape while recording — triggers cancelRecording
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Press keys...')).not.toBeInTheDocument();
  });
});
