import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  FavoritesContextValue,
  SubscriptionContextValue,
  User,
} from '@velobits/app-core/types/context';

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

// ── react-router-dom mock (configurable search params) ──
const mockNavigate = vi.fn();
const mockSetSearchParams = vi.fn();
let searchParamsValue = new URLSearchParams();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard', search: '' }),
  useSearchParams: () => [searchParamsValue, mockSetSearchParams],
  Link: ({
    children,
    to,
    ...p
  }: {
    children?: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href: to, ...p }, children),
}));

// ── react-redux mock ──
vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => ({ accessToken: null })),
  useDispatch: () => vi.fn(),
  Provider: ({ children }: { children?: React.ReactNode }) => children,
}));

// ── API mocks ──
vi.mock('@velobits/app-core/store/api/passesApi', () => ({
  useGetPassCatalogQuery: () => ({ data: null, isLoading: false, error: null }),
}));

interface ToolStatsQueryState {
  data: unknown;
  isLoading: boolean;
  error?: unknown;
  refetch?: () => void;
}
let toolStatsState: ToolStatsQueryState = { data: null, isLoading: false };
vi.mock('@velobits/app-core/store/api/userDataApi', () => ({
  useGetToolStatsQuery: () => toolStatsState,
}));

interface HistoryQueryState {
  data: unknown;
  isLoading: boolean;
}
let historyState: HistoryQueryState = { data: null, isLoading: false };
vi.mock('@velobits/app-core/store/api/historyApi', () => ({
  useGetHistoryQuery: () => historyState,
}));

vi.mock('@velobits/app-core/store/api/authApi', () => ({
  useResendVerificationMutation: () => [vi.fn(), { isLoading: false }],
}));

// ── SpinWheel mock ──
vi.mock('@velobits/app-core/gamification/SpinWheel', () => ({
  default: () => React.createElement('div', { 'data-testid': 'spin-wheel' }, 'SpinWheel'),
}));

// ── formatPrice mock ──
vi.mock('@velobits/app-core/utils/formatPrice', () => ({
  default: (price: number) => `$${price}`,
}));

import DashboardPage from './DashboardPage';

const defaultFavorites = {
  favorites: [],
  toggleFavorite: vi.fn(),
} as unknown as FavoritesContextValue;

const defaultSubscription = {
  isPro: false,
  upgradeLoading: false,
  cancelLoading: false,
  totalCredits: 5,
  handleUpgrade: vi.fn(),
  handleBuyPass: vi.fn(),
  handleBuyCredits: vi.fn(),
  handleCancelSubscription: vi.fn(),
  refetchStatus: vi.fn(),
} as unknown as SubscriptionContextValue;

const defaultUser = {
  id: 'test-id',
  display_name: 'Alice',
  email: 'alice@example.com',
  is_email_verified: true,
  subscription_tier: 'free',
} as User;

function renderDash(props: Record<string, unknown> = {}) {
  return render(
    <DashboardPage
      favorites={defaultFavorites}
      user={defaultUser}
      isAuthenticated={true}
      showAlert={vi.fn()}
      mode="light"
      setMode={vi.fn()}
      subscription={defaultSubscription}
      {...props}
    />
  );
}

describe('DashboardPage — payment redirects and tool stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsValue = new URLSearchParams();
    toolStatsState = { data: null, isLoading: false };
    historyState = { data: null, isLoading: false };
  });

  // ── Initial tab from URL ──
  it('opens the section from the tab query param', () => {
    searchParamsValue = new URLSearchParams('tab=profile');
    renderDash();
    expect(screen.getByText('Manage your account and preferences')).toBeInTheDocument();
  });

  it('falls back to Overview for an unknown tab param', () => {
    searchParamsValue = new URLSearchParams('tab=bogus');
    renderDash();
    expect(screen.getByText('Your FixMyText usage at a glance')).toBeInTheDocument();
  });

  it('falls back to Overview for the removed achievements tab', () => {
    searchParamsValue = new URLSearchParams('tab=achievements');
    renderDash();
    expect(screen.getByText('Your FixMyText usage at a glance')).toBeInTheDocument();
    const nav = document.querySelector('nav.tu-dash-nav') as HTMLElement;
    expect(within(nav).queryByText('Achievements')).not.toBeInTheDocument();
  });

  // ── upgrade=… redirects ──
  it('handles upgrade=success: opens subscription, alerts, refetches, clears params', () => {
    searchParamsValue = new URLSearchParams('upgrade=success');
    const showAlert = vi.fn();
    renderDash({ showAlert });
    expect(screen.getByText('Manage your plan and billing')).toBeInTheDocument();
    expect(showAlert).toHaveBeenCalledWith(
      'Welcome to Pro! Your subscription is active.',
      'success'
    );
    expect(defaultSubscription.refetchStatus).toHaveBeenCalled();
    expect(mockSetSearchParams).toHaveBeenCalledWith({}, { replace: true });
  });

  it('handles upgrade=verify-failed with a danger alert', () => {
    searchParamsValue = new URLSearchParams('upgrade=verify-failed');
    const showAlert = vi.fn();
    renderDash({ showAlert });
    expect(screen.getByText('Manage your plan and billing')).toBeInTheDocument();
    expect(showAlert).toHaveBeenCalledWith(
      'Payment received but verification failed. Please contact support if your plan is not active.',
      'danger'
    );
    expect(mockSetSearchParams).toHaveBeenCalledWith({}, { replace: true });
  });

  it('handles upgrade=cancelled: opens subscription without alerting', () => {
    searchParamsValue = new URLSearchParams('upgrade=cancelled');
    const showAlert = vi.fn();
    renderDash({ showAlert });
    expect(screen.getByText('Manage your plan and billing')).toBeInTheDocument();
    expect(showAlert).not.toHaveBeenCalled();
    expect(mockSetSearchParams).toHaveBeenCalledWith({}, { replace: true });
  });

  it('handles purchase=success: opens subscription, alerts, refetches', () => {
    searchParamsValue = new URLSearchParams('purchase=success');
    const showAlert = vi.fn();
    renderDash({ showAlert });
    expect(screen.getByText('Manage your plan and billing')).toBeInTheDocument();
    expect(showAlert).toHaveBeenCalledWith(
      'Purchase successful! Your pass or credits are now active.',
      'success'
    );
    expect(defaultSubscription.refetchStatus).toHaveBeenCalled();
  });

  it('handles purchase=verify-failed with a danger alert', () => {
    searchParamsValue = new URLSearchParams('purchase=verify-failed');
    const showAlert = vi.fn();
    renderDash({ showAlert });
    expect(showAlert).toHaveBeenCalledWith(
      'Payment received but verification failed. Please contact support if your purchase is not reflected.',
      'danger'
    );
  });

  // ── Tool stats from server ──
  it('renders top tools from server stats, filtering unknown tool ids', () => {
    toolStatsState = {
      data: {
        stats: [
          { tool_id: 'trim_extra', total_uses: 5 },
          { tool_id: 'not_a_real_tool', total_uses: 2 },
        ],
      },
      isLoading: false,
    };
    renderDash();
    expect(screen.getByText('Trim Extra Spaces')).toBeInTheDocument();
    expect(screen.getByText('5x')).toBeInTheDocument();
    expect(screen.getByText('#1')).toBeInTheDocument();
    expect(screen.queryByText('#2')).not.toBeInTheDocument();
    expect(screen.queryByText(/No tools used yet/i)).not.toBeInTheDocument();
  });

  it('sources the sidebar ops count from server tool stats', () => {
    toolStatsState = {
      data: {
        stats: [
          { tool_id: 'trim_extra', total_uses: 5 },
          { tool_id: 'camel_case', total_uses: 2 },
        ],
      },
      isLoading: false,
    };
    renderDash();
    expect(screen.getByText(/7 operations/)).toBeInTheDocument();
  });

  it('shows tool stats error state on overview and retries', () => {
    const refetch = vi.fn();
    toolStatsState = { data: null, isLoading: false, error: { status: 500 }, refetch };
    renderDash();
    expect(screen.getByText('Failed to load tool statistics')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('does not pass tool stats error to non-overview sections', () => {
    toolStatsState = { data: null, isLoading: false, error: { status: 500 }, refetch: vi.fn() };
    searchParamsValue = new URLSearchParams('tab=history');
    renderDash();
    expect(screen.queryByText('Failed to load tool statistics')).not.toBeInTheDocument();
  });

  // ── Overview with server data ──
  it('overview shows usage stats from server data', () => {
    toolStatsState = {
      data: {
        stats: [
          { tool_id: 'trim_extra', total_uses: 5 },
          { tool_id: 'camel_case', total_uses: 2 },
        ],
      },
      isLoading: false,
    };
    historyState = {
      data: {
        items: [
          {
            id: 'h1',
            tool_id: 'trim_extra',
            tool_label: 'Trim Extra Spaces',
            created_at: '2026-07-12T10:00:00Z',
          },
          {
            id: 'h2',
            tool_id: 'unknown_tool',
            tool_label: 'Mystery Tool',
            created_at: '2026-07-12T09:00:00Z',
          },
        ],
        total: 7,
        page: 1,
        page_size: 5,
        has_more: true,
      },
      isLoading: false,
    };
    const favorites = { favorites: ['trim_extra'], toggleFavorite: vi.fn() };
    renderDash({ favorites });

    // Stats grid: total ops, tools used, favorites count
    expect(screen.getByText('Your FixMyText usage at a glance')).toBeInTheDocument();
    const opsCard = screen.getByText('Operations').closest('.tu-dash-stat-card') as HTMLElement;
    expect(within(opsCard).getByText('7')).toBeInTheDocument();
    const toolsCard = screen.getByText('Tools Used').closest('.tu-dash-stat-card') as HTMLElement;
    expect(toolsCard.querySelector('.tu-dash-stat-value')?.textContent).toMatch(/^2\//);
    // 'Favorites' also matches the sidebar nav entry, so pick the stat card one
    const favCard = screen
      .getAllByText('Favorites')
      .find((el) => el.closest('.tu-dash-stat-card'))!
      .closest('.tu-dash-stat-card') as HTMLElement;
    expect(within(favCard).getByText('1')).toBeInTheDocument();

    // Per-tool data from the stats endpoint (label also appears in Recent Activity)
    expect(screen.getByText('Most Used Tools')).toBeInTheDocument();
    expect(screen.getAllByText('Trim Extra Spaces').length).toBeGreaterThan(0);
    expect(screen.getByText('5x')).toBeInTheDocument();

    // Recent activity from the history endpoint (unknown ids fall back to label)
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('Mystery Tool')).toBeInTheDocument();
  });

  it('overview shows empty recent activity when history is empty', () => {
    renderDash();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
  });
});
