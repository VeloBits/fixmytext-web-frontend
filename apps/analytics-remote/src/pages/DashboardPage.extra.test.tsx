import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  GamificationContextValue,
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

const defaultGamification = {
  xp: 120,
  level: { level: 2, title: 'Novice', xp: 100 },
  nextLevel: { level: 3, title: 'Apprentice', xp: 250 },
  xpProgress: 10,
  streak: { current: 2, best: 7 },
  totalOps: 25,
  totalChars: 5000,
  achievements: ['first_step'],
  favorites: [],
  toolsUsed: {},
  discoveredTools: ['trim_extra'],
  sessionOps: [],
  dailyQuest: null,
  onboarded: true,
  persona: 'writer',
  setPersona: vi.fn(),
  toggleFavorite: vi.fn(),
} as unknown as GamificationContextValue;

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
      gamification={defaultGamification}
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
    expect(screen.getByText('Your FixMyText journey at a glance')).toBeInTheDocument();
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

  it('falls back to local toolsUsed for top tools and builds category breakdown', () => {
    const gamification = {
      ...defaultGamification,
      toolsUsed: { trim_extra: 7, camel_case: 3, not_a_real_tool: 1 },
    };
    renderDash({ gamification });
    // Top tools (sorted desc, unknown ids filtered)
    expect(screen.getByText('Trim Extra Spaces')).toBeInTheDocument();
    expect(screen.getByText('camelCase')).toBeInTheDocument();
    expect(screen.getByText('7x')).toBeInTheDocument();
    expect(screen.getByText('3x')).toBeInTheDocument();
    // Category breakdown: transform = 7 + 3, code = 3
    const card = screen.getByText('Category Breakdown').closest('.tu-dash-card') as HTMLElement;
    expect(within(card).getByText('Transform')).toBeInTheDocument();
    expect(within(card).getByText('Code & Data')).toBeInTheDocument();
    expect(within(card).getByText('10')).toBeInTheDocument();
    expect(within(card).getByText('3')).toBeInTheDocument();
    expect(screen.queryByText(/No usage data yet/i)).not.toBeInTheDocument();
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

  // ── Missing gamification fallbacks ──
  it('renders defaults when gamification is missing', () => {
    renderDash({ gamification: null as unknown as GamificationContextValue });
    expect(screen.getByText(/Beginner — Lvl 1/)).toBeInTheDocument();
    expect(screen.getByText('0 XP')).toBeInTheDocument();
    expect(screen.getByText(/0 day streak/)).toBeInTheDocument();
    expect(screen.getByText(/0 operations/)).toBeInTheDocument();
  });

  // ── Achievements section unlocked branch ──
  it('shows an unlocked achievement in the achievements section', () => {
    searchParamsValue = new URLSearchParams('tab=achievements');
    renderDash();
    expect(screen.getByText(/of .* unlocked/i)).toBeInTheDocument();
    expect(screen.getByText('Unlocked')).toBeInTheDocument();
    expect(screen.getByText('First Step')).toBeInTheDocument();
  });

  // ── History section branches ──
  it('renders history ops with NEW badge, known tool label and empty time', () => {
    const gamification = {
      ...defaultGamification,
      sessionOps: [
        { id: 'trim_extra', tab: 'transform', time: null, isNew: true },
        { id: 'mystery_tool', isNew: false },
      ],
    };
    searchParamsValue = new URLSearchParams('tab=history');
    renderDash({ gamification });
    expect(screen.getByText(/2 operations/)).toBeInTheDocument();
    expect(screen.getByText('NEW')).toBeInTheDocument();
    expect(screen.getByText('Trim Extra Spaces')).toBeInTheDocument();
    // Unknown tool id falls back to raw id and default icon
    expect(screen.getByText('mystery_tool')).toBeInTheDocument();
  });
});
