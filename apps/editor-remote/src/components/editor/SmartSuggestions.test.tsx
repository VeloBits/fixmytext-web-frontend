import React from 'react';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SmartSuggestions from './SmartSuggestions';
import type { ToolDefinition } from '@velobits/app-core/types/tools';

vi.mock('framer-motion', () => {
  const m =
    (tag: string) =>
    ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) =>
      React.createElement(tag || 'div', props as Record<string, unknown>, children);
  return {
    motion: new Proxy({}, { get: (_, tag: string) => m(tag) }),
    AnimatePresence: ({ children }: { children?: ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

describe('SmartSuggestions', () => {
  const suggestions = [
    { id: 'uppercase', icon: 'AA', label: 'Uppercase' },
    { id: 'lowercase', icon: 'aa', label: 'Lowercase' },
  ] as unknown as ToolDefinition[];

  it('returns null when no suggestions', () => {
    const { container } = render(
      <SmartSuggestions suggestions={[]} onToolClick={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('returns null when suggestions is null', () => {
    const { container } = render(
      <SmartSuggestions suggestions={null} onToolClick={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders suggestion pills', () => {
    render(
      <SmartSuggestions suggestions={suggestions} onToolClick={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(screen.getByText('Uppercase')).toBeInTheDocument();
    expect(screen.getByText('Lowercase')).toBeInTheDocument();
  });

  it('calls onToolClick when pill clicked', () => {
    const onToolClick = vi.fn();
    render(
      <SmartSuggestions suggestions={suggestions} onToolClick={onToolClick} onDismiss={vi.fn()} />
    );
    fireEvent.click(screen.getByText('Uppercase'));
    expect(onToolClick).toHaveBeenCalledWith(suggestions[0]);
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(
      <SmartSuggestions suggestions={suggestions} onToolClick={vi.fn()} onDismiss={onDismiss} />
    );
    const dismissBtns = screen.getAllByLabelText('Dismiss suggestion');
    fireEvent.click(dismissBtns[0]!);
    expect(onDismiss).toHaveBeenCalledWith('uppercase');
  });

  it('shows try label', () => {
    render(
      <SmartSuggestions suggestions={suggestions} onToolClick={vi.fn()} onDismiss={vi.fn()} />
    );
    expect(screen.getByText(/Try:/)).toBeInTheDocument();
  });
});
