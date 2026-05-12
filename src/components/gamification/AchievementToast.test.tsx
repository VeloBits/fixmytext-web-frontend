import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import AchievementToast from './AchievementToast';

vi.mock('framer-motion', () => {
    const m =
    (tag: string) =>
    ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement(tag || 'div', props, children);
  return {
    motion: new Proxy({}, { get: (_, tag) => m(tag as string) }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

describe('AchievementToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when no achievement', () => {
    const { container } = render(<AchievementToast achievement={null} onDismiss={vi.fn()} />);
    expect(container.querySelector('.tu-achieve-overlay')).not.toBeInTheDocument();
  });

  it('renders achievement content', () => {
    const achievement = { icon: '🏆', label: 'First Tool', desc: 'Used your first tool!' };
    render(<AchievementToast achievement={achievement} onDismiss={vi.fn()} />);
    expect(screen.getByText('Achievement Unlocked!')).toBeInTheDocument();
    expect(screen.getByText('First Tool')).toBeInTheDocument();
    expect(screen.getByText('Used your first tool!')).toBeInTheDocument();
    // Icon '🏆' appears in both main area and confetti — just check at least one exists
    expect(screen.getAllByText('🏆').length).toBeGreaterThan(0);
  });

  it('shows dismiss hint', () => {
    const achievement = { icon: '⭐', label: 'Star' };
    render(<AchievementToast achievement={achievement} onDismiss={vi.fn()} />);
    expect(screen.getByText('Click anywhere or press Esc to close')).toBeInTheDocument();
  });

  it('auto-dismisses after 5 seconds', () => {
    const onDismiss = vi.fn();
    const achievement = { icon: '⭐', label: 'Star' };
    render(<AchievementToast achievement={achievement} onDismiss={onDismiss} />);
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('dismisses on Escape key', () => {
    const onDismiss = vi.fn();
    const achievement = { icon: '⭐', label: 'Star' };
    render(<AchievementToast achievement={achievement} onDismiss={onDismiss} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalled();
  });

  it('dismisses on overlay click', () => {
    const onDismiss = vi.fn();
    const achievement = { icon: '⭐', label: 'Star' };
    render(<AchievementToast achievement={achievement} onDismiss={onDismiss} />);
    const overlay = screen.getByText('Achievement Unlocked!').closest('.tu-achieve-overlay');
    fireEvent.click(overlay!);
    expect(onDismiss).toHaveBeenCalled();
  });

  it('does not dismiss on modal click (stops propagation)', () => {
    const onDismiss = vi.fn();
    const achievement = { icon: '⭐', label: 'Star' };
    render(<AchievementToast achievement={achievement} onDismiss={onDismiss} />);
    const modal = screen.getByText('Achievement Unlocked!').closest('.tu-achieve-modal');
    fireEvent.click(modal!);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('renders without desc', () => {
    const achievement = { icon: '⭐', label: 'Star' };
    render(<AchievementToast achievement={achievement} onDismiss={vi.fn()} />);
    expect(screen.getByText('Star')).toBeInTheDocument();
  });

  it('renders confetti particles', () => {
    const achievement = { icon: '⭐', label: 'Star' };
    const { container } = render(
      <AchievementToast achievement={achievement} onDismiss={vi.fn()} />
    );
    const confettiWrap = container.querySelector('.tu-achieve-confetti-wrap');
    expect(confettiWrap).toBeInTheDocument();
    expect(confettiWrap!.children.length).toBe(12);
  });
});
