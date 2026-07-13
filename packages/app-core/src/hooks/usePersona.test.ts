import { renderHook, act } from '@testing-library/react';

const mockSyncToDb = vi.fn();
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
  useGetGamificationQuery: vi.fn(() => ({ data: undefined })),
  useUpdateGamificationMutation: () => [mockSyncToDb],
  useUpdatePreferencesMutation: () => [mockSyncPrefs],
  useGetPreferencesQuery: vi.fn(() => ({ data: undefined })),
  useGetDiscoveredToolsQuery: vi.fn(() => ({ data: undefined })),
  useGetPipelinesQuery: vi.fn(() => ({ data: undefined })),
}));

import { useSelector } from 'react-redux';
import { useOidcAuth } from '../auth/useOidcAuth';
import { useGetGamificationQuery, useGetPreferencesQuery } from '../store/api/userDataApi';
import usePersona from './usePersona';
import useGamification from './useGamification';

const mockUseSelector = useSelector as unknown as ReturnType<typeof vi.fn>;
const mockUseOidcAuth = useOidcAuth as unknown as ReturnType<typeof vi.fn>;
const mockGetGamification = useGetGamificationQuery as unknown as ReturnType<typeof vi.fn>;
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

// The persona/gamification ordering race (P2-TC-22) is cross-hook since the
// Phase A split: gamification hydration lives in useGamification while persona
// hydration lives here. Render both hooks together — exactly like AppContext
// does — so the original race assertions keep their meaning. usePersona's keys
// are spread last; the hooks share no key names.
function renderPersonaWithGamification() {
  return renderHook(() => {
    const gamification = useGamification();
    const persona = usePersona();
    return { ...gamification, ...persona };
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
    mockGetGamification.mockReturnValue({ data: undefined });
    mockGetPreferences.mockReturnValue({ data: undefined });
    mockUseSelector.mockReturnValue('fake-token');
    mockSyncToDb.mockReturnValue({ unwrap: () => Promise.resolve({}) });
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

  // The flat gamification response carries no persona; persona hydrates from
  // /user/preferences in its own effect. These pin the ordering race where the
  // gamification response landing first wiped the persona and re-showed the
  // blocking welcome picker for already-onboarded users.
  describe('persona hydration', () => {
    const DB_GAMIFICATION = { total_ops: 3, xp: 30 };

    it('keeps the tab persona when gamification hydrates before preferences', () => {
      sessionStorage.setItem('fmx_guest_persona', 'writer');
      mockAuth(true, 'user-a');
      mockGetGamification.mockReturnValue({ data: DB_GAMIFICATION });
      mockGetPreferences.mockReturnValue({ data: undefined }); // prefs still in flight
      const { result } = renderPersonaWithGamification();
      expect(result.current.totalOps).toBe(3); // gamification did hydrate
      expect(result.current.persona).toBe('writer'); // …without wiping persona
      expect(result.current.onboarded).toBe(true);
    });

    it('applies the DB persona when preferences land after gamification', () => {
      mockAuth(true, 'user-a');
      mockGetGamification.mockReturnValue({ data: DB_GAMIFICATION });
      mockGetPreferences.mockReturnValue({ data: undefined });
      const { result, rerender } = renderPersonaWithGamification();
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
      const { result } = renderPersonaWithGamification();
      expect(result.current.persona).toBe('developer');
      expect(mockSyncPrefs).toHaveBeenCalledWith({ persona: 'developer' });
      expect(sessionStorage.getItem('fmx_guest_persona_owner')).toBe('user-a');
    });

    it("drops another account's persona so the new user gets onboarding", () => {
      sessionStorage.setItem('fmx_guest_persona', 'writer');
      sessionStorage.setItem('fmx_guest_persona_owner', 'user-a');
      mockAuth(true, 'user-b');
      mockGetPreferences.mockReturnValue({ data: { persona: null } });
      const { result } = renderPersonaWithGamification();
      expect(result.current.persona).toBeNull();
      expect(result.current.onboarded).toBe(false);
      expect(sessionStorage.getItem('fmx_guest_persona')).toBeNull();
      expect(mockSyncPrefs).not.toHaveBeenCalled();
    });

    it('setPersona tags the tab copy with the signed-in owner', () => {
      mockAuth(true, 'user-a');
      const { result } = renderPersonaWithGamification();
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
