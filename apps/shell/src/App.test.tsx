import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable state consumed by hoisted vi.mock factories below.
const mockState = vi.hoisted(() => ({
  onboarded: true,
  shareRouteMatch: null as object | null,
  auth: {
    isAuthenticated: false,
    wasAuthenticated: false,
    isLoading: false,
    accessToken: null as string | null,
  },
  reduxUser: null as object | null,
}));

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
vi.mock('react-router-dom', () => ({
  BrowserRouter: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'router' }, children),
  useNavigate: () => vi.fn(),
  useLocation: () => ({ pathname: '/', search: '' }),
  useMatch: () => mockState.shareRouteMatch,
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
  MemoryRouter: ({ children }: { children?: React.ReactNode }) => children,
  Routes: ({ children }: { children?: React.ReactNode }) =>
    React.createElement('div', { 'data-testid': 'routes' }, children),
  Route: ({ element }: { element?: React.ReactNode }) => element,
  Navigate: ({ to }: { to: string }) =>
    React.createElement('div', { 'data-testid': 'navigate', 'data-to': to }),
}));

// ── react-redux mock ──
// AppContext's only selector reads s.auth.user (the /auth/me profile).
vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => mockState.reduxUser),
  useDispatch: () => vi.fn(),
  Provider: ({ children }: { children?: React.ReactNode }) => children,
}));

// ── API mocks (authApi needed because AppContext calls useGetMeQuery) ──
vi.mock('@velobits/app-core/store/api/authApi', () => ({
  useGetMeQuery: vi.fn().mockReturnValue({ data: null, isLoading: false }),
  authApi: { reducerPath: 'authApi' },
}));

// ── hook mocks ──
vi.mock('./hooks/useAlert', () => ({
  useAlert: () => ({ alerts: [], showAlert: vi.fn(), dismissAlert: vi.fn() }),
}));
vi.mock('./hooks/useTheme', () => ({
  useTheme: () => ({ mode: 'light', setMode: vi.fn() }),
}));
// AppContext uses useOidcAuth + useGetMeQuery directly (no legacy useAuth hook).
// Mock it so tests render a deterministic unauthenticated state instead of
// triggering the real OIDC bootstrap (loadUser -> signinSilent iframe), which
// resolves asynchronously after render and trips React's act() warnings.
vi.mock('@velobits/app-core/auth/useOidcAuth', () => ({
  useOidcAuth: () => ({
    ...mockState.auth,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));
// AppContext composes the tool-groups/favorites/subscription hooks; the shell
// gates onboarding via its local useOnboardingGate hook (mocked below).
vi.mock('@velobits/app-core/hooks/useToolGroups', () => ({
  default: () => ({
    groups: [],
    ready: true,
    createGroup: vi.fn(),
    renameGroup: vi.fn(),
    deleteGroup: vi.fn(),
    addToolToGroup: vi.fn(),
    removeToolFromGroup: vi.fn(),
    setGroupTools: vi.fn(),
    reorderGroups: vi.fn(),
  }),
}));
vi.mock('./hooks/useOnboardingGate', () => ({
  default: () => ({
    seen: mockState.onboarded,
    resolved: true,
    markSeen: vi.fn(),
  }),
}));
vi.mock('@velobits/app-core/hooks/useFavorites', () => ({
  default: () => ({
    favorites: [],
    toggleFavorite: vi.fn(),
  }),
}));
vi.mock('@velobits/app-core/hooks/useSidebarChips', () => ({
  default: () => ({
    chips: [{ type: 'view', id: 'all' }],
    ready: true,
    isCustomized: false,
    addChip: vi.fn(),
    removeChip: vi.fn(),
    moveChip: vi.fn(),
    setChips: vi.fn(),
    resetChips: vi.fn(),
  }),
}));
vi.mock('@velobits/app-core/hooks/useSubscription', () => ({
  default: () => ({
    showUpgradeModal: false,
    dismissUpgradeModal: vi.fn(),
    blockedTool: null,
    isPro: false,
    handleUpgrade: vi.fn(),
    handleBuyPass: vi.fn(),
    handleBuyCredits: vi.fn(),
    upgradeLoading: false,
    cancelLoading: false,
    totalCredits: 0,
    refetchStatus: vi.fn(),
  }),
}));

// ── child component mocks ──
// App.tsx loads the home route via editor-remote/EditorPage (MF remote).
// Mock the remote module directly so the route renders the expected test element.
vi.mock('editor-remote/EditorPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'home-page' }),
}));
vi.mock('./pages/AboutPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'about-page' }),
}));
vi.mock('./pages/LoginPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'login-page' }),
}));
vi.mock('./pages/SignupPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'signup-page' }),
}));
vi.mock('./pages/ForgotPasswordPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'forgot-password-page' }),
}));
// ResetPasswordPage and VerifyEmailPage are not in the router (Keycloak handles these flows).
// Mocks omitted - no routes exist to test.
// DashboardPage lives in analytics-remote now; its route renders analytics-remote/AnalyticsPage
// (resolved via the vitest alias), so no ./pages/DashboardPage mock is needed.
vi.mock('./pages/PricingPage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'pricing-page' }),
}));
vi.mock('./pages/SharePage', () => ({
  default: () => React.createElement('div', { 'data-testid': 'share-page' }),
}));
vi.mock('./components/layout/Navbar', () => ({
  default: () => React.createElement('nav', { 'data-testid': 'navbar' }),
}));
vi.mock('./components/layout/Alert', () => ({
  default: () => React.createElement('div', { 'data-testid': 'alert' }),
}));
vi.mock('./components/layout/EmailVerificationBanner', () => ({
  default: () => React.createElement('div', { 'data-testid': 'email-verification-banner' }),
}));
vi.mock('./components/layout/OnboardingModal', () => ({
  default: () => React.createElement('div', { 'data-testid': 'onboarding-modal' }),
}));
vi.mock('./components/subscription/PassPurchaseModal', () => ({
  default: () => React.createElement('div', { 'data-testid': 'pass-purchase-modal' }),
}));

import App from './App';

describe('App', () => {
  beforeEach(() => {
    mockState.onboarded = true;
    mockState.shareRouteMatch = null;
    mockState.auth = {
      isAuthenticated: false,
      wasAuthenticated: false,
      isLoading: false,
      accessToken: null,
    };
    mockState.reduxUser = null;
  });

  it('renders without crashing', () => {
    render(<App />);
  });

  it('renders the Navbar', () => {
    render(<App />);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('renders the Alert component', () => {
    render(<App />);
    expect(screen.getByTestId('alert')).toBeInTheDocument();
  });

  it('renders PassPurchaseModal', () => {
    render(<App />);
    expect(screen.getByTestId('pass-purchase-modal')).toBeInTheDocument();
  });

  it('does not show OnboardingModal when already onboarded', () => {
    render(<App />);
    expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();
  });

  it('shows OnboardingModal when not onboarded', () => {
    mockState.onboarded = false;
    render(<App />);
    expect(screen.getByTestId('onboarding-modal')).toBeInTheDocument();
  });

  it('does not show OnboardingModal on the share viewer even when not onboarded', () => {
    // A share recipient may be a first-time visitor; the starter-kit picker must
    // not block the read-only share page (its overlay swallows all pointer events).
    mockState.onboarded = false;
    mockState.shareRouteMatch = { pathname: '/share/some-id' };
    render(<App />);
    expect(screen.queryByTestId('onboarding-modal')).not.toBeInTheDocument();
  });

  it('renders Routes container', () => {
    render(<App />);
    expect(screen.getByTestId('routes')).toBeInTheDocument();
  });

  it('wraps content in BrowserRouter', () => {
    render(<App />);
    expect(screen.getByTestId('router')).toBeInTheDocument();
  });

  it('renders Home route element', () => {
    render(<App />);
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });

  it('renders the router wrapper', () => {
    render(<App />);
    expect(screen.getByTestId('router')).toBeInTheDocument();
  });

  it('handles rtk-api-error event without crashing', () => {
    render(<App />);
    // Dispatch a global rtk-api-error event - the useEffect handler should process it
    window.dispatchEvent(
      new CustomEvent('rtk-api-error', { detail: { message: 'Server error', type: 'danger' } })
    );
    // Component should still be in the DOM
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('cleans up rtk-api-error listener on unmount', () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<App />);
    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('rtk-api-error', expect.any(Function));
    removeEventListenerSpy.mockRestore();
  });

  // ── auth-restore gate (guest-flash-on-refresh regression) ──
  // H-8 keeps tokens in memory, so a refresh of a signed-in session silently
  // re-acquires them. Until that settles the shell must hold the skeleton, not
  // paint guest chrome that flips to signed-in a moment later.

  it('holds the skeleton during session restore when a previous session existed', () => {
    mockState.auth = { ...mockState.auth, isLoading: true, wasAuthenticated: true };
    const { container } = render(<App />);
    expect(container.querySelector('.page-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
  });

  it('renders guest UI immediately when no previous session existed', () => {
    mockState.auth = { ...mockState.auth, isLoading: true, wasAuthenticated: false };
    render(<App />);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
  });

  it('keeps the skeleton up until /auth/me lands after the token restore', () => {
    mockState.auth = {
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token',
    };
    mockState.reduxUser = null; // profile fetch still in flight
    const { container } = render(<App />);
    expect(container.querySelector('.page-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
  });

  it('renders the app once the restored session and profile are both loaded', () => {
    mockState.auth = {
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token',
    };
    mockState.reduxUser = { display_name: 'Logout Tester' };
    render(<App />);
    expect(screen.getByTestId('navbar')).toBeInTheDocument();
    expect(screen.getByTestId('home-page')).toBeInTheDocument();
  });
});
