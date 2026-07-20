import { renderHook, act } from '@testing-library/react';

const mockCreateProCheckout = vi.fn();
const mockVerifyProPayment = vi.fn();
const mockCancelSub = vi.fn();
const mockRefetchStatus = vi.fn();
const mockNavigate = vi.fn();

// Mutable mock so individual tests can override
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSubscriptionQuery: any = vi.fn(() => ({
  data: {
    tier: 'free',
    tool_uses_today: { uppercase: 2 },
    daily_login_bonus: false,
    region: 'US',
    free_uses_per_tool: 3,
  },
  refetch: mockRefetchStatus,
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));

vi.mock('../auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: true,
    wasAuthenticated: true,
    isLoading: false,
    accessToken: 'tok',
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../store/api/subscriptionApi', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  useGetSubscriptionStatusQuery: (...args: any[]) => mockSubscriptionQuery(...args),
  useCreateProCheckoutMutation: () => [mockCreateProCheckout, { isLoading: false }],
  useVerifyProPaymentMutation: () => [mockVerifyProPayment],
  useCancelSubscriptionMutation: () => [mockCancelSub, { isLoading: false }],
}));

vi.mock('./usePasses', () => ({
  default: vi.fn(() => ({
    hasPassFor: vi.fn(() => false),
    totalCredits: 0,
    activePasses: [],
    activeCredits: [],
    refetchPasses: vi.fn(),
    handleBuyPass: vi.fn(),
    handleBuyCredits: vi.fn(),
    handleSpin: vi.fn(),
    passOrderLoading: false,
    creditOrderLoading: false,
    spinLoading: false,
    spinHistory: [],
    refetchSpinHistory: vi.fn(),
  })),
}));

vi.mock('../utils/razorpay', () => ({
  openRazorpayCheckout: vi.fn(),
  executeCheckoutFlow: vi.fn().mockResolvedValue(undefined),
}));

import { useSelector } from 'react-redux';
import { useOidcAuth } from '../auth/useOidcAuth';
import useSubscription from './useSubscription';
import { executeCheckoutFlow } from '../utils/razorpay';
import type { ToolDefinition } from '../types/tools';

const mockUseSelector = vi.mocked(useSelector);
const mockUseOidcAuth = vi.mocked(useOidcAuth);

describe('useSubscription', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let showAlert: any;

  beforeEach(() => {
    vi.clearAllMocks();
    showAlert = vi.fn();
    mockUseSelector.mockReturnValue({ accessToken: 'tok' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    mockCancelSub.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockSubscriptionQuery.mockReturnValue({
      data: {
        tier: 'free',
        tool_uses_today: { uppercase: 2 },
        daily_login_bonus: false,
        region: 'US',
        free_uses_per_tool: 3,
      },
      refetch: mockRefetchStatus,
    });
    vi.mocked(executeCheckoutFlow).mockResolvedValue(undefined);
  });

  it('returns subscription state', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(result.current.tier).toBe('free');
    expect(result.current.isPro).toBe(false);
    expect(result.current.region).toBe('US');
    expect(result.current.toolUsesToday).toEqual({ uppercase: 2 });
    expect(result.current.dailyLoginBonus).toBe(false);
  });

  it('checkToolAccess returns true for always-free tool', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(
      result.current.checkToolAccess({
        id: 'find_replace',
        type: 'api',
      } as unknown as ToolDefinition)
    ).toBe(true);
  });

  it('checkToolAccess returns true for drawer tool', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(
      result.current.checkToolAccess({
        id: 'some_drawer',
        type: 'drawer',
      } as unknown as ToolDefinition)
    ).toBe(true);
  });

  it('checkToolAccess returns true when not authenticated', () => {
    mockUseSelector.mockReturnValue({ accessToken: null });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: false,
      wasAuthenticated: false,
      isLoading: false,
      accessToken: null,
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(
      result.current.checkToolAccess({ id: 'uppercase', type: 'api' } as unknown as ToolDefinition)
    ).toBe(true);
  });

  it('checkToolAccess returns true for pro users', () => {
    mockSubscriptionQuery.mockReturnValue({
      data: {
        tier: 'pro',
        tool_uses_today: {},
        daily_login_bonus: false,
        region: 'US',
        free_uses_per_tool: 3,
      },
      refetch: mockRefetchStatus,
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(
      result.current.checkToolAccess({ id: 'uppercase', type: 'api' } as unknown as ToolDefinition)
    ).toBe(true);
  });

  it('checkToolAccess returns true when under free limit', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    // uppercase has 2 uses, limit is 3
    expect(
      result.current.checkToolAccess({ id: 'uppercase', type: 'api' } as unknown as ToolDefinition)
    ).toBe(true);
  });

  it('checkToolAccess shows upgrade modal when over limit', () => {
    mockSubscriptionQuery.mockReturnValue({
      data: {
        tier: 'free',
        tool_uses_today: { lowercase: 3 },
        daily_login_bonus: false,
        region: 'US',
        free_uses_per_tool: 3,
      },
      refetch: mockRefetchStatus,
    });
    const tool = { id: 'lowercase', type: 'api' } as unknown as ToolDefinition;
    const { result } = renderHook(() => useSubscription({ showAlert }));
    let access;
    act(() => {
      access = result.current.checkToolAccess(tool);
    });
    expect(access).toBe(false);
    expect(result.current.showUpgradeModal).toBe(true);
    expect(result.current.blockedTool).toEqual(tool);
  });

  it('checkToolAccess returns true with daily login bonus', () => {
    mockSubscriptionQuery.mockReturnValue({
      data: {
        tier: 'free',
        tool_uses_today: { uppercase: 3 },
        daily_login_bonus: true,
        region: 'US',
        free_uses_per_tool: 3,
      },
      refetch: mockRefetchStatus,
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(
      result.current.checkToolAccess({ id: 'uppercase', type: 'api' } as unknown as ToolDefinition)
    ).toBe(true);
  });

  it('checkToolAccess returns true for null tool', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(result.current.checkToolAccess(null)).toBe(true);
  });

  it('notifyBlocked opens the upsell modal and resyncs from the server', () => {
    mockSubscriptionQuery.mockReturnValue({
      data: {
        tier: 'free',
        tool_uses_today: {}, // client counter thinks there's quota left…
        daily_login_bonus: false,
        region: 'US',
        free_uses_per_tool: 3,
      },
      refetch: mockRefetchStatus,
    });
    const tool = { id: 'uppercase', type: 'api' } as unknown as ToolDefinition;
    const { result } = renderHook(() => useSubscription({ showAlert }));
    act(() => {
      // …but the server said 402: its verdict wins.
      result.current.notifyBlocked(tool);
    });
    expect(result.current.showUpgradeModal).toBe(true);
    expect(result.current.blockedTool).toEqual(tool);
    expect(mockRefetchStatus).toHaveBeenCalled();
  });

  it('exposes freeUsesPerTool and Pro expiry fields from status', () => {
    mockSubscriptionQuery.mockReturnValue({
      data: {
        tier: 'pro',
        tool_uses_today: {},
        daily_login_bonus: false,
        region: 'US',
        free_uses_per_tool: 5,
        pro_expires_at: '2026-08-14T00:00:00Z',
        pro_cancelled: true,
      },
      refetch: mockRefetchStatus,
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(result.current.freeUsesPerTool).toBe(5);
    expect(result.current.proExpiresAt).toBe('2026-08-14T00:00:00Z');
    expect(result.current.proCancelled).toBe(true);
  });

  it('dismissUpgradeModal clears modal state', () => {
    mockSubscriptionQuery.mockReturnValue({
      data: {
        tier: 'free',
        tool_uses_today: { test: 5 },
        daily_login_bonus: false,
        region: 'US',
        free_uses_per_tool: 3,
      },
      refetch: mockRefetchStatus,
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    act(() => {
      result.current.checkToolAccess({ id: 'test', type: 'api' } as unknown as ToolDefinition);
    });
    expect(result.current.showUpgradeModal).toBe(true);
    act(() => {
      result.current.dismissUpgradeModal();
    });
    expect(result.current.showUpgradeModal).toBe(false);
    expect(result.current.blockedTool).toBeNull();
  });

  it('getToolUsage returns Infinity max for pro user', () => {
    mockSubscriptionQuery.mockReturnValue({
      data: {
        tier: 'pro',
        tool_uses_today: {},
        daily_login_bonus: false,
        region: 'US',
        free_uses_per_tool: 3,
      },
      refetch: mockRefetchStatus,
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    const usage = result.current.getToolUsage('uppercase');
    expect(usage.max).toBe(Infinity);
  });

  it('handles missing status data', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockSubscriptionQuery.mockReturnValue({ data: null as any, refetch: mockRefetchStatus });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(result.current.tier).toBe('free');
  });

  it('handleUpgrade calls executeCheckoutFlow', async () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    await act(async () => {
      await result.current.handleUpgrade();
    });
    expect(vi.mocked(executeCheckoutFlow)).toHaveBeenCalled();
  });

  it('handleCancelSubscription calls cancelSub', async () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    await act(async () => {
      await result.current.handleCancelSubscription();
    });
    expect(mockCancelSub).toHaveBeenCalled();
    expect(mockRefetchStatus).toHaveBeenCalled();
  });

  it('handleCancelSubscription shows error on failure', async () => {
    mockCancelSub.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Cannot cancel' } }),
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    await act(async () => {
      await result.current.handleCancelSubscription();
    });
    expect(showAlert).toHaveBeenCalledWith('Cannot cancel', 'danger');
  });

  it('handleCancelSubscription shows generic error on failure without detail', async () => {
    mockCancelSub.mockReturnValue({
      unwrap: () => Promise.reject({}),
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    await act(async () => {
      await result.current.handleCancelSubscription();
    });
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('cancel'), 'danger');
  });

  it('getToolUsage returns correct values for free user', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    const usage = result.current.getToolUsage('uppercase');
    expect(usage.uses).toBe(2);
    expect(usage.max).toBe(3);
    expect(usage.hasPass).toBe(false);
  });

  it('getToolUsage returns 0 uses for tool with no recorded usage', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    const usage = result.current.getToolUsage('unknown_tool');
    expect(usage.uses).toBe(0);
    expect(usage.max).toBe(3);
  });

  it('refetchStatus calls both refetchStatus and refetchPasses', async () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    await act(async () => {
      result.current.refetchStatus();
    });
    expect(mockRefetchStatus).toHaveBeenCalled();
  });

  // Regression: the status query is skipped while signed out, and RTK Query
  // throws "Cannot refetch a query that has not been started yet" if refetched
  // then (hit on every tool run by anonymous users via TextForm).
  it('refetchStatus no-ops when not authenticated', async () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: false,
      wasAuthenticated: false,
      isLoading: false,
      accessToken: null,
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    await act(async () => {
      result.current.refetchStatus();
    });
    expect(mockRefetchStatus).not.toHaveBeenCalled();
  });
});
