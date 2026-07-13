import { renderHook, act } from '@testing-library/react';

const mockSyncPrefs = vi.fn();

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
  useUpdatePreferencesMutation: () => [mockSyncPrefs],
  useGetPreferencesQuery: vi.fn(() => ({ data: undefined })),
}));

import { useSelector } from 'react-redux';
import { useOidcAuth } from '../auth/useOidcAuth';
import { useGetPreferencesQuery } from '../store/api/userDataApi';
import usePersona from './usePersona';

const mockUseSelector = useSelector as unknown as ReturnType<typeof vi.fn>;
const mockUseOidcAuth = useOidcAuth as unknown as ReturnType<typeof vi.fn>;
const mockGetPreferences = useGetPreferencesQuery as unknown as ReturnType<typeof vi.fn>;

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

describe('usePersona', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    localStorage.clear();
    sessionStorage.clear();
    mockAuth(true);
    // Re-pin the query defaults: clearAllMocks doesn't undo per-test mockReturnValue
    mockGetPreferences.mockReturnValue({ data: undefined });
    mockUseSelector.mockReturnValue('fake-token');
    mockSyncPrefs.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('setPersona updates persona state', () => {
    const { result } = renderHook(() => usePersona());
    act(() => {
      result.current.setPersona('developer');
    });
    expect(result.current.persona).toBe('developer');
    expect(result.current.onboarded).toBe(true);
  });

  it('setPersona syncs to API when authenticated', () => {
    const { result } = renderHook(() => usePersona());
    act(() => {
      result.current.setPersona('writer');
    });
    expect(mockSyncPrefs).toHaveBeenCalledWith({ persona: 'writer' });
  });

  it('setPersona also writes guest sessionStorage when authenticated', () => {
    // The guest copy must survive logout: the hook falls back to guest state
    // then, and without it the welcome picker reappears right after sign-out.
    const { result } = renderHook(() => usePersona());
    act(() => {
      result.current.setPersona('writer');
    });
    expect(sessionStorage.getItem('fmx_guest_persona')).toBe('writer');
  });

  it('setPersona persists to sessionStorage for guests instead of the API', () => {
    mockAuth(false);
    const { result } = renderHook(() => usePersona());
    act(() => {
      result.current.setPersona('developer');
    });
    expect(result.current.persona).toBe('developer');
    expect(sessionStorage.getItem('fmx_guest_persona')).toBe('developer');
    expect(mockSyncPrefs).not.toHaveBeenCalled();
  });

  it('restores guest persona from sessionStorage on init', () => {
    mockAuth(false);
    sessionStorage.setItem('fmx_guest_persona', 'writer');
    const { result } = renderHook(() => usePersona());
    expect(result.current.persona).toBe('writer');
    expect(result.current.onboarded).toBe(true);
  });

  // Persona hydrates from /user/preferences in its own effect, independent of
  // any other per-user query landing first or last (the P2-TC-22 ordering race
  // was fixed by making this hydration self-contained).
  describe('persona hydration', () => {
    it('keeps the tab persona while preferences are still in flight', () => {
      sessionStorage.setItem('fmx_guest_persona', 'writer');
      mockAuth(true, 'user-a');
      mockGetPreferences.mockReturnValue({ data: undefined }); // prefs still in flight
      const { result } = renderHook(() => usePersona());
      expect(result.current.persona).toBe('writer');
      expect(result.current.onboarded).toBe(true);
    });

    it('applies the DB persona when preferences land', () => {
      mockAuth(true, 'user-a');
      mockGetPreferences.mockReturnValue({ data: undefined });
      const { result, rerender } = renderHook(() => usePersona());
      expect(result.current.persona).toBeNull();
      mockGetPreferences.mockReturnValue({ data: { persona: 'student' } });
      rerender();
      expect(result.current.persona).toBe('student');
      // Mirrored for the post-logout guest fallback, tagged with the owner
      expect(sessionStorage.getItem('fmx_guest_persona')).toBe('student');
      expect(sessionStorage.getItem('fmx_guest_persona_owner')).toBe('user-a');
    });

    it('adopts a guest pick into the account when the DB has no persona', () => {
      sessionStorage.setItem('fmx_guest_persona', 'developer');
      sessionStorage.setItem('fmx_guest_persona_owner', 'guest');
      mockAuth(true, 'user-a');
      mockGetPreferences.mockReturnValue({ data: { persona: null } });
      const { result } = renderHook(() => usePersona());
      expect(result.current.persona).toBe('developer');
      expect(mockSyncPrefs).toHaveBeenCalledWith({ persona: 'developer' });
      expect(sessionStorage.getItem('fmx_guest_persona_owner')).toBe('user-a');
    });

    it("drops another account's persona so the new user gets onboarding", () => {
      sessionStorage.setItem('fmx_guest_persona', 'writer');
      sessionStorage.setItem('fmx_guest_persona_owner', 'user-a');
      mockAuth(true, 'user-b');
      mockGetPreferences.mockReturnValue({ data: { persona: null } });
      const { result } = renderHook(() => usePersona());
      expect(result.current.persona).toBeNull();
      expect(result.current.onboarded).toBe(false);
      expect(sessionStorage.getItem('fmx_guest_persona')).toBeNull();
      expect(mockSyncPrefs).not.toHaveBeenCalled();
    });

    it('setPersona tags the tab copy with the signed-in owner', () => {
      mockAuth(true, 'user-a');
      const { result } = renderHook(() => usePersona());
      act(() => {
        result.current.setPersona('social');
      });
      expect(sessionStorage.getItem('fmx_guest_persona')).toBe('social');
      expect(sessionStorage.getItem('fmx_guest_persona_owner')).toBe('user-a');
    });
  });

  it('honors a persona cached in the legacy fmx_gamification localStorage blob on init', () => {
    mockAuth(false);
    localStorage.setItem('fmx_gamification', JSON.stringify({ persona: 'student' }));
    const { result } = renderHook(() => usePersona());
    expect(result.current.persona).toBe('student');
    expect(result.current.onboarded).toBe(true);
  });
});
