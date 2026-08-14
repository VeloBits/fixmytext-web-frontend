import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PassPurchaseModal from './PassPurchaseModal';
import type { PassPurchaseModalProps } from './PassPurchaseModal';
import type { ToolDefinition } from '@velobits/app-core/types/tools';
import type { SubscriptionContextValue } from '@/contexts/AppContext';

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

vi.mock('react-router-dom', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children?: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useParams: () => ({}),
}));

vi.mock('@velobits/app-core/store/api/passesApi', () => ({
  useGetPassCatalogQuery: vi.fn(() => ({
    data: {
      passes: [
        {
          id: 'day_single',
          name: 'Day Single',
          price: 99,
          uses_per_day: 10,
          symbol: '$',
          currency: 'usd',
        },
        {
          id: 'day_triple',
          name: 'Day Triple',
          price: 199,
          tools: 3,
          symbol: '$',
          currency: 'usd',
        },
      ],
      credit_packs: [{ id: 'pack_5', name: '5 Credits', credits: 5, price: 299 }],
    },
  })),
}));

vi.mock('@velobits/app-core/utils/formatPrice', () => ({
  default: (price: number) => `$${(price / 100).toFixed(2)}`,
}));

describe('PassPurchaseModal', () => {
  const baseProps: PassPurchaseModalProps = {
    show: true,
    onDismiss: vi.fn(),
    blockedTool: { id: 'fix_grammar', label: 'Fix Grammar' } as ToolDefinition,
    subscription: {
      getToolUsage: vi.fn(() => ({ uses: 3, max: 3, hasPass: false })),
      handleBuyPass: vi.fn(),
      handleBuyCredits: vi.fn(),
      handleUpgrade: vi.fn(),
    } as unknown as SubscriptionContextValue,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when show is false', () => {
    const { container } = render(<PassPurchaseModal {...baseProps} show={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when blockedTool is null', () => {
    const { container } = render(<PassPurchaseModal {...baseProps} blockedTool={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders the modal title', () => {
    render(<PassPurchaseModal {...baseProps} />);
    expect(screen.getByText('Daily Limit Reached')).toBeInTheDocument();
  });

  it('shows blocked tool usage', () => {
    render(<PassPurchaseModal {...baseProps} />);
    // 'Fix Grammar' may appear multiple times (title + body) - check at least one
    expect(screen.getAllByText(/Fix Grammar/).length).toBeGreaterThan(0);
    expect(screen.getByText('3/3')).toBeInTheDocument();
  });

  it('shows pass options', () => {
    render(<PassPurchaseModal {...baseProps} />);
    expect(screen.getByText('Day Single')).toBeInTheDocument();
    expect(screen.getByText('Day Triple')).toBeInTheDocument();
    expect(screen.getByText('5 Credits')).toBeInTheDocument();
  });

  it('shows pro upsell', () => {
    render(<PassPurchaseModal {...baseProps} />);
    expect(screen.getByText(/unlimited everything/)).toBeInTheDocument();
  });

  it('calls onDismiss when close button clicked', () => {
    render(<PassPurchaseModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText('Close'));
    expect(baseProps.onDismiss).toHaveBeenCalled();
  });

  it('calls onDismiss when overlay clicked', () => {
    render(<PassPurchaseModal {...baseProps} />);
    const overlay = screen.getByText('Daily Limit Reached').closest('.tu-upgrade-overlay');
    fireEvent.click(overlay!);
    expect(baseProps.onDismiss).toHaveBeenCalled();
  });

  it('shows free-pass hint', () => {
    render(<PassPurchaseModal {...baseProps} />);
    expect(screen.getByText(/weekly reward spin/)).toBeInTheDocument();
  });

  it('shows browse all passes link', () => {
    render(<PassPurchaseModal {...baseProps} />);
    expect(screen.getByText('Browse all passes')).toBeInTheDocument();
  });

  it('calls handleBuyPass when single pass option is clicked', async () => {
    render(<PassPurchaseModal {...baseProps} />);
    // Click the Day Single pass option
    fireEvent.click(screen.getByText('Day Single').closest('div')!.parentElement!);
    expect(baseProps.subscription.handleBuyPass).toHaveBeenCalledWith('day_single', [
      'fix_grammar',
    ]);
  });

  it('calls handleBuyCredits when credit option is clicked', async () => {
    render(<PassPurchaseModal {...baseProps} />);
    fireEvent.click(screen.getByText('5 Credits').closest('div')!.parentElement!);
    expect(baseProps.subscription.handleBuyCredits).toHaveBeenCalledWith('pack_5');
  });

  it('calls handleUpgrade when pro upsell is clicked', () => {
    render(<PassPurchaseModal {...baseProps} />);
    fireEvent.click(screen.getByText(/unlimited everything/).closest('div')!.parentElement!);
    expect(baseProps.subscription.handleUpgrade).toHaveBeenCalled();
  });

  it('calls onDismiss when Browse all passes is clicked', () => {
    render(<PassPurchaseModal {...baseProps} />);
    fireEvent.click(screen.getByText('Browse all passes'));
    expect(baseProps.onDismiss).toHaveBeenCalled();
  });

  it('opens the tool picker (prefilled with the blocked tool) for Day Triple', () => {
    render(<PassPurchaseModal {...baseProps} />);
    fireEvent.click(screen.getByText('Day Triple').closest('div')!.parentElement!);
    // The picker replaces the old navigate-away behavior: buying stays in flow.
    expect(baseProps.onDismiss).not.toHaveBeenCalled();
    expect(
      screen.getByRole('dialog', { name: /choose 3 tools for day triple/i })
    ).toBeInTheDocument();
    // Prefilled with the tool that triggered the upsell.
    expect(screen.getByTestId('tool-picker-counter')).toHaveTextContent('1 of 3 selected');
  });
});
