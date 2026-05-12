import { render, screen, fireEvent } from '@testing-library/react';

import DrawerPanel from './DrawerPanel';

describe('DrawerPanel', () => {
  it('renders title and children', () => {
    render(
      <DrawerPanel title="Test Drawer" color="teal" onClose={vi.fn()}>
        <div>Drawer content</div>
      </DrawerPanel>
    );
    expect(screen.getByText('Test Drawer')).toBeInTheDocument();
    expect(screen.getByText('Drawer content')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <DrawerPanel title="Test" color="purple" onClose={onClose}>
        <div>Content</div>
      </DrawerPanel>
    );
    fireEvent.click(screen.getByTitle('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  it('applies color styles for known colors', () => {
    const { container } = render(
      <DrawerPanel title="Teal" color="teal" onClose={vi.fn()}>
        <div>Content</div>
      </DrawerPanel>
    );
    const drawer = container.querySelector('.tu-drawer') as HTMLElement;
    // jsdom converts hex to rgb
    expect(drawer.style.borderColor).toBe('rgb(20, 184, 166)');
  });

  it('falls back to slate color for unknown colors', () => {
    const { container } = render(
      <DrawerPanel title="Unknown" color="neon" onClose={vi.fn()}>
        <div>Content</div>
      </DrawerPanel>
    );
    const drawer = container.querySelector('.tu-drawer') as HTMLElement;
    expect(drawer.style.borderColor).toBe('var(--violet)');
  });

  it('renders with different color variants', () => {
    const colors = ['teal', 'purple', 'amber', 'sky', 'green', 'rose', 'slate'];
    colors.forEach((color) => {
      const { unmount } = render(
        <DrawerPanel title={color} color={color} onClose={vi.fn()}>
          <div>C</div>
        </DrawerPanel>
      );
      expect(screen.getByText(color)).toBeInTheDocument();
      unmount();
    });
  });
});
