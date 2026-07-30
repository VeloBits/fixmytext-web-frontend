import { renderHook, act } from '@testing-library/react';

const mockApiAddFavorite = vi.fn();
const mockApiRemoveFavorite = vi.fn();

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
  useGetFavoritesQuery: vi.fn(() => ({ data: undefined })),
  useAddFavoriteMutation: () => [mockApiAddFavorite],
  useRemoveFavoriteMutation: () => [mockApiRemoveFavorite],
}));

import { useOidcAuth } from '../auth/useOidcAuth';
import { useGetFavoritesQuery } from '../store/api/userDataApi';
import useFavorites from './useFavorites';

const mockUseOidcAuth = useOidcAuth as unknown as ReturnType<typeof vi.fn>;
const mockGetFavorites = useGetFavoritesQuery as unknown as ReturnType<typeof vi.fn>;

function mockAuth(isAuthenticated: boolean) {
  mockUseOidcAuth.mockReturnValue({
    isAuthenticated,
    isLoading: false,
    accessToken: isAuthenticated ? 'fake-token' : null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  });
}

describe('useFavorites', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth(true);
    // Re-pin the query default: clearAllMocks doesn't undo per-test mockReturnValue
    mockGetFavorites.mockReturnValue({ data: undefined });
    mockApiAddFavorite.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    mockApiRemoveFavorite.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('toggleFavorite adds and removes favorites', () => {
    const { result } = renderHook(() => useFavorites());
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
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.toggleFavorite('uppercase');
    });
    expect(mockApiAddFavorite).toHaveBeenCalledWith('uppercase');
    act(() => {
      result.current.toggleFavorite('uppercase');
    });
    expect(mockApiRemoveFavorite).toHaveBeenCalledWith('uppercase');
  });

  it('guest favorites stay in-memory - no API sync when unauthenticated', () => {
    mockAuth(false);
    const { result } = renderHook(() => useFavorites());
    act(() => {
      result.current.toggleFavorite('uppercase');
    });
    expect(result.current.favorites).toContain('uppercase');
    act(() => {
      result.current.toggleFavorite('uppercase');
    });
    expect(mockApiAddFavorite).not.toHaveBeenCalled();
    expect(mockApiRemoveFavorite).not.toHaveBeenCalled();
  });

  it('hydrates favorites from GET /user/favorites', () => {
    mockGetFavorites.mockReturnValue({
      data: { favorites: [{ tool_id: 'uppercase' }, { tool_id: 'translate' }] },
    });
    const { result } = renderHook(() => useFavorites());
    expect(result.current.favorites).toEqual(['uppercase', 'translate']);
  });

  it('skips the favorites query for guests', () => {
    mockAuth(false);
    renderHook(() => useFavorites());
    expect(mockGetFavorites).toHaveBeenCalledWith(undefined, { skip: true });
  });
});
