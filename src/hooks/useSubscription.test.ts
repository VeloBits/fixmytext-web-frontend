import { renderHook, act } from '@testing-library/react';

const mockCreateProCheckout = vi.fn();
const mockVerifyProPayment = vi.fn();
const mockCancelSub = vi.fn();
const mockRefetchStatus = vi.fn();
const mockNavigate = vi.fn();

// Mutable mock so individual tests can override
const mockSubscriptionQuery = vi.fn(() => ({
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

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../store/api/subscriptionApi', () => ({
  useGetSubscriptionStatusQuery: (...args) => mockSubscriptionQuery(...args),
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
import useSubscription from './useSubscription';
import { executeCheckoutFlow } from '../utils/razorpay';

describe('useSubscription', () => {
  let showAlert;

  beforeEach(() => {
    vi.clearAllMocks();
    showAlert = vi.fn();
    useSelector.mockReturnValue({ accessToken: 'tok' });
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
    expect(result.current.checkToolAccess({ id: 'find_replace', type: 'api' })).toBe(true);
  });

  it('checkToolAccess returns true for drawer tool', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(result.current.checkToolAccess({ id: 'some_drawer', type: 'drawer' })).toBe(true);
  });

  it('checkToolAccess returns true when not authenticated', () => {
    useSelector.mockReturnValue({ accessToken: null });
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(result.current.checkToolAccess({ id: 'uppercase', type: 'api' })).toBe(true);
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
    expect(result.current.checkToolAccess({ id: 'uppercase', type: 'api' })).toBe(true);
  });

  it('checkToolAccess returns true when under free limit', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    // uppercase has 2 uses, limit is 3
    expect(result.current.checkToolAccess({ id: 'uppercase', type: 'api' })).toBe(true);
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
    const tool = { id: 'lowercase', type: 'api' };
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
    expect(result.current.checkToolAccess({ id: 'uppercase', type: 'api' })).toBe(true);
  });

  it('checkToolAccess returns true for null tool', () => {
    const { result } = renderHook(() => useSubscription({ showAlert }));
    expect(result.current.checkToolAccess(null)).toBe(true);
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
      result.current.checkToolAccess({ id: 'test', type: 'api' });
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
    const usage = result.current.getToolUsage({ id: 'uppercase', type: 'api' });
    expect(usage.max).toBe(Infinity);
  });

  it('handles missing status data', () => {
    mockSubscriptionQuery.mockReturnValue({
      data: null,
      refetch: mockRefetchStatus,
    });
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
});
