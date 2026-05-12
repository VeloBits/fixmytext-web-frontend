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
    button: ({ children, ...props }) => {
      const filtered = { ...props };
      ['initial', 'animate', 'exit', 'transition', 'whileTap', 'whileHover', 'variants'].forEach(
        (k) => delete filtered[k]
      );
      return <button {...filtered}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }) => children,
}));

import CommandPalette from './CommandPalette';

function makeSearch(overrides = {}) {
  return {
    isOpen: true,
    query: '',
    setQuery: vi.fn(),
    results: [],
    close: vi.fn(),
    ...overrides,
  };
}

describe('CommandPalette', () => {
  it('renders nothing when not open', () => {
    const { container } = render(
      <CommandPalette search={makeSearch({ isOpen: false })} onToolClick={vi.fn()} />
    );
    expect(container.querySelector('.tu-palette-input')).not.toBeInTheDocument();
  });

  it('renders input when open', () => {
    render(<CommandPalette search={makeSearch()} onToolClick={vi.fn()} />);
    expect(
      screen.getByPlaceholderText('What do you want to do with your text?')
    ).toBeInTheDocument();
  });

  it('shows empty message when query exists but no results', () => {
    render(<CommandPalette search={makeSearch({ query: 'xyz' })} onToolClick={vi.fn()} />);
    expect(screen.getByText(/No tools found for/)).toBeInTheDocument();
  });

  it('renders results', () => {
    const results = [
      {
        id: 'upper',
        label: 'Uppercase',
        description: 'Convert to uppercase',
        icon: 'UP',
        color: 'blue',
      },
      {
        id: 'lower',
        label: 'Lowercase',
        description: 'Convert to lowercase',
        icon: 'LO',
        color: 'green',
      },
    ];
    render(<CommandPalette search={makeSearch({ results })} onToolClick={vi.fn()} />);
    expect(screen.getByText('Uppercase')).toBeInTheDocument();
    expect(screen.getByText('Lowercase')).toBeInTheDocument();
  });

  it('calls onToolClick and close when a result is clicked', () => {
    const onToolClick = vi.fn();
    const close = vi.fn();
    const results = [
      { id: 'upper', label: 'Uppercase', description: 'desc', icon: 'UP', color: 'blue' },
    ];
    render(<CommandPalette search={makeSearch({ results, close })} onToolClick={onToolClick} />);
    fireEvent.click(screen.getByText('Uppercase'));
    expect(onToolClick).toHaveBeenCalledWith(results[0]);
    expect(close).toHaveBeenCalled();
  });

  it('calls search.setQuery on input change', () => {
    const setQuery = vi.fn();
    render(<CommandPalette search={makeSearch({ setQuery })} onToolClick={vi.fn()} />);
    fireEvent.change(screen.getByPlaceholderText('What do you want to do with your text?'), {
      target: { value: 'upper' },
    });
    expect(setQuery).toHaveBeenCalledWith('upper');
  });

  it('closes on overlay click', () => {
    const close = vi.fn();
    render(<CommandPalette search={makeSearch({ close })} onToolClick={vi.fn()} />);
    // Click overlay (the outer div)
    fireEvent.click(document.querySelector('.tu-palette-overlay'));
    expect(close).toHaveBeenCalled();
  });

  it('handles Escape key to close', () => {
    const close = vi.fn();
    render(<CommandPalette search={makeSearch({ close })} onToolClick={vi.fn()} />);
    const palette = document.querySelector('.tu-palette');
    fireEvent.keyDown(palette, { key: 'Escape' });
    expect(close).toHaveBeenCalled();
  });

  it('handles ArrowDown key', () => {
    const results = [
      { id: 'a', label: 'A', description: 'd', icon: 'i', color: 'c' },
      { id: 'b', label: 'B', description: 'd', icon: 'i', color: 'c' },
    ];
    render(<CommandPalette search={makeSearch({ results })} onToolClick={vi.fn()} />);
    const palette = document.querySelector('.tu-palette');
    fireEvent.keyDown(palette, { key: 'ArrowDown' });
    // Second item should become active
    const items = document.querySelectorAll('.tu-palette-item');
    expect(items[1].className).toContain('tu-palette-item--active');
  });

  it('handles Enter key to select active result', () => {
    const onToolClick = vi.fn();
    const close = vi.fn();
    const results = [{ id: 'a', label: 'A', description: 'd', icon: 'i', color: 'c' }];
    render(<CommandPalette search={makeSearch({ results, close })} onToolClick={onToolClick} />);
    const palette = document.querySelector('.tu-palette');
    fireEvent.keyDown(palette, { key: 'Enter' });
    expect(onToolClick).toHaveBeenCalledWith(results[0]);
  });

  it('renders keyboard hints', () => {
    render(<CommandPalette search={makeSearch()} onToolClick={vi.fn()} />);
    expect(screen.getByText('Navigate')).toBeInTheDocument();
    expect(screen.getByText('Select')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });

  it('renders tool tab tag when available', () => {
    const results = [
      { id: 'a', label: 'A', description: 'd', icon: 'i', color: 'c', tabs: ['writing', 'code'] },
    ];
    render(<CommandPalette search={makeSearch({ results })} onToolClick={vi.fn()} />);
    expect(screen.getByText('writing')).toBeInTheDocument();
  });

  it('handles mouseEnter on results to update active index', () => {
    const results = [
      { id: 'a', label: 'A', description: 'd', icon: 'i', color: 'c' },
      { id: 'b', label: 'B', description: 'd', icon: 'i', color: 'c' },
    ];
    render(<CommandPalette search={makeSearch({ results })} onToolClick={vi.fn()} />);
    const items = document.querySelectorAll('.tu-palette-item');
    fireEvent.mouseEnter(items[1]);
    expect(items[1].className).toContain('tu-palette-item--active');
  });
});
