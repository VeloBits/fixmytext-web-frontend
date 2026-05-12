import { renderHook } from '@testing-library/react';
import { useAuth } from './useAuth';

const mockRefresh = vi.fn();
vi.mock('react-redux', () => ({
  useSelector: vi.fn(),
}));
vi.mock('../store/api/authApi', () => ({
  useRefreshMutation: () => [mockRefresh],
  useGetMeQuery: vi.fn(),
}));

import { useSelector } from 'react-redux';
import { useGetMeQuery } from '../store/api/authApi';

// vi.mock replaces these with Mock instances — cast so TS knows
const mockUseSelector = useSelector as unknown as ReturnType<typeof vi.fn>;
const mockUseGetMeQuery = useGetMeQuery as unknown as ReturnType<typeof vi.fn>;

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRefresh.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('returns user and isAuthenticated=true when token exists', () => {
    mockUseSelector.mockReturnValue({ accessToken: 'tok', user: { name: 'Test' } });
    const { result } = renderHook(() => useAuth());
    expect(result.current.user).toEqual({ name: 'Test' });
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('returns isAuthenticated=false when no token', () => {
    mockUseSelector.mockReturnValue({ accessToken: null, user: null });
    const { result } = renderHook(() => useAuth());
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('calls refresh on mount when no token', () => {
    mockUseSelector.mockReturnValue({ accessToken: null, user: null });
    renderHook(() => useAuth());
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('does not call refresh when token exists', () => {
    mockUseSelector.mockReturnValue({ accessToken: 'tok', user: null });
    renderHook(() => useAuth());
    expect(mockRefresh).not.toHaveBeenCalled();
  });

  it('calls refresh only once even on re-render', () => {
    mockUseSelector.mockReturnValue({ accessToken: null, user: null });
    const { rerender } = renderHook(() => useAuth());
    rerender();
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('skips useGetMeQuery when not authenticated', () => {
    mockUseSelector.mockReturnValue({ accessToken: null, user: null });
    renderHook(() => useAuth());
    expect(mockUseGetMeQuery).toHaveBeenCalledWith(undefined, { skip: true });
  });

  it('does not skip useGetMeQuery when authenticated', () => {
    mockUseSelector.mockReturnValue({ accessToken: 'tok', user: null });
    renderHook(() => useAuth());
    expect(mockUseGetMeQuery).toHaveBeenCalledWith(undefined, { skip: false });
  });

  it('handles refresh failure silently', () => {
    mockRefresh.mockReturnValue({ unwrap: () => Promise.reject(new Error('fail')) });
    mockUseSelector.mockReturnValue({ accessToken: null, user: null });
    expect(() => renderHook(() => useAuth())).not.toThrow();
  });
});
