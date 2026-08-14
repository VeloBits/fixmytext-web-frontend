import { renderHook, act } from '@testing-library/react';
import useAutoRun, { AUTO_RUN_KEY } from './useAutoRun';

const mockUpdatePrefs = vi.fn(() => ({ unwrap: () => Promise.resolve() }));

vi.mock('../auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    wasAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../store/api/userDataApi', () => ({
  useGetPreferencesQuery: vi.fn(() => ({ data: undefined })),
  useUpdatePreferencesMutation: () => [mockUpdatePrefs],
}));

import { useGetPreferencesQuery } from '../store/api/userDataApi';
import { useOidcAuth } from '../auth/useOidcAuth';

const mockGetPrefs = vi.mocked(useGetPreferencesQuery);
const mockUseOidcAuth = vi.mocked(useOidcAuth);

const signedOut = {
  isAuthenticated: false,
  wasAuthenticated: false,
  isLoading: false,
  accessToken: null,
  oidcUser: null,
  login: vi.fn(),
  logout: vi.fn(),
};

describe('useAutoRun', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetPrefs.mockReturnValue({ data: undefined } as any);
    // Must be re-set after vi.clearAllMocks()
    mockUseOidcAuth.mockReturnValue(signedOut);
  });

  it('defaults to manual execution (auto-run off)', () => {
    const { result } = renderHook(() => useAutoRun());
    expect(result.current.autoRun).toBe(false);
  });

  it('restores the opt-in from localStorage on first render', () => {
    localStorage.setItem(AUTO_RUN_KEY, 'true');
    const { result } = renderHook(() => useAutoRun());
    // Live on the first render, before any query resolves - a refresh must not
    // briefly fall back to the other mode.
    expect(result.current.autoRun).toBe(true);
  });

  it('treats any non-"true" cached value as off', () => {
    localStorage.setItem(AUTO_RUN_KEY, 'garbage');
    const { result } = renderHook(() => useAutoRun());
    expect(result.current.autoRun).toBe(false);
  });

  it('persists to localStorage when toggled', () => {
    const { result } = renderHook(() => useAutoRun());
    act(() => result.current.setAutoRun(true));
    expect(result.current.autoRun).toBe(true);
    expect(localStorage.getItem(AUTO_RUN_KEY)).toBe('true');

    act(() => result.current.setAutoRun(false));
    expect(result.current.autoRun).toBe(false);
    expect(localStorage.getItem(AUTO_RUN_KEY)).toBe('false');
  });

  it('does not write to the DB for guests', () => {
    const { result } = renderHook(() => useAutoRun());
    act(() => result.current.setAutoRun(true));
    expect(mockUpdatePrefs).not.toHaveBeenCalled();
  });

  it('writes to the DB when authenticated', () => {
    mockUseOidcAuth.mockReturnValue({ ...signedOut, isAuthenticated: true });
    const { result } = renderHook(() => useAutoRun());
    act(() => result.current.setAutoRun(true));
    expect(mockUpdatePrefs).toHaveBeenCalledWith({ auto_run: true });
    expect(localStorage.getItem(AUTO_RUN_KEY)).toBe('true');
  });

  it('hydrates from the DB, which outranks a stale local cache', () => {
    localStorage.setItem(AUTO_RUN_KEY, 'false');
    mockUseOidcAuth.mockReturnValue({ ...signedOut, isAuthenticated: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetPrefs.mockReturnValue({ data: { auto_run: true } } as any);
    const { result } = renderHook(() => useAutoRun());
    expect(result.current.autoRun).toBe(true);
    expect(localStorage.getItem(AUTO_RUN_KEY)).toBe('true');
  });

  it('hydrates auto-run off from the DB over a stale enabled cache', () => {
    localStorage.setItem(AUTO_RUN_KEY, 'true');
    mockUseOidcAuth.mockReturnValue({ ...signedOut, isAuthenticated: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetPrefs.mockReturnValue({ data: { auto_run: false } } as any);
    const { result } = renderHook(() => useAutoRun());
    expect(result.current.autoRun).toBe(false);
    expect(localStorage.getItem(AUTO_RUN_KEY)).toBe('false');
  });

  it('does not let a later DB response clobber a fresh local toggle', () => {
    mockUseOidcAuth.mockReturnValue({ ...signedOut, isAuthenticated: true });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetPrefs.mockReturnValue({ data: { auto_run: false } } as any);
    const { result, rerender } = renderHook(() => useAutoRun());
    expect(result.current.autoRun).toBe(false);

    act(() => result.current.setAutoRun(true));
    // Same query data arriving again must not undo the user's choice: hydration
    // is one-shot per session.
    rerender();
    expect(result.current.autoRun).toBe(true);
  });

  it('survives localStorage being unavailable', () => {
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    try {
      const { result } = renderHook(() => useAutoRun());
      expect(result.current.autoRun).toBe(false);
      act(() => result.current.setAutoRun(true));
      expect(result.current.autoRun).toBe(true);
    } finally {
      getItem.mockRestore();
      setItem.mockRestore();
    }
  });
});
