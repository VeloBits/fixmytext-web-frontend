import { renderHook } from '@testing-library/react';
import { useAppContext } from './AppContext';

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

vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => null),
}));

describe('useAppContext', () => {
  it('throws when used outside AppProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => renderHook(() => useAppContext())).toThrow(
      'useAppContext must be used within an AppProvider'
    );
    spy.mockRestore();
  });
});
