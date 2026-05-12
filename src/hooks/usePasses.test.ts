import { renderHook, act } from '@testing-library/react';

// Use vi.hoisted to avoid TDZ issues when vi.mock factory is hoisted
const mocks = vi.hoisted(() => ({
  mockCreatePassOrder: vi.fn(),
  mockCreateCreditOrder: vi.fn(),
  mockVerifyPayment: vi.fn(),
  mockSpinWheel: vi.fn(),
  mockRefetch: vi.fn(),
  mockRefetchSpinHistory: vi.fn(),
  mockNavigate: vi.fn(),
  mockExecuteCheckoutFlow: vi.fn(),
}));

let activePassesData = {
  passes: [{ tools_count: -1, tool_ids: ['*'], uses_today: 0, uses_per_day: 10 }],
  credits: [{ amount: 50 }],
  total_credits: 50,
};

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => mocks.mockNavigate,
}));

vi.mock('../utils/region', () => ({
  BROWSER_REGION: 'US',
}));

vi.mock('../store/api/passesApi', () => ({
  useGetActivePassesQuery: () => ({
    data: activePassesData,
    refetch: mocks.mockRefetch,
  }),
  useCreatePassOrderMutation: () => [mocks.mockCreatePassOrder, { isLoading: false }],
  useCreateCreditOrderMutation: () => [mocks.mockCreateCreditOrder, { isLoading: false }],
  useVerifyPaymentMutation: () => [mocks.mockVerifyPayment],
  useSpinWheelMutation: () => [mocks.mockSpinWheel, { isLoading: false }],
}));

vi.mock('../store/api/userDataApi', () => ({
  useGetSpinHistoryQuery: () => ({
    data: { spins: [{ id: 1 }] },
    refetch: mocks.mockRefetchSpinHistory,
  }),
}));

vi.mock('../utils/razorpay', () => ({
  openRazorpayCheckout: vi.fn(),
  executeCheckoutFlow: mocks.mockExecuteCheckoutFlow,
}));

import { useSelector } from 'react-redux';
import usePasses from './usePasses';

describe('usePasses', () => {
  let showAlert;

  beforeEach(() => {
    vi.clearAllMocks();
    showAlert = vi.fn();
    useSelector.mockReturnValue({ accessToken: 'tok' });
    mocks.mockSpinWheel.mockReturnValue({ unwrap: () => Promise.resolve({ prize: 'bonus' }) });
    mocks.mockExecuteCheckoutFlow.mockResolvedValue(undefined);
    activePassesData = {
      passes: [{ tools_count: -1, tool_ids: ['*'], uses_today: 0, uses_per_day: 10 }],
      credits: [{ amount: 50 }],
      total_credits: 50,
    };
  });

  it('returns active passes, credits, and total', () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(result.current.activePasses).toHaveLength(1);
    expect(result.current.activeCredits).toHaveLength(1);
    expect(result.current.totalCredits).toBe(50);
  });

  it('hasPassFor returns true for covered tool (wildcard)', () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(result.current.hasPassFor('any_tool')).toBe(true);
  });

  it('hasPassFor returns false when no passes cover tool', () => {
    activePassesData = {
      passes: [{ tools_count: 1, tool_ids: ['uppercase'], uses_today: 0, uses_per_day: 5 }],
      credits: [],
      total_credits: 0,
    };
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(result.current.hasPassFor('lowercase')).toBe(false);
    expect(result.current.hasPassFor('uppercase')).toBe(true);
  });

  it('hasPassFor returns false when daily uses exhausted', () => {
    activePassesData = {
      passes: [{ tools_count: -1, tool_ids: ['*'], uses_today: 10, uses_per_day: 10 }],
      credits: [],
      total_credits: 0,
    };
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(result.current.hasPassFor('uppercase')).toBe(false);
  });

  it('handleSpin returns result on success', async () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    let spinResult;
    await act(async () => {
      spinResult = await result.current.handleSpin();
    });
    expect(spinResult).toEqual({ prize: 'bonus' });
    expect(mocks.mockRefetchSpinHistory).toHaveBeenCalled();
  });

  it('handleSpin returns error on failure', async () => {
    mocks.mockSpinWheel.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'No spins left' } }),
    });
    const { result } = renderHook(() => usePasses({ showAlert }));
    let spinResult;
    await act(async () => {
      spinResult = await result.current.handleSpin();
    });
    expect(spinResult).toEqual({ error: 'No spins left' });
  });

  it('handleSpin returns generic error when no detail', async () => {
    mocks.mockSpinWheel.mockReturnValue({
      unwrap: () => Promise.reject({}),
    });
    const { result } = renderHook(() => usePasses({ showAlert }));
    let spinResult;
    await act(async () => {
      spinResult = await result.current.handleSpin();
    });
    expect(spinResult).toEqual({ error: 'Spin failed' });
  });

  it('spinHistory returns data from query', () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(result.current.spinHistory).toEqual([{ id: 1 }]);
  });

  it('returns loading states', () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(result.current.passOrderLoading).toBe(false);
    expect(result.current.creditOrderLoading).toBe(false);
    expect(result.current.spinLoading).toBe(false);
  });

  it('returns refetch functions', () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(typeof result.current.refetchPasses).toBe('function');
    expect(typeof result.current.refetchSpinHistory).toBe('function');
  });

  it('handleBuyPass calls executeCheckoutFlow', async () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    await act(async () => {
      await result.current.handleBuyPass('daily_pass', ['uppercase']);
    });
    expect(mocks.mockExecuteCheckoutFlow).toHaveBeenCalled();
  });

  it('handleBuyCredits calls executeCheckoutFlow', async () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    await act(async () => {
      await result.current.handleBuyCredits('pack_10');
    });
    expect(mocks.mockExecuteCheckoutFlow).toHaveBeenCalled();
  });

  it('handles undefined data (unauthenticated)', () => {
    activePassesData = undefined;
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(result.current.activePasses).toEqual([]);
    expect(result.current.activeCredits).toEqual([]);
    expect(result.current.totalCredits).toBe(0);
  });

  it('handleBuyPass passes correct args to executeCheckoutFlow', async () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    await act(async () => {
      await result.current.handleBuyPass('sprint_pass', ['tool_a']);
    });
    const callArg = mocks.mockExecuteCheckoutFlow.mock.calls[0][0];
    expect(callArg).toHaveProperty('createOrder');
    expect(callArg).toHaveProperty('openCheckout');
    expect(callArg).toHaveProperty('verifyPayment');
    expect(callArg.successPath).toContain('purchase=success');
    expect(callArg.failPath).toContain('purchase=verify-failed');
  });

  it('handleBuyCredits passes correct args to executeCheckoutFlow', async () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    await act(async () => {
      await result.current.handleBuyCredits('credits_5');
    });
    const callArg = mocks.mockExecuteCheckoutFlow.mock.calls[0][0];
    expect(callArg).toHaveProperty('createOrder');
    expect(callArg).toHaveProperty('openCheckout');
    expect(callArg).toHaveProperty('verifyPayment');
  });

  it('refetchPasses calls the refetch function', async () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    act(() => {
      result.current.refetchPasses();
    });
    expect(mocks.mockRefetch).toHaveBeenCalled();
  });

  it('refetchSpinHistory calls the refetch function', async () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    act(() => {
      result.current.refetchSpinHistory();
    });
    expect(mocks.mockRefetchSpinHistory).toHaveBeenCalled();
  });

  it('hasPassFor returns false when pass does not cover tool by id', () => {
    activePassesData = {
      passes: [
        { tools_count: 2, tool_ids: ['uppercase', 'lowercase'], uses_today: 0, uses_per_day: 5 },
      ],
      credits: [],
      total_credits: 0,
    };
    const { result } = renderHook(() => usePasses({ showAlert }));
    expect(result.current.hasPassFor('trim_extra')).toBe(false);
    expect(result.current.hasPassFor('uppercase')).toBe(true);
  });

  it('handleSpin calls spinWheel once', async () => {
    const { result } = renderHook(() => usePasses({ showAlert }));
    await act(async () => {
      await result.current.handleSpin();
    });
    expect(mocks.mockSpinWheel).toHaveBeenCalledTimes(1);
  });
});
