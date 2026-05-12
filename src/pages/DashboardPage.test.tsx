import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { GamificationContextValue, SubscriptionContextValue, User } from '../contexts/AppContext';

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
  Link: ({ children, to, ...p }: { children?: React.ReactNode; to: string; [key: string]: unknown }) => React.createElement('a', { href: to, ...p }, children),
}));

// ── react-redux mock ──
vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => ({ accessToken: null })),
  useDispatch: () => vi.fn(),
  Provider: ({ children }: { children?: React.ReactNode }) => children,
}));

// ── API mocks ──
vi.mock('../store/api/passesApi', () => ({
  useGetPassCatalogQuery: () => ({ data: null, isLoading: false, error: null }),
}));
vi.mock('../store/api/userDataApi', () => ({
  useGetToolStatsQuery: () => ({ data: null, isLoading: false }),
}));
vi.mock('../store/api/authApi', () => ({
  useResendVerificationMutation: () => [vi.fn(), { isLoading: false }],
}));

// ── SpinWheel mock ──
vi.mock('../components/gamification/SpinWheel', () => ({
  default: () => React.createElement('div', { 'data-testid': 'spin-wheel' }, 'SpinWheel'),
}));

// ── formatPrice mock ──
vi.mock('../utils/formatPrice', () => ({
  default: (price: number) => `$${price}`,
}));

import DashboardPage from './DashboardPage';

const defaultGamification = {
  xp: 120,
  level: { level: 2, title: 'Apprentice', xp: 100 },
  nextLevel: { level: 3, title: 'Journeyman', xp: 300 },
  xpProgress: 10,
  streak: { current: 3, best: 7 },
  totalOps: 25,
  totalChars: 5000,
  achievements: ['first_use'],
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

  it('shows level title and number in sidebar', () => {
    renderDash();
    expect(screen.getAllByText(/Apprentice/i).length).toBeGreaterThan(0);
  });

  it('shows XP value in sidebar', () => {
    renderDash();
    expect(screen.getAllByText(/120 XP/).length).toBeGreaterThan(0);
  });

  it('shows streak stat in sidebar', () => {
    renderDash();
    expect(screen.getByText(/3 day streak/i)).toBeInTheDocument();
  });

  it('shows operations stat in sidebar', () => {
    renderDash();
    expect(screen.getByText(/25 operations/i)).toBeInTheDocument();
  });

  // ── Navigation tabs ──
  it('renders all sidebar nav items', () => {
    renderDash();
    expect(screen.getAllByText('Overview').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Subscription').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Rewards').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Achievements').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Favorites').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Usage History').length).toBeGreaterThan(0);
  });

  it('shows Overview section by default', () => {
    renderDash();
    expect(screen.getByText('Your FixMyText journey at a glance')).toBeInTheDocument();
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

  it('switches to Achievements tab', () => {
    renderDash();
    // Click the nav button (which is a button containing the text "Achievements")
    const achButtons = screen.getAllByText('Achievements');
    // The nav button is the one inside <nav>
    const navBtn = achButtons.find((el) => el.closest('nav'));
    fireEvent.click(navBtn || achButtons[0]!);
    expect(screen.getByText(/of .* unlocked/i)).toBeInTheDocument();
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
  it('shows stat cards in overview', () => {
    renderDash();
    expect(screen.getByText('Operations')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Day Streak')).toBeInTheDocument();
    expect(screen.getByText('Discovered')).toBeInTheDocument();
    expect(screen.getAllByText('Achievements').length).toBeGreaterThan(0);
  });

  it('shows empty tools message when no tools used', () => {
    renderDash();
    expect(screen.getByText(/No tools used yet/i)).toBeInTheDocument();
  });

  it('shows empty category message when no tools used', () => {
    renderDash();
    expect(screen.getByText(/No usage data yet/i)).toBeInTheDocument();
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
    expect(defaultGamification.setPersona).toHaveBeenCalled();
  });

  // ── Favorites with items ──
  it('shows favorited tools and calls toggleFavorite', () => {
    const toggleFavorite = vi.fn();
    const gamification = { ...defaultGamification, favorites: ['trim_extra'], toggleFavorite };
    renderDash({ gamification });
    const favButtons = screen.getAllByText('Favorites');
    const navBtn = favButtons.find((el) => el.closest('nav'));
    fireEvent.click(navBtn || favButtons[0]!);
    // There should be a remove-from-favorites button (the heart)
    const heartBtn = screen.getByTitle('Remove from favorites');
    fireEvent.click(heartBtn);
    expect(toggleFavorite).toHaveBeenCalledWith('trim_extra');
  });

  // ── Overview: View all achievements link ──
  it('clicking View all in achievements preview switches to achievements tab', () => {
    renderDash();
    const viewAllBtn = screen.getByText('View all');
    fireEvent.click(viewAllBtn);
    expect(screen.getByText(/of .* unlocked/i)).toBeInTheDocument();
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

  // ── Usage history with data ──
  it('shows history items when sessionOps exist', () => {
    const gamification = {
      ...defaultGamification,
      sessionOps: [{ id: 'trim', tab: 'text', time: Date.now(), isNew: false }],
    };
    renderDash({ gamification });
    fireEvent.click(screen.getByText('Usage History'));
    expect(screen.getByText(/1 operations/i)).toBeInTheDocument();
  });
});
