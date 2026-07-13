import { renderHook, act } from '@testing-library/react';

const mockSyncToDb = vi.fn();

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));

vi.mock('../auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: true,
    wasAuthenticated: true,
    isLoading: false,
    accessToken: 'fake-token',
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../store/api/userDataApi', () => ({
  useGetGamificationQuery: vi.fn(() => ({ data: undefined })),
  useUpdateGamificationMutation: () => [mockSyncToDb],
  useGetDiscoveredToolsQuery: vi.fn(() => ({ data: undefined })),
  useGetPipelinesQuery: vi.fn(() => ({ data: undefined })),
}));

import { useSelector } from 'react-redux';
import { useOidcAuth } from '../auth/useOidcAuth';
import {
  useGetGamificationQuery,
  useGetDiscoveredToolsQuery,
  useGetPipelinesQuery,
} from '../store/api/userDataApi';
import { isGamificationEnabled } from '../config/features';
import useGamification from './useGamification';

const mockUseSelector = useSelector as unknown as ReturnType<typeof vi.fn>;
const mockUseOidcAuth = useOidcAuth as unknown as ReturnType<typeof vi.fn>;
const mockGetGamification = useGetGamificationQuery as unknown as ReturnType<typeof vi.fn>;
const mockGetDiscovered = useGetDiscoveredToolsQuery as unknown as ReturnType<typeof vi.fn>;
const mockGetPipelines = useGetPipelinesQuery as unknown as ReturnType<typeof vi.fn>;

function mockAuth(isAuthenticated: boolean, sub?: string) {
  mockUseOidcAuth.mockReturnValue({
    isAuthenticated,
    isLoading: false,
    accessToken: isAuthenticated ? 'fake-token' : null,
    oidcUser: isAuthenticated && sub ? { profile: { sub } } : null,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

describe('useGamification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    sessionStorage.clear();
    mockAuth(true);
    // Re-pin the query defaults: clearAllMocks doesn't undo per-test mockReturnValue
    mockGetGamification.mockReturnValue({ data: undefined });
    mockGetDiscovered.mockReturnValue({ data: undefined });
    mockGetPipelines.mockReturnValue({ data: undefined });
    mockUseSelector.mockReturnValue('fake-token');
    mockSyncToDb.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns default state values', () => {
    const { result } = renderHook(() => useGamification());
    expect(result.current.totalOps).toBe(0);
    expect(result.current.xp).toBeGreaterThanOrEqual(0);
    expect(result.current.achievements).toEqual([]);
    expect(result.current.level).toBeDefined();
    expect(result.current.level.level).toBe(1);
  });

  it('recordToolUse increments totalOps and xp', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.recordToolUse('uppercase', 10);
    });
    expect(result.current.totalOps).toBe(1);
    expect(result.current.xp).toBeGreaterThan(0);
    expect(result.current.totalChars).toBe(10);
  });

  it('recordToolUse grants bonus XP for new tool discovery', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.recordToolUse('uppercase', 5);
    });
    const xpAfterFirst = result.current.xp;
    act(() => {
      result.current.recordToolUse('uppercase', 5);
    });
    const xpAfterSecond = result.current.xp;
    // Second use of same tool should give less xp (no discovery bonus)
    expect(xpAfterSecond - xpAfterFirst).toBeLessThan(xpAfterFirst);
  });

  it('recordToolUse tracks discovered tools', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.recordToolUse('uppercase', 0);
    });
    expect(result.current.discoveredTools).toContain('uppercase');
    act(() => {
      result.current.recordToolUse('lowercase', 0);
    });
    expect(result.current.discoveredTools).toContain('lowercase');
  });

  it('dismissAchievement clears the newAchievement', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.dismissAchievement();
    });
    expect(result.current.newAchievement).toBeNull();
  });

  it('computes level from xp', () => {
    const { result } = renderHook(() => useGamification());
    expect(result.current.level.title).toBe('Beginner');
    expect(result.current.xpProgress).toBeGreaterThanOrEqual(0);
  });

  it('computes xpProgress correctly', () => {
    const { result } = renderHook(() => useGamification());
    // At 0 xp, level 1 (xp=0), nextLevel is level 2 (xp=100)
    // progress = ((0-0)/(100-0))*100 = 0
    expect(result.current.xpProgress).toBe(0);
  });

  it('loads state from localStorage on init', () => {
    localStorage.setItem(
      'fmx_gamification',
      JSON.stringify({
        totalOps: 5,
        xp: 50,
        streak: { current: 1, lastDate: new Date().toISOString().slice(0, 10) },
        achievements: ['first_step'],
      })
    );
    const { result } = renderHook(() => useGamification());
    expect(result.current.totalOps).toBe(5);
    expect(result.current.xp).toBe(50);
    expect(result.current.achievements).toContain('first_step');
  });

  it('handles invalid localStorage data gracefully', () => {
    localStorage.setItem('fmx_gamification', 'invalid json');
    expect(() => renderHook(() => useGamification())).not.toThrow();
  });

  it('syncs to DB debounced when authenticated', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.recordToolUse('uppercase', 10);
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(mockSyncToDb).toHaveBeenCalled();
  });

  it('first_step achievement unlocks after first use', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.recordToolUse('uppercase', 10);
    });
    expect(result.current.achievements).toContain('first_step');
  });

  it('streak is managed on mount', () => {
    const { result } = renderHook(() => useGamification());
    expect(result.current.streak).toBeDefined();
    expect(typeof result.current.streak.current).toBe('number');
  });

  it('sessionOps tracks operations in session', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.recordToolUse('uppercase', 0);
    });
    act(() => {
      result.current.recordToolUse('lowercase', 0);
    });
    expect(result.current.sessionOps.length).toBe(2);
  });

  it('cleanup cancels debounce timer on unmount', () => {
    const { unmount } = renderHook(() => useGamification());
    unmount();
    expect(mockSyncToDb).not.toHaveBeenCalled();
  });

  it('achievement evaluator reads the threaded-in favoritesCount (favorite_fan)', () => {
    // favorites moved to useFavorites; AppContext threads the count in.
    const { result } = renderHook(() => useGamification({ favoritesCount: 5 }));
    act(() => {
      result.current.recordToolUse('uppercase', 0);
    });
    expect(result.current.achievements).toContain('favorite_fan');
  });

  it('silently swallows DB sync errors', async () => {
    mockSyncToDb.mockReturnValue({ unwrap: () => Promise.reject(new Error('db error')) });
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.recordToolUse('uppercase', 10);
    });
    // advance timer to fire the debounced sync which rejects
    await act(async () => {
      vi.advanceTimersByTime(600);
      // flush microtasks so the .catch(() => {}) callback runs
      await Promise.resolve();
    });
    expect(mockSyncToDb).toHaveBeenCalled();
  });

  // ── Kill switch (VITE_GAMIFICATION_ENABLED=false) ──
  // A flag-off bundle must issue ZERO requests to /user/gamification (and the
  // companion discovered-tools/pipelines endpoints): every query is skipped,
  // recordToolUse goes inert, and the debounced PUT never fires.
  describe('kill switch (flag off)', () => {
    beforeEach(() => {
      vi.stubEnv('VITE_GAMIFICATION_ENABLED', 'false');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('skips all gamification queries even when authenticated', () => {
      renderHook(() => useGamification());
      expect(mockGetGamification).toHaveBeenCalledWith(undefined, { skip: true });
      expect(mockGetDiscovered).toHaveBeenCalledWith(undefined, { skip: true });
      expect(mockGetPipelines).toHaveBeenCalledWith(undefined, { skip: true });
    });

    it('recordToolUse is a no-op', () => {
      const { result } = renderHook(() => useGamification());
      act(() => {
        result.current.recordToolUse('uppercase', 10);
      });
      expect(result.current.totalOps).toBe(0);
      expect(result.current.totalChars).toBe(0);
      expect(result.current.xp).toBe(0);
      expect(result.current.achievements).toEqual([]);
    });

    it('never schedules the debounced PUT — not even for mount-time state changes', () => {
      const { result } = renderHook(() => useGamification());
      act(() => {
        result.current.recordToolUse('uppercase', 10);
      });
      act(() => {
        vi.advanceTimersByTime(2000);
      });
      expect(mockSyncToDb).not.toHaveBeenCalled();
    });

    it('AppContext-style consumers resolve to null', () => {
      // Mirrors AppProvider's wiring: the hook is still called (rules of
      // hooks) but the exposed context value is null while disabled.
      const { result } = renderHook(() => {
        const value = useGamification();
        return isGamificationEnabled() ? value : null;
      });
      expect(result.current).toBeNull();
    });

    it('re-enabling the flag restores live behavior (call-time evaluation)', () => {
      vi.unstubAllEnvs();
      vi.stubEnv('VITE_GAMIFICATION_ENABLED', 'true');
      const { result } = renderHook(() => useGamification());
      act(() => {
        result.current.recordToolUse('uppercase', 10);
      });
      expect(result.current.totalOps).toBe(1);
      expect(isGamificationEnabled()).toBe(true);
    });
  });
});
