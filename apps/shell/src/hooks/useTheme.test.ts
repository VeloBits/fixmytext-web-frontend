import { renderHook, act } from '@testing-library/react';
import { useTheme } from './useTheme';

const mockUpdatePrefs = vi.fn(() => ({ unwrap: () => Promise.resolve() }));

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { accessToken: null } })),
}));

vi.mock('@velobits/app-core/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@velobits/app-core/store/api/userDataApi', () => ({
  useGetPreferencesQuery: vi.fn(() => ({ data: undefined })),
  useUpdatePreferencesMutation: () => [mockUpdatePrefs],
}));

import { useSelector } from 'react-redux';
import { useGetPreferencesQuery } from '@velobits/app-core/store/api/userDataApi';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';

// vi.mock returns loose types; cast to access mock methods
const mockUseSelector = vi.mocked(useSelector);
const mockGetPrefs = vi.mocked(useGetPreferencesQuery);
const mockUseOidcAuth = vi.mocked(useOidcAuth);

describe('useTheme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    document.body.classList.remove('dark');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSelector.mockImplementation((fn: any) => fn({ auth: { accessToken: null } }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetPrefs.mockReturnValue({ data: undefined } as any);
    // Default: not authenticated (must re-set after vi.clearAllMocks())
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('defaults to dark mode', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('dark');
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('reads saved mode from localStorage', () => {
    localStorage.setItem('fmx_theme_mode', 'light');
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('light');
  });

  it('setMode updates mode and localStorage', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode('light');
    });
    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('fmx_theme_mode')).toBe('light');
    expect(document.body.classList.contains('dark')).toBe(false);
  });

  it('setMode to dark adds class', () => {
    localStorage.setItem('fmx_theme_mode', 'light');
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode('dark');
    });
    expect(document.body.classList.contains('dark')).toBe(true);
  });

  it('syncs to backend when authenticated', () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode('light');
    });
    expect(mockUpdatePrefs).toHaveBeenCalledWith({ theme: 'light' });
  });

  it('does not sync to backend when unauthenticated', () => {
    const { result } = renderHook(() => useTheme());
    act(() => {
      result.current.setMode('light');
    });
    expect(mockUpdatePrefs).not.toHaveBeenCalled();
  });

  it('hydrates from DB preferences when authenticated', () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockGetPrefs.mockReturnValue({ data: { theme: 'light' } } as any);
    const { result } = renderHook(() => useTheme());
    expect(result.current.mode).toBe('light');
    expect(localStorage.getItem('fmx_theme_mode')).toBe('light');
  });
});
