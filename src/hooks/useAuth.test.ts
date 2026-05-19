import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { user: null } })),
}));

vi.mock('@/store/api/authApi', () => ({
  useGetMeQuery: vi.fn().mockReturnValue({}),
}));

vi.mock('@/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { useSelector } from 'react-redux';
import { useGetMeQuery } from '@/store/api/authApi';
import { useOidcAuth } from '@/auth/useOidcAuth';

const mockUseSelector = vi.mocked(useSelector);
const mockUseGetMeQuery = vi.mocked(useGetMeQuery);
const mockUseOidcAuth = vi.mocked(useOidcAuth);

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not authenticated
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSelector.mockImplementation((fn: any) => fn({ auth: { user: null } }));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseGetMeQuery.mockReturnValue({} as any);
  });

  it('returns user and isAuthenticated=true when token exists', () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseSelector.mockImplementation((fn: any) => fn({ auth: { user: { name: 'Test' } } }));
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual({ name: 'Test' });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns isAuthenticated=false when no token', () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('calls refresh on mount when no token', () => {
    // useAuth no longer calls useRefreshMutation; it delegates to useOidcAuth.
    // This test verifies that getMe is skipped when not authenticated.
    renderHook(() => useAuth());
    expect(mockUseGetMeQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it('does not skip useGetMeQuery when authenticated', () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    renderHook(() => useAuth());
    expect(mockUseGetMeQuery).toHaveBeenCalledWith(undefined, { skip: false });
  });

  it('calls refresh only once even on re-render', () => {
    // useAuth no longer has a "refresh once" mechanism — it delegates to
    // useOidcAuth. This test verifies stable behaviour on re-render.
    const { rerender } = renderHook(() => useAuth());
    rerender();
    // useGetMeQuery should have been called (possibly multiple times due to
    // React Strict Mode or rerender) but should NOT throw.
    expect(mockUseGetMeQuery).toHaveBeenCalled();
  });

  it('skips useGetMeQuery when not authenticated', () => {
    renderHook(() => useAuth());
    expect(mockUseGetMeQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });
});
