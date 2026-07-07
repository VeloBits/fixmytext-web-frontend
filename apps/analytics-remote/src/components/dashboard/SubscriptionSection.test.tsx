import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SubscriptionContextValue } from '@velobits/app-core/types/context';
import type { NavigateFunction } from 'react-router-dom';

// ── framer-motion mock ──
vi.mock('framer-motion', () => {
  const m =
    (tag: string) =>
    ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => {
      const p = { ...props };
      [
        'initial',
        'animate',
        'exit',
        'transition',
        'whileTap',
        'whileHover',
        'whileInView',
        'viewport',
        'variants',
      ].forEach((k) => delete p[k]);
      return React.createElement(tag || 'div', p, children);
    };
  return {
    motion: new Proxy({}, { get: (_, t) => m(t as string) }),
    AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

// ── passesApi mock (configurable per test) ──
interface PassesQueryState {
  data: unknown;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}
let passesState: PassesQueryState;
vi.mock('@velobits/app-core/store/api/passesApi', () => ({
  useGetPassCatalogQuery: () => passesState,
}));

// ── formatPrice mock ──
vi.mock('@velobits/app-core/utils/formatPrice', () => ({
  default: (price: number) => `$${price}`,
}));

import SubscriptionSection from './SubscriptionSection';

const makePass = (id: string, overrides: Record<string, unknown> = {}) => ({
  id,
  name: `Pass ${id}`,
  price: 49,
  symbol: '$',
  currency: 'usd',
  uses_per_day: 100,
  duration_days: 1,
  ...overrides,
});

const defaultCatalog = {
  passes: [
    makePass('day_single'),
    makePass('day_triple'),
    makePass('day_all'),
    makePass('sprint_all'),
    makePass('unpopular_pass'),
  ],
};

function makeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    isPro: false,
    upgradeLoading: false,
    cancelLoading: false,
    totalCredits: 0,
    handleUpgrade: vi.fn(),
    handleBuyPass: vi.fn().mockResolvedValue(undefined),
    handleBuyCredits: vi.fn().mockResolvedValue(undefined),
    handleCancelSubscription: vi.fn(),
    refetchStatus: vi.fn(),
    ...overrides,
  } as unknown as SubscriptionContextValue;
}

function renderSub(props: Record<string, unknown> = {}) {
  const subscription = (props.subscription as SubscriptionContextValue) || makeSubscription();
  const navigate = (props.navigate as NavigateFunction) || (vi.fn() as unknown as NavigateFunction);
  const showAlert = (props.showAlert as (msg: string, type?: string) => void) || vi.fn();
  render(
    <SubscriptionSection
      subscription={subscription}
      showAlert={showAlert}
      navigate={navigate}
      isAuthenticated={props.isAuthenticated !== undefined ? (props.isAuthenticated as boolean) : true}
    />
  );
  return { subscription, navigate, showAlert };
}

describe('SubscriptionSection', () => {
  beforeEach(() => {
    passesState = { data: defaultCatalog, isLoading: false, error: null, refetch: vi.fn() };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── Error state ──
  it('renders error state and retries on click when catalog fails to load', () => {
    passesState = { data: null, isLoading: false, error: { status: 500 }, refetch: vi.fn() };
    renderSub();
    expect(screen.getByText('Failed to load subscription data')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(passesState.refetch).toHaveBeenCalled();
    // The rest of the section is not rendered
    expect(screen.queryByText('Go Pro')).not.toBeInTheDocument();
  });

  // ── Loading state ──
  it('shows loading indicator while catalog loads', () => {
    passesState = { data: null, isLoading: true, error: null, refetch: vi.fn() };
    renderSub();
    expect(screen.getByText(/Loading plans/i)).toBeInTheDocument();
  });

  // ── Popular passes ──
  it('renders only the popular passes from the catalog', () => {
    renderSub();
    expect(screen.getByText('Pass day_single')).toBeInTheDocument();
    expect(screen.getByText('Pass day_triple')).toBeInTheDocument();
    expect(screen.getByText('Pass day_all')).toBeInTheDocument();
    expect(screen.getByText('Pass sprint_all')).toBeInTheDocument();
    expect(screen.queryByText('Pass unpopular_pass')).not.toBeInTheDocument();
    expect(screen.getAllByText('$49').length).toBe(4);
    expect(screen.getAllByText(/100 uses\/day/).length).toBe(4);
  });

  it('buys a pass: shows pending state then calls handleBuyPass', async () => {
    let resolveBuy!: () => void;
    const handleBuyPass = vi.fn(
      () =>
        new Promise<void>((res) => {
          resolveBuy = res;
        })
    );
    const subscription = makeSubscription({ handleBuyPass });
    renderSub({ subscription });

    const buyButtons = screen.getAllByText('Buy');
    fireEvent.click(buyButtons[0]!);
    expect(handleBuyPass).toHaveBeenCalledWith('day_single', []);
    // While pending, the clicked button shows '...'
    expect(screen.getByText('...')).toBeInTheDocument();

    await act(async () => {
      resolveBuy();
    });
    expect(screen.queryByText('...')).not.toBeInTheDocument();
    expect(screen.getAllByText('Buy').length).toBe(4);
  });

  it('redirects to login instead of buying when unauthenticated', () => {
    const { subscription, navigate, showAlert } = renderSub({ isAuthenticated: false });
    fireEvent.click(screen.getAllByText('Buy')[0]!);
    expect(showAlert).toHaveBeenCalledWith('Sign in to purchase', 'warning');
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(subscription.handleBuyPass).not.toHaveBeenCalled();
  });

  // ── Upgrade ──
  it('calls handleUpgrade when authenticated', () => {
    const { subscription } = renderSub();
    fireEvent.click(screen.getByText('Upgrade to Pro'));
    expect(subscription.handleUpgrade).toHaveBeenCalled();
  });

  it('redirects to login on upgrade when unauthenticated', () => {
    const { subscription, navigate } = renderSub({ isAuthenticated: false });
    fireEvent.click(screen.getByText('Upgrade to Pro'));
    expect(navigate).toHaveBeenCalledWith('/login');
    expect(subscription.handleUpgrade).not.toHaveBeenCalled();
  });

  it('shows Loading... on the upgrade button while upgradeLoading', () => {
    renderSub({ subscription: makeSubscription({ upgradeLoading: true }) });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  // ── Pricing / currency ──
  it('shows localized pro price for a supported currency', () => {
    passesState = {
      data: { passes: [makePass('day_single', { currency: 'inr', symbol: '₹' })] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderSub();
    expect(screen.getByText(/₹399/)).toBeInTheDocument();
  });

  it('falls back to $5 pro price for an unsupported currency', () => {
    passesState = {
      data: { passes: [makePass('day_single', { currency: 'jpy', symbol: '¥' })] },
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    };
    renderSub();
    expect(screen.getByText(/\$5/)).toBeInTheDocument();
  });

  it('renders defaults when catalog has no passes', () => {
    passesState = { data: null, isLoading: false, error: null, refetch: vi.fn() };
    renderSub();
    expect(screen.getByText(/\$5/)).toBeInTheDocument();
    expect(screen.queryByText('Buy')).not.toBeInTheDocument();
  });

  // ── Plan card ──
  it('shows credits in the free plan description when totalCredits > 0', () => {
    renderSub({ subscription: makeSubscription({ totalCredits: 7 }) });
    expect(screen.getByText(/· 7 credits/)).toBeInTheDocument();
  });

  it('omits credits from the description when totalCredits is 0', () => {
    renderSub();
    expect(screen.queryByText(/credits/)).not.toBeInTheDocument();
    expect(screen.getByText(/3 free uses per tool per day/)).toBeInTheDocument();
  });

  it('does not cancel subscription when confirm is dismissed', () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const subscription = makeSubscription({ isPro: true });
    renderSub({ subscription });
    fireEvent.click(screen.getByText('Manage Plan'));
    expect(subscription.handleCancelSubscription).not.toHaveBeenCalled();
  });

  it('shows Cancelling... while cancelLoading for pro users', () => {
    renderSub({ subscription: makeSubscription({ isPro: true, cancelLoading: true }) });
    expect(screen.getByText('Cancelling...')).toBeInTheDocument();
  });

  it('hides upgrade card and passes for pro users', () => {
    renderSub({ subscription: makeSubscription({ isPro: true }) });
    expect(screen.getByText('Pro Plan')).toBeInTheDocument();
    expect(screen.getByText('Unlimited access to all tools')).toBeInTheDocument();
    expect(screen.queryByText('Go Pro')).not.toBeInTheDocument();
    expect(screen.queryByText('Popular Passes')).not.toBeInTheDocument();
  });
});
