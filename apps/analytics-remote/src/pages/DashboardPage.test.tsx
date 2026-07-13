import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type {
  FavoritesContextValue,
  PersonaContextValue,
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

// ── react-router-dom mock ──
const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard', search: '' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
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
vi.mock('@velobits/app-core/store/api/userDataApi', () => ({
  useGetToolStatsQuery: () => ({ data: null, isLoading: false }),
}));
vi.mock('@velobits/app-core/store/api/historyApi', () => ({
  useGetHistoryQuery: () => ({ data: null, isLoading: false }),
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

const defaultPersona = {
  persona: 'writer',
  setPersona: vi.fn(),
  onboarded: true,
} as unknown as PersonaContextValue;

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
      persona={defaultPersona}
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

describe('DashboardPage', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  // ── Basic render ──
  it('renders without crashing', () => {
    renderDash();
  });

  it('shows the user display name in sidebar', () => {
    renderDash();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
  });

  it('shows Guest when no user display name', () => {
    renderDash({ user: null });
    expect(screen.getAllByText('Guest').length).toBeGreaterThan(0);
  });

  it('shows operations stat in sidebar, sourced from server stats', () => {
    renderDash();
    // Mock tool stats data is null → 0 operations
    expect(screen.getByText(/0 operations/i)).toBeInTheDocument();
  });

  it('renders no gamification widgets in the sidebar', () => {
    renderDash();
    expect(screen.queryByText(/XP/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Lvl/)).not.toBeInTheDocument();
    expect(screen.queryByText(/day streak/i)).not.toBeInTheDocument();
  });

  // ── Navigation tabs ──
  it('renders all sidebar nav items', () => {
    renderDash();
    const nav = document.querySelector('nav.tu-dash-nav') as HTMLElement;
    expect(within(nav).getByText('Overview')).toBeInTheDocument();
    expect(within(nav).getByText('Subscription')).toBeInTheDocument();
    expect(within(nav).getByText('Rewards')).toBeInTheDocument();
    expect(within(nav).getByText('Profile')).toBeInTheDocument();
    expect(within(nav).getByText('Favorites')).toBeInTheDocument();
    expect(within(nav).getByText('Usage History')).toBeInTheDocument();
    expect(within(nav).queryByText('Achievements')).not.toBeInTheDocument();
  });

  it('shows Overview section by default', () => {
    renderDash();
    expect(screen.getByText('Your FixMyText usage at a glance')).toBeInTheDocument();
  });

  it('switches to Subscription tab', () => {
    renderDash();
    fireEvent.click(screen.getByText('Subscription'));
    expect(screen.getByText('Manage your plan and billing')).toBeInTheDocument();
  });

  it('switches to Rewards tab', () => {
    renderDash();
    fireEvent.click(screen.getByText('Rewards'));
    expect(screen.getByText('Weekly Rewards')).toBeInTheDocument();
    expect(screen.getByTestId('spin-wheel')).toBeInTheDocument();
  });

  it('switches to Profile tab', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByText('Manage your account and preferences')).toBeInTheDocument();
  });

  it('switches to Favorites tab', () => {
    renderDash();
    const favButtons = screen.getAllByText('Favorites');
    const navBtn = favButtons.find((el) => el.closest('nav'));
    fireEvent.click(navBtn || favButtons[0]!);
    expect(screen.getByText('0 tools favorited')).toBeInTheDocument();
  });

  it('switches to Usage History tab', () => {
    renderDash();
    fireEvent.click(screen.getByText('Usage History'));
    expect(screen.getAllByText(/This session/i).length).toBeGreaterThan(0);
  });

  // ── Overview section ──
  it('shows usage stat cards in overview', () => {
    renderDash();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Tools Used')).toBeInTheDocument();
    // 'Favorites' also matches the nav entry, so scope it to a stat card
    expect(
      screen.getAllByText('Favorites').some((el) => el.closest('.tu-dash-stat-card'))
    ).toBe(true);
  });

  it('shows empty tools message when no tools used', () => {
    renderDash();
    expect(screen.getByText(/No tools used yet/i)).toBeInTheDocument();
  });

  it('shows empty recent activity message when history is empty', () => {
    renderDash();
    expect(screen.getByText('Recent Activity')).toBeInTheDocument();
    expect(screen.getByText('No recent activity yet')).toBeInTheDocument();
  });

  it('navigates back to editor', () => {
    renderDash();
    fireEvent.click(screen.getByText(/Back to Editor/i));
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  // ── Profile section ──
  it('shows email on profile tab', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('shows Signed in badge for authenticated user', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByText('Signed in')).toBeInTheDocument();
  });

  it('shows Guest badge for unauthenticated user', () => {
    renderDash({ isAuthenticated: false });
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByText('Guest')).toBeInTheDocument();
  });

  it('shows theme toggle buttons on profile', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByText(/Light/)).toBeInTheDocument();
    expect(screen.getByText(/Dark/)).toBeInTheDocument();
  });

  it('shows persona grid on profile', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    expect(screen.getByText(/Writer/i)).toBeInTheDocument();
  });

  // ── Favorites tab ──
  it('shows empty favorites message when none', () => {
    renderDash();
    const favButtons = screen.getAllByText('Favorites');
    const navBtn = favButtons.find((el) => el.closest('nav'));
    fireEvent.click(navBtn || favButtons[0]!);
    expect(screen.getByText('No favorites yet')).toBeInTheDocument();
  });

  // ── Usage History tab ──
  it('shows empty history message when no session ops', () => {
    renderDash();
    fireEvent.click(screen.getByText('Usage History'));
    expect(screen.getByText('No activity this session')).toBeInTheDocument();
  });

  it('shows discovered tools section', () => {
    renderDash();
    fireEvent.click(screen.getByText('Usage History'));
    expect(screen.getByText(/Discovered Tools/i)).toBeInTheDocument();
  });

  // ── Subscription tab ──
  it('shows Free Plan when not pro', () => {
    renderDash();
    fireEvent.click(screen.getByText('Subscription'));
    expect(screen.getByText('Free Plan')).toBeInTheDocument();
  });

  it('shows Pro Plan badge when isPro', () => {
    renderDash({ subscription: { ...defaultSubscription, isPro: true } });
    fireEvent.click(screen.getByText('Subscription'));
    expect(screen.getByText('Pro Plan')).toBeInTheDocument();
  });

  it('shows credits count for free user', () => {
    renderDash();
    fireEvent.click(screen.getByText('Subscription'));
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('Credits')).toBeInTheDocument();
  });

  it('shows subscription tab content', () => {
    renderDash();
    fireEvent.click(screen.getByText('Subscription'));
    expect(screen.getByText('Free Plan')).toBeInTheDocument();
  });

  it('shows upgrade button for free user', () => {
    renderDash();
    fireEvent.click(screen.getByText('Subscription'));
    expect(screen.getAllByText(/Upgrade to Pro/i).length).toBeGreaterThan(0);
  });

  // ── Profile handlers ──
  it('clicking edit name button shows input field', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    // Find the edit pencil button
    const editBtn = screen.getByTitle('Edit name');
    fireEvent.click(editBtn);
    expect(screen.getByPlaceholderText('Display name')).toBeInTheDocument();
  });

  it('saves name on Save button click', () => {
    const showAlert = vi.fn();
    renderDash({ showAlert });
    fireEvent.click(screen.getByText('Profile'));
    fireEvent.click(screen.getByTitle('Edit name'));
    fireEvent.click(screen.getByText('Save'));
    expect(showAlert).toHaveBeenCalledWith('Display name updated (local only)', 'success');
  });

  it('cancels name editing on Cancel button click', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    fireEvent.click(screen.getByTitle('Edit name'));
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByPlaceholderText('Display name')).not.toBeInTheDocument();
  });

  it('saves name on Enter key in name input', () => {
    const showAlert = vi.fn();
    renderDash({ showAlert });
    fireEvent.click(screen.getByText('Profile'));
    fireEvent.click(screen.getByTitle('Edit name'));
    const input = screen.getByPlaceholderText('Display name');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(showAlert).toHaveBeenCalledWith('Display name updated (local only)', 'success');
  });

  it('cancels name editing on Escape key', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    fireEvent.click(screen.getByTitle('Edit name'));
    const input = screen.getByPlaceholderText('Display name');
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByPlaceholderText('Display name')).not.toBeInTheDocument();
  });

  it('calls setMode when theme button clicked', () => {
    const setMode = vi.fn();
    renderDash({ setMode });
    fireEvent.click(screen.getByText('Profile'));
    fireEvent.click(screen.getByText(/Dark/));
    expect(setMode).toHaveBeenCalledWith('dark');
  });

  it('calls setMode with light when light button clicked', () => {
    const setMode = vi.fn();
    renderDash({ setMode, mode: 'dark' });
    fireEvent.click(screen.getByText('Profile'));
    fireEvent.click(screen.getByText(/Light/));
    expect(setMode).toHaveBeenCalledWith('light');
  });

  it('updates name input value on typing', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    fireEvent.click(screen.getByTitle('Edit name'));
    const input = screen.getByPlaceholderText('Display name') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Bob' } });
    expect(input.value).toBe('Bob');
  });

  it('calls setPersona when persona card clicked', () => {
    renderDash();
    fireEvent.click(screen.getByText('Profile'));
    // Click a persona button
    const writerBtn = screen.getAllByText(/Writer/i)[0]!;
    fireEvent.click(writerBtn);
    expect(defaultPersona.setPersona).toHaveBeenCalled();
  });

  // ── Favorites with items ──
  it('shows favorited tools and calls toggleFavorite', () => {
    const toggleFavorite = vi.fn();
    const favorites = { favorites: ['trim_extra'], toggleFavorite } as FavoritesContextValue;
    renderDash({ favorites });
    const favButtons = screen.getAllByText('Favorites');
    const navBtn = favButtons.find((el) => el.closest('nav'));
    fireEvent.click(navBtn || favButtons[0]!);
    expect(screen.getByText('1 tools favorited')).toBeInTheDocument();
    // There should be a remove-from-favorites button (the heart)
    const heartBtn = screen.getByTitle('Remove from favorites');
    fireEvent.click(heartBtn);
    expect(toggleFavorite).toHaveBeenCalledWith('trim_extra');
  });

  // ── Subscription tab: handleUpgrade ──
  it('calls handleUpgrade when Upgrade to Pro is clicked in subscription tab', () => {
    renderDash();
    fireEvent.click(screen.getByText('Subscription'));
    const upgradeBtns = screen.getAllByText(/Upgrade to Pro/i);
    fireEvent.click(upgradeBtns[0]!);
    expect(defaultSubscription.handleUpgrade).toHaveBeenCalled();
  });

  // ── Subscription tab: handleCancelSubscription ──
  it('calls handleCancelSubscription when Manage Plan is clicked for pro user', () => {
    // The "Manage Plan" button shows window.confirm first
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderDash({ subscription: { ...defaultSubscription, isPro: true } });
    fireEvent.click(screen.getByText('Subscription'));
    fireEvent.click(screen.getByText('Manage Plan'));
    expect(defaultSubscription.handleCancelSubscription).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  // ── Subscription tab: navigate to pricing ──
  it('navigates to /pricing when View all plans is clicked', () => {
    renderDash();
    fireEvent.click(screen.getByText('Subscription'));
    fireEvent.click(screen.getByText('View all plans'));
    expect(mockNavigate).toHaveBeenCalledWith('/pricing');
  });
});
