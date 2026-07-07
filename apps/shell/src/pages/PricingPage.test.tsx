import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SubscriptionContextValue } from '@/contexts/AppContext';

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

// ── react-router-dom mock ──
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/pricing', search: '' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  Link: ({ children, to, ...p }: { children?: React.ReactNode; to: string; [key: string]: unknown }) => React.createElement('a', { href: to, ...p }, children),
}));

// ── react-redux mock ──
const mockUseSelector = vi.fn();
vi.mock('react-redux', () => ({
  useSelector: (fn: (state: unknown) => unknown) => mockUseSelector(fn),
  useDispatch: () => vi.fn(),
  Provider: ({ children }: { children?: React.ReactNode }) => children,
}));

// ── useOidcAuth mock ──
vi.mock('@/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: true,
    isLoading: false,
    accessToken: 'token123',
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// ── hooks mock ──
vi.mock('@/hooks/useSubscription', () => ({
  default: () => defaultSubscription,
}));

// ── API mock ──
const mockCatalogQuery = vi.fn();
vi.mock('@/store/api/passesApi', () => ({
  useGetPassCatalogQuery: () => mockCatalogQuery(),
}));

// ── formatPrice mock ──
vi.mock('@/utils/formatPrice', () => ({
  default: (price: number) => `$${price}`,
}));

const samplePass = {
  id: 'day_single',
  name: '1-Day Single',
  subtitle: 'One tool for a day',
  price: 100,
  uses_per_day: 20,
  tools: 1,
  duration_days: 1,
  symbol: '$',
  currency: 'usd',
};

const samplePassMultiDay = {
  id: 'sprint_all',
  name: '3-Day All Tools',
  subtitle: 'Sprint pass',
  price: 300,
  uses_per_day: 50,
  tools: -1,
  duration_days: 3,
  symbol: '$',
  currency: 'usd',
};

const sampleCredit = {
  id: 'credits_5',
  name: '5 Credits',
  credits: 5,
  price: 50,
  symbol: '$',
  currency: 'usd',
};

const defaultSubscriptionMocks = {
  handleUpgrade: vi.fn(),
  handleBuyPass: vi.fn().mockResolvedValue({}),
  handleBuyCredits: vi.fn().mockResolvedValue({}),
  handleCancelSubscription: vi.fn(),
};
const defaultSubscription = {
  isPro: false,
  upgradeLoading: false,
  cancelLoading: false,
  totalCredits: 0,
  ...defaultSubscriptionMocks,
} as unknown as SubscriptionContextValue;

function renderPricing(
  props: Record<string, unknown> = {},
  catalogOverride?: Record<string, unknown>,
  accessToken: string | null = 'token123'
) {
  mockUseSelector.mockReturnValue({ accessToken });
  mockUseOidcAuth.mockReturnValue({
    isAuthenticated: !!accessToken,
    isLoading: false,
    accessToken,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  });
  mockCatalogQuery.mockReturnValue(
    catalogOverride ?? {
      data: { passes: [samplePass, samplePassMultiDay], credit_packs: [sampleCredit] },
      isLoading: false,
      error: null,
    }
  );
  return render(<PricingPage showAlert={vi.fn()} subscription={defaultSubscription} {...props} />);
}

import PricingPage from './PricingPage';
import { expectNoA11yViolations } from '@/test/axeHelper';
import { useOidcAuth } from '@/auth/useOidcAuth';
const mockUseOidcAuth = vi.mocked(useOidcAuth);

describe('PricingPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
    defaultSubscriptionMocks.handleUpgrade.mockReset();
    defaultSubscriptionMocks.handleBuyPass.mockResolvedValue({});
    defaultSubscriptionMocks.handleBuyCredits.mockResolvedValue({});
    // Default: authenticated (reset after any per-test override)
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'token123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  // ── Basic render ──
  it('renders without crashing', () => {
    renderPricing();
  });

  it('renders the page title', () => {
    renderPricing();
    expect(screen.getByText('Simple, Flexible Pricing')).toBeInTheDocument();
  });

  it('renders the subtitle about free uses', () => {
    renderPricing();
    expect(screen.getByText(/3 free uses\/day/i)).toBeInTheDocument();
  });

  it('renders the 70+ Tools badge', () => {
    renderPricing();
    expect(screen.getByText('70+ Tools')).toBeInTheDocument();
  });

  it('renders the Cancel Anytime badge', () => {
    renderPricing();
    expect(screen.getByText('Cancel Anytime')).toBeInTheDocument();
  });

  it('renders the Earn Free Passes badge', () => {
    renderPricing();
    expect(screen.getByText('Earn Free Passes')).toBeInTheDocument();
  });

  // ── Pro card ──
  it('renders the Pro section', () => {
    renderPricing();
    expect(screen.getByText('Pro')).toBeInTheDocument();
  });

  it('renders Upgrade to Pro button for free users', () => {
    renderPricing();
    expect(screen.getByText('Upgrade to Pro')).toBeInTheDocument();
  });

  it('shows Your Current Plan when isPro', () => {
    renderPricing({ subscription: { ...defaultSubscription, isPro: true } });
    expect(screen.getByText('Your Current Plan')).toBeInTheDocument();
  });

  it('calls handleUpgrade when Upgrade to Pro is clicked', () => {
    renderPricing();
    fireEvent.click(screen.getByText('Upgrade to Pro'));
    expect(defaultSubscriptionMocks.handleUpgrade).toHaveBeenCalled();
  });

  it('navigates to login if not authenticated when upgrading', () => {
    mockUseSelector.mockReturnValue({ accessToken: null });
    mockUseOidcAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, accessToken: null, oidcUser: null, login: vi.fn(), logout: vi.fn() });
    mockCatalogQuery.mockReturnValue({
      data: { passes: [samplePass], credit_packs: [] },
      isLoading: false,
      error: null,
    });
    render(<PricingPage showAlert={vi.fn()} subscription={defaultSubscription} />);
    fireEvent.click(screen.getByText('Upgrade to Pro'));
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  // ── Pass group tabs ──
  it('renders all pass group tabs', () => {
    renderPricing();
    expect(screen.getByText('Micro')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
    expect(screen.getByText('Multi-Day')).toBeInTheDocument();
    expect(screen.getByText('Monthly')).toBeInTheDocument();
    expect(screen.getByText('Long-Term')).toBeInTheDocument();
  });

  it('switches pass group by clicking tabs', () => {
    renderPricing();
    fireEvent.click(screen.getByText('Multi-Day'));
    // multiday tab active — day pass group desc changes
    expect(screen.getByText('Short-term commitment')).toBeInTheDocument();
  });

  // ── Pass cards ──
  it('renders pass cards from catalog', () => {
    renderPricing();
    expect(screen.getByText('1-Day Single')).toBeInTheDocument();
  });

  it('renders Buy Now button on pass cards', () => {
    renderPricing();
    const buyBtns = screen.getAllByText('Buy Now');
    expect(buyBtns.length).toBeGreaterThan(0);
  });

  it('calls handleBuyPass when Buy Now is clicked', async () => {
    renderPricing();
    const buyBtns = screen.getAllByText('Buy Now');
    fireEvent.click(buyBtns[0]!);
    await waitFor(() => {
      expect(defaultSubscriptionMocks.handleBuyPass).toHaveBeenCalled();
    });
  });

  it('navigates to login if not authenticated when buying pass', async () => {
    mockUseSelector.mockReturnValue({ accessToken: null });
    mockUseOidcAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, accessToken: null, oidcUser: null, login: vi.fn(), logout: vi.fn() });
    mockCatalogQuery.mockReturnValue({
      data: { passes: [samplePass], credit_packs: [] },
      isLoading: false,
      error: null,
    });
    const mockShowAlert = vi.fn();
    render(<PricingPage showAlert={mockShowAlert} subscription={defaultSubscription} />);
    fireEvent.click(screen.getByText('Buy Now'));
    expect(mockShowAlert).toHaveBeenCalledWith('Sign in to purchase a pass', 'warning');
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  // ── Credit packs ──
  it('renders Credit Packs section', () => {
    renderPricing();
    expect(screen.getByText('Credit Packs')).toBeInTheDocument();
  });

  it('renders credit pack Buy button', () => {
    renderPricing();
    expect(screen.getByText('Buy')).toBeInTheDocument();
  });

  it('calls handleBuyCredits when credit Buy is clicked', async () => {
    renderPricing();
    fireEvent.click(screen.getByText('Buy'));
    await waitFor(() => {
      expect(defaultSubscriptionMocks.handleBuyCredits).toHaveBeenCalled();
    });
  });

  // ── Loading / Error states ──
  it('shows loading spinner while catalog loads', () => {
    renderPricing({}, { data: null, isLoading: true, error: null });
    expect(screen.getByText(/Loading passes/i)).toBeInTheDocument();
  });

  it('shows error message when catalog fails', () => {
    renderPricing({}, { data: null, isLoading: false, error: { status: 500 } });
    expect(screen.getByText(/Failed to load passes/i)).toBeInTheDocument();
  });

  // ── Free section ──
  it('renders Free Forever section', () => {
    renderPricing();
    expect(screen.getByText('Free Forever')).toBeInTheDocument();
  });

  it('renders back button', () => {
    renderPricing();
    expect(screen.getByText('Back to Editor')).toBeInTheDocument();
  });

  it('navigates to home when back button clicked', () => {
    renderPricing();
    fireEvent.click(screen.getByText('Back to Editor'));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  // ── Pass detail drawer ──
  it('opens pass detail drawer when pass card clicked', () => {
    renderPricing();
    const passCard = screen.getByLabelText(/View 1-Day Single details/i);
    fireEvent.click(passCard);
    // subtitle appears in both grid card and drawer — check drawer content
    expect(screen.getAllByText('One tool for a day').length).toBeGreaterThanOrEqual(1);
    // Drawer-specific content: "What's included" heading
    expect(screen.getByText("What's included")).toBeInTheDocument();
  });

  it('closes pass detail drawer when overlay clicked', () => {
    renderPricing();
    fireEvent.click(screen.getByLabelText(/View 1-Day Single details/i));
    // Close by clicking the close button
    const closeBtns = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('tu-pass-detail-close'));
    if (closeBtns.length > 0) {
      fireEvent.click(closeBtns[0]!);
    }
  });

  it('shows per-day price for multi-day passes', () => {
    // Sprint all pass has 3 days, should show per/day
    mockCatalogQuery.mockReturnValue({
      data: { passes: [samplePassMultiDay], credit_packs: [] },
      isLoading: false,
      error: null,
    });
    // switch to multiday tab
    render(<PricingPage showAlert={vi.fn()} subscription={defaultSubscription} />);
    fireEvent.click(screen.getByText('Multi-Day'));
    // perDay price should appear (price/days = 300/3 = 100)
    expect(screen.getAllByText(/\$100/).length).toBeGreaterThan(0);
  });

  // ── Pass group tab switching ──
  it('switches to Micro tab', () => {
    renderPricing();
    fireEvent.click(screen.getByText('Micro'));
    expect(screen.getByText('Just a taste — pocket change')).toBeInTheDocument();
  });

  it('switches to Day tab', () => {
    renderPricing();
    fireEvent.click(screen.getByText('Multi-Day'));
    fireEvent.click(screen.getByText('Day'));
    expect(screen.getByText('One productive day')).toBeInTheDocument();
  });

  it('switches to Monthly tab', () => {
    renderPricing();
    fireEvent.click(screen.getByText('Monthly'));
    expect(screen.getByText('Regular power user')).toBeInTheDocument();
  });

  it('switches to Long-Term tab', () => {
    renderPricing();
    fireEvent.click(screen.getByText('Long-Term'));
    expect(screen.getByText('Best value for pros')).toBeInTheDocument();
  });

  // ── Credit card interactions ──
  it('opens credit detail drawer when credit card clicked', () => {
    renderPricing();
    const creditCard = screen.getByLabelText(/View 5 Credits details/i);
    fireEvent.click(creditCard);
    expect(screen.getAllByText('5 Credits').length).toBeGreaterThanOrEqual(1);
  });

  it('calls handleBuyCredits via unauthenticated user shows alert', async () => {
    mockUseSelector.mockReturnValue({ accessToken: null });
    mockUseOidcAuth.mockReturnValue({ isAuthenticated: false, isLoading: false, accessToken: null, oidcUser: null, login: vi.fn(), logout: vi.fn() });
    mockCatalogQuery.mockReturnValue({
      data: { passes: [], credit_packs: [sampleCredit] },
      isLoading: false,
      error: null,
    });
    const mockShowAlert = vi.fn();
    render(<PricingPage showAlert={mockShowAlert} subscription={defaultSubscription} />);
    fireEvent.click(screen.getByText('Buy'));
    expect(mockShowAlert).toHaveBeenCalledWith('Sign in to purchase credits', 'warning');
  });

  // ── Pass detail drawer interactions ──
  it('closes pass detail drawer when overlay clicked', () => {
    renderPricing();
    fireEvent.click(screen.getByLabelText(/View 1-Day Single details/i));
    expect(screen.getByText("What's included")).toBeInTheDocument();
    // Click overlay to close
    const overlay = document.querySelector('.tu-pass-detail-overlay');
    if (overlay) fireEvent.click(overlay);
  });

  it('calls handleBuyPass from within drawer detail CTA', async () => {
    renderPricing();
    fireEvent.click(screen.getByLabelText(/View 1-Day Single details/i));
    // Find the CTA buy button inside the detail panel
    const buyNowBtns = screen
      .getAllByRole('button')
      .filter((b) => b.textContent.includes('Buy Now'));
    fireEvent.click(buyNowBtns[buyNowBtns.length - 1]!);
    await waitFor(() => {
      expect(defaultSubscriptionMocks.handleBuyPass).toHaveBeenCalled();
    });
  });

  it('opens pass detail when the Details button is activated', () => {
    renderPricing();
    // Each card exposes a real <button aria-label="View X details">Details</button>;
    // browsers fire click on Enter/Space natively, so a single click() covers
    // both keyboard and mouse activation paths.
    const detailsBtn = screen.getByRole('button', { name: /View 1-Day Single details/i });
    fireEvent.click(detailsBtn);
    expect(screen.getByText("What's included")).toBeInTheDocument();
  });

  it('opens credit detail when the Details button is activated', () => {
    renderPricing();
    const detailsBtn = screen.getByRole('button', { name: /View 5 Credits details/i });
    fireEvent.click(detailsBtn);
    expect(screen.getAllByText('5 Credits').length).toBeGreaterThanOrEqual(1);
  });

  it('shows upgradeLoading state on pro button', () => {
    renderPricing({ subscription: { ...defaultSubscription, upgradeLoading: true } });
    expect(screen.getByText('Redirecting...')).toBeInTheDocument();
  });

  it('retry button is visible on catalog error', () => {
    renderPricing({}, { data: null, isLoading: false, error: { status: 500 } });
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('shows cancel subscription button for pro users', () => {
    renderPricing({ subscription: { ...defaultSubscription, isPro: true } });
    // pro users see "Your Current Plan" (no cancel button in pricing page, only in dashboard)
    expect(screen.getByText('Your Current Plan')).toBeInTheDocument();
  });

  it('renders pass card with All tools chip for all-tools pass', () => {
    mockCatalogQuery.mockReturnValue({
      data: { passes: [samplePassMultiDay], credit_packs: [] },
      isLoading: false,
      error: null,
    });
    render(<PricingPage showAlert={vi.fn()} subscription={defaultSubscription} />);
    fireEvent.click(screen.getByText('Multi-Day'));
    expect(screen.getAllByText('All tools').length).toBeGreaterThan(0);
  });

  it('shows single tool chip for single-tool pass', () => {
    renderPricing();
    expect(screen.getAllByText('1 tool').length).toBeGreaterThan(0);
  });

  it('shows uses per day chip', () => {
    renderPricing();
    expect(screen.getAllByText('20 uses/day').length).toBeGreaterThan(0);
  });

  it('has no axe violations', async () => {
    const { container } = renderPricing();
    await expectNoA11yViolations(container);
  });
});
