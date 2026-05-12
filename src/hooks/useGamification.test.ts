import { renderHook, act } from '@testing-library/react';

const mockSyncToDb = vi.fn();
const mockSyncPrefs = vi.fn();
const mockApiAddFavorite = vi.fn();
const mockApiRemoveFavorite = vi.fn();

vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));

vi.mock('../store/api/userDataApi', () => ({
  useGetGamificationQuery: vi.fn(() => ({ data: undefined })),
  useUpdateGamificationMutation: () => [mockSyncToDb],
  useUpdatePreferencesMutation: () => [mockSyncPrefs],
  useGetPreferencesQuery: vi.fn(() => ({ data: undefined })),
  useGetFavoritesQuery: vi.fn(() => ({ data: undefined })),
  useAddFavoriteMutation: () => [mockApiAddFavorite],
  useRemoveFavoriteMutation: () => [mockApiRemoveFavorite],
  useGetDiscoveredToolsQuery: vi.fn(() => ({ data: undefined })),
  useGetPipelinesQuery: vi.fn(() => ({ data: undefined })),
}));

import { useSelector } from 'react-redux';
import useGamification from './useGamification';

describe('useGamification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    useSelector.mockReturnValue('fake-token');
    mockSyncToDb.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockSyncPrefs.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockApiAddFavorite.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockApiRemoveFavorite.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns default state values', () => {
    const { result } = renderHook(() => useGamification());
    expect(result.current.totalOps).toBe(0);
    expect(result.current.xp).toBeGreaterThanOrEqual(0);
    expect(result.current.achievements).toEqual([]);
    expect(result.current.favorites).toEqual([]);
    expect(result.current.onboarded).toBe(false);
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

  it('toggleFavorite adds and removes favorites', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.toggleFavorite('uppercase');
    });
    expect(result.current.favorites).toContain('uppercase');
    act(() => {
      result.current.toggleFavorite('uppercase');
    });
    expect(result.current.favorites).not.toContain('uppercase');
  });

  it('toggleFavorite calls API when authenticated', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.toggleFavorite('uppercase');
    });
    expect(mockApiAddFavorite).toHaveBeenCalledWith('uppercase');
    act(() => {
      result.current.toggleFavorite('uppercase');
    });
    expect(mockApiRemoveFavorite).toHaveBeenCalledWith('uppercase');
  });

  it('setPersona updates persona state', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.setPersona('developer');
    });
    expect(result.current.persona).toBe('developer');
    expect(result.current.onboarded).toBe(true);
  });

  it('setPersona syncs to API when authenticated', () => {
    const { result } = renderHook(() => useGamification());
    act(() => {
      result.current.setPersona('writer');
    });
    expect(mockSyncPrefs).toHaveBeenCalledWith({ persona: 'writer' });
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
});
