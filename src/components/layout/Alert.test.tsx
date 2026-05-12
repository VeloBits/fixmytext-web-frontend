import { render, screen, fireEvent, act } from '@testing-library/react';

import Alert from './Alert';

describe('Alert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when alerts array is empty', () => {
    const { container } = render(<Alert alerts={[]} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders nothing when no props provided', () => {
    const { container } = render(<Alert />);
    expect(container.innerHTML).toBe('');
  });

  it('renders alerts from alerts array', () => {
    const alerts = [
      { id: '1', msg: 'Success!', type: 'success' },
      { id: '2', msg: 'Error!', type: 'danger' },
    ];
    render(<Alert alerts={alerts} dismissAlert={vi.fn()} />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('renders legacy single alert prop', () => {
    const alert = { id: '1', msg: 'Legacy alert', type: 'info' };
    render(<Alert alert={alert} dismissAlert={vi.fn()} />);
    expect(screen.getByText('Legacy alert')).toBeInTheDocument();
  });

  it('renders correct type classes', () => {
    const alerts = [{ id: '1', msg: 'Warning!', type: 'warning' }];
    render(<Alert alerts={alerts} dismissAlert={vi.fn()} />);
    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('tu-toast--warning');
  });

  it('renders info icon for unknown type', () => {
    const alerts = [{ id: '1', msg: 'Unknown', type: 'unknown_type' }];
    render(<Alert alerts={alerts} dismissAlert={vi.fn()} />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('calls dismissAlert when close button is clicked after animation', () => {
    const dismissAlert = vi.fn();
    const alerts = [{ id: '1', msg: 'Dismiss me', type: 'success' }];
    render(<Alert alerts={alerts} dismissAlert={dismissAlert} />);

    fireEvent.click(screen.getByLabelText('Dismiss'));

    // Should add exit class
    const toast = screen.getByRole('alert');
    expect(toast.className).toContain('tu-toast--exit');

    // After 200ms timeout, dismissAlert should be called
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(dismissAlert).toHaveBeenCalledWith('1');
  });

  it('uses msg as key when id is not provided', () => {
    const alerts = [{ msg: 'No id alert', type: 'info' }];
    render(<Alert alerts={alerts} dismissAlert={vi.fn()} />);
    expect(screen.getByText('No id alert')).toBeInTheDocument();
  });

  it('has aria-live polite on wrapper', () => {
    const alerts = [{ id: '1', msg: 'Test', type: 'info' }];
    render(<Alert alerts={alerts} dismissAlert={vi.fn()} />);
    const wrapper = screen.getByText('Test').closest('.tu-toast-wrapper');
    expect(wrapper).toHaveAttribute('aria-live', 'polite');
  });

  it('handles dismiss without dismissAlert prop (noop)', () => {
    const alerts = [{ id: '1', msg: 'Test', type: 'info' }];
    render(<Alert alerts={alerts} />);
    // Should not throw
    fireEvent.click(screen.getByLabelText('Dismiss'));
    act(() => {
      vi.advanceTimersByTime(200);
    });
  });

  it('renders all alert types with correct icons', () => {
    const types = ['success', 'danger', 'warning', 'info'];
    types.forEach((type) => {
      const { unmount } = render(
        <Alert alerts={[{ id: type, msg: `${type} msg`, type }]} dismissAlert={vi.fn()} />
      );
      expect(screen.getByText(`${type} msg`)).toBeInTheDocument();
      unmount();
    });
  });
});
