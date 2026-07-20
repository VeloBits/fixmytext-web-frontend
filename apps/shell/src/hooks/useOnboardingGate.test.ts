import { renderHook, act } from '@testing-library/react';

const mockUpdateUiSettings = vi.fn();

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
  useGetUiSettingsQuery: vi.fn(() => ({ data: undefined, isError: false })),
  useUpdateUiSettingsMutation: () => [mockUpdateUiSettings],
}));

import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import { useGetUiSettingsQuery } from '@velobits/app-core/store/api/userDataApi';
import type { ToolGroupsContextValue } from '@velobits/app-core/types/context';
import useOnboardingGate from './useOnboardingGate';

const mockUseOidcAuth = useOidcAuth as unknown as ReturnType<typeof vi.fn>;
const mockGetUiSettings = useGetUiSettingsQuery as unknown as ReturnType<typeof vi.fn>;

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

function toolGroups(groupCount = 0, ready = true): ToolGroupsContextValue {
  return {
    groups: Array.from({ length: groupCount }, (_, i) => ({
      id: `g${i}`,
      name: `Group ${i}`,
      toolIds: [],
    })),
    ready,
    createGroup: vi.fn(),
    renameGroup: vi.fn(),
    deleteGroup: vi.fn(),
    addToolToGroup: vi.fn(),
    removeToolFromGroup: vi.fn(),
  };
}

describe('useOnboardingGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    mockAuth(false);
    // Re-pin the query default: clearAllMocks doesn't undo per-test mockReturnValue
    mockGetUiSettings.mockReturnValue({ data: undefined, isError: false });
    mockUpdateUiSettings.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('guest with no flag: unseen and immediately resolved', () => {
    const { result } = renderHook(() => useOnboardingGate(toolGroups()));
    expect(result.current.seen).toBe(false);
    expect(result.current.resolved).toBe(true);
  });

  it('guest markSeen persists once per tab session with the guest owner tag', () => {
    const { result } = renderHook(() => useOnboardingGate(toolGroups()));
    act(() => result.current.markSeen());
    expect(result.current.seen).toBe(true);
    expect(sessionStorage.getItem('fmx_onboard_seen')).toBe('1');
    expect(sessionStorage.getItem('fmx_onboard_seen_owner')).toBe('guest');
    expect(mockUpdateUiSettings).not.toHaveBeenCalled();
  });

  it('guest with an existing tab flag starts seen', () => {
    sessionStorage.setItem('fmx_onboard_seen', '1');
    sessionStorage.setItem('fmx_onboard_seen_owner', 'guest');
    const { result } = renderHook(() => useOnboardingGate(toolGroups()));
    expect(result.current.seen).toBe(true);
  });

  it('having any custom group counts as seen', () => {
    const { result } = renderHook(() => useOnboardingGate(toolGroups(1)));
    expect(result.current.seen).toBe(true);
  });

  it('signed-in: unresolved while ui-settings are in flight', () => {
    mockAuth(true, 'user-a');
    mockGetUiSettings.mockReturnValue({ data: undefined, isError: false });
    const { result } = renderHook(() => useOnboardingGate(toolGroups()));
    expect(result.current.resolved).toBe(false);
  });

  it('signed-in: unresolved while tool groups have not settled', () => {
    mockAuth(true, 'user-a');
    mockGetUiSettings.mockReturnValue({ data: { onboarding_seen: false }, isError: false });
    const { result } = renderHook(() => useOnboardingGate(toolGroups(0, false)));
    expect(result.current.resolved).toBe(false);
  });

  it('signed-in: a failed ui-settings fetch still resolves (tab-flag fallback)', () => {
    mockAuth(true, 'user-a');
    mockGetUiSettings.mockReturnValue({ data: undefined, isError: true });
    const { result } = renderHook(() => useOnboardingGate(toolGroups()));
    expect(result.current.resolved).toBe(true);
    expect(result.current.seen).toBe(false);
  });

  it('applies the DB flag when settings land and mirrors it for post-logout', () => {
    mockAuth(true, 'user-a');
    mockGetUiSettings.mockReturnValue({ data: undefined, isError: false });
    const { result, rerender } = renderHook(() => useOnboardingGate(toolGroups()));
    expect(result.current.seen).toBe(false);
    mockGetUiSettings.mockReturnValue({ data: { onboarding_seen: true }, isError: false });
    rerender();
    expect(result.current.seen).toBe(true);
    expect(sessionStorage.getItem('fmx_onboard_seen')).toBe('1');
    expect(sessionStorage.getItem('fmx_onboard_seen_owner')).toBe('user-a');
  });

  it('adopts a guest tab flag into the account and syncs it up once', () => {
    sessionStorage.setItem('fmx_onboard_seen', '1');
    sessionStorage.setItem('fmx_onboard_seen_owner', 'guest');
    mockAuth(true, 'user-a');
    mockGetUiSettings.mockReturnValue({ data: { onboarding_seen: false }, isError: false });
    const { result, rerender } = renderHook(() => useOnboardingGate(toolGroups()));
    expect(result.current.seen).toBe(true);
    expect(mockUpdateUiSettings).toHaveBeenCalledWith({ onboarding_seen: true });
    expect(sessionStorage.getItem('fmx_onboard_seen_owner')).toBe('user-a');
    // refetch with unchanged data must not re-PUT (adoption ref guard)
    rerender();
    expect(mockUpdateUiSettings).toHaveBeenCalledTimes(1);
  });

  it("drops another account's tab flag so the new user gets onboarding", () => {
    sessionStorage.setItem('fmx_onboard_seen', '1');
    sessionStorage.setItem('fmx_onboard_seen_owner', 'user-a');
    mockAuth(true, 'user-b');
    mockGetUiSettings.mockReturnValue({ data: { onboarding_seen: false }, isError: false });
    const { result } = renderHook(() => useOnboardingGate(toolGroups()));
    expect(result.current.seen).toBe(false);
    expect(sessionStorage.getItem('fmx_onboard_seen')).toBeNull();
    expect(mockUpdateUiSettings).not.toHaveBeenCalled();
  });

  it('signed-in markSeen persists to the server and tags the tab flag', () => {
    mockAuth(true, 'user-a');
    mockGetUiSettings.mockReturnValue({ data: { onboarding_seen: false }, isError: false });
    const { result } = renderHook(() => useOnboardingGate(toolGroups()));
    act(() => result.current.markSeen());
    expect(result.current.seen).toBe(true);
    expect(mockUpdateUiSettings).toHaveBeenCalledWith({ onboarding_seen: true });
    expect(sessionStorage.getItem('fmx_onboard_seen_owner')).toBe('user-a');
  });
});
