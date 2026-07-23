import { renderHook, act } from '@testing-library/react';

const mockUpdateUiSettings = vi.fn();

vi.mock('../auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('../store/api/userDataApi', () => ({
  useGetUiSettingsQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useUpdateUiSettingsMutation: () => [mockUpdateUiSettings],
}));

import { useOidcAuth } from '../auth/useOidcAuth';
import { useGetUiSettingsQuery } from '../store/api/userDataApi';
import { DEFAULT_SIDEBAR_CHIPS } from '../constants/tools';
import type { SidebarChip } from '../types/tools';
import useSidebarChips, { SIDEBAR_CHIPS_STORAGE_KEYS } from './useSidebarChips';

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

const groupsReady = (groups: Array<{ id: string; name: string; toolIds: string[] }> = []) => ({
  groups,
  ready: true,
});

function storedChips(): SidebarChip[] | null {
  const raw = localStorage.getItem(SIDEBAR_CHIPS_STORAGE_KEYS.chips);
  return raw ? JSON.parse(raw) : null;
}

describe('useSidebarChips', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockAuth(false);
    mockGetUiSettings.mockReturnValue({ data: undefined, isLoading: false });
    mockUpdateUiSettings.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  });

  it('defaults to the four smart views, uncustomized', () => {
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    expect(result.current.chips).toEqual(DEFAULT_SIDEBAR_CHIPS);
    expect(result.current.isCustomized).toBe(false);
    expect(result.current.ready).toBe(true);
  });

  it('addChip customizes the row and persists for guests', () => {
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    act(() => result.current.addChip({ type: 'group', id: 'hashing' }));
    expect(result.current.chips).toHaveLength(5);
    expect(result.current.isCustomized).toBe(true);
    expect(storedChips()).toHaveLength(5);
    expect(localStorage.getItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner)).toBe('guest');
    expect(mockUpdateUiSettings).not.toHaveBeenCalled();
  });

  it('addChip is idempotent and ignores invalid chips', () => {
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    act(() => result.current.addChip({ type: 'group', id: 'hashing' }));
    act(() => result.current.addChip({ type: 'group', id: 'hashing' }));
    act(() => result.current.addChip({ type: 'view', id: 'bogus' }));
    expect(result.current.chips).toHaveLength(5);
  });

  it('removeChip refuses to remove view:all', () => {
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    act(() => result.current.removeChip({ type: 'view', id: 'all' }));
    expect(result.current.chips).toEqual(DEFAULT_SIDEBAR_CHIPS);
    expect(result.current.isCustomized).toBe(false);
  });

  it('removeChip drops other chips', () => {
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    act(() => result.current.removeChip({ type: 'view', id: 'suggested' }));
    expect(result.current.chips.map((c) => c.id)).toEqual(['all', 'pinned', 'recent']);
  });

  it('moveChip reorders', () => {
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    act(() => result.current.moveChip(3, 1));
    expect(result.current.chips.map((c) => c.id)).toEqual([
      'all',
      'suggested',
      'pinned',
      'recent',
    ]);
  });

  it('setChips sanitizes: dedupes and forces view:all present', () => {
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    act(() =>
      result.current.setChips([
        { type: 'group', id: 'hashing' },
        { type: 'group', id: 'hashing' },
        { type: 'view', id: 'recent' },
      ])
    );
    expect(result.current.chips).toEqual([
      { type: 'view', id: 'all' },
      { type: 'group', id: 'hashing' },
      { type: 'view', id: 'recent' },
    ]);
  });

  it('resetChips clears the customization and storage', () => {
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    act(() => result.current.addChip({ type: 'group', id: 'hashing' }));
    act(() => result.current.resetChips());
    expect(result.current.chips).toEqual(DEFAULT_SIDEBAR_CHIPS);
    expect(result.current.isCustomized).toBe(false);
    expect(storedChips()).toBeNull();
  });

  it('signed-in edits PUT the whole list to ui-settings', () => {
    mockAuth(true, 'user-sub-1');
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    act(() => result.current.addChip({ type: 'group', id: 'hashing' }));
    expect(mockUpdateUiSettings).toHaveBeenCalledWith({
      sidebar_chips: [...DEFAULT_SIDEBAR_CHIPS, { type: 'group', id: 'hashing' }],
    });
    expect(localStorage.getItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner)).toBe('user-sub-1');
  });

  it('hydrates from a non-empty server config (server wins)', () => {
    mockAuth(true, 'user-sub-1');
    const server = [
      { type: 'view', id: 'all' },
      { type: 'group', id: 'ciphers' },
    ];
    mockGetUiSettings.mockReturnValue({ data: { sidebar_chips: server }, isLoading: false });
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    expect(result.current.chips).toEqual(server);
    expect(result.current.isCustomized).toBe(true);
    expect(storedChips()).toEqual(server);
  });

  it('adopts a guest row into an uncustomized account', () => {
    localStorage.setItem(
      SIDEBAR_CHIPS_STORAGE_KEYS.chips,
      JSON.stringify([...DEFAULT_SIDEBAR_CHIPS, { type: 'group', id: 'hashing' }])
    );
    localStorage.setItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner, 'guest');
    mockAuth(true, 'user-sub-1');
    mockGetUiSettings.mockReturnValue({ data: { sidebar_chips: [] }, isLoading: false });
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    expect(result.current.chips.map((c) => c.id)).toContain('hashing');
    expect(mockUpdateUiSettings).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner)).toBe('user-sub-1');
  });

  it("drops another user's local row instead of adopting it", () => {
    localStorage.setItem(
      SIDEBAR_CHIPS_STORAGE_KEYS.chips,
      JSON.stringify([...DEFAULT_SIDEBAR_CHIPS, { type: 'group', id: 'hashing' }])
    );
    localStorage.setItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner, 'someone-else');
    mockAuth(true, 'user-sub-1');
    mockGetUiSettings.mockReturnValue({ data: { sidebar_chips: [] }, isLoading: false });
    const { result } = renderHook(() => useSidebarChips(groupsReady()));
    expect(result.current.chips).toEqual(DEFAULT_SIDEBAR_CHIPS);
    expect(result.current.isCustomized).toBe(false);
    expect(mockUpdateUiSettings).not.toHaveBeenCalled();
    expect(storedChips()).toBeNull();
  });

  it('prunes a custom_group chip when its group disappears', () => {
    localStorage.setItem(
      SIDEBAR_CHIPS_STORAGE_KEYS.chips,
      JSON.stringify([...DEFAULT_SIDEBAR_CHIPS, { type: 'custom_group', id: 'gone' }])
    );
    localStorage.setItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner, 'guest');
    const { result } = renderHook(() => useSidebarChips(groupsReady([])));
    expect(result.current.chips).toEqual(DEFAULT_SIDEBAR_CHIPS);
  });

  it('keeps a custom_group chip whose group exists', () => {
    localStorage.setItem(
      SIDEBAR_CHIPS_STORAGE_KEYS.chips,
      JSON.stringify([...DEFAULT_SIDEBAR_CHIPS, { type: 'custom_group', id: 'g1' }])
    );
    localStorage.setItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner, 'guest');
    const { result } = renderHook(() =>
      useSidebarChips(groupsReady([{ id: 'g1', name: 'My Kit', toolIds: [] }]))
    );
    expect(result.current.chips.map((c) => c.id)).toContain('g1');
  });

  it('does not prune while groups are not ready', () => {
    localStorage.setItem(
      SIDEBAR_CHIPS_STORAGE_KEYS.chips,
      JSON.stringify([...DEFAULT_SIDEBAR_CHIPS, { type: 'custom_group', id: 'g1' }])
    );
    localStorage.setItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner, 'guest');
    const { result } = renderHook(() => useSidebarChips({ groups: [], ready: false }));
    expect(result.current.chips.map((c) => c.id)).toContain('g1');
  });

  it('remaps custom_group chip ids on the tool-groups adoption event', () => {
    localStorage.setItem(
      SIDEBAR_CHIPS_STORAGE_KEYS.chips,
      JSON.stringify([...DEFAULT_SIDEBAR_CHIPS, { type: 'custom_group', id: 'local-abc' }])
    );
    localStorage.setItem(SIDEBAR_CHIPS_STORAGE_KEYS.owner, 'guest');
    // Pre-adoption: the groups list still carries the local id (matches the chip)
    const { result, rerender } = renderHook(
      ({
        groups,
      }: {
        groups: { groups: { id: string; name: string; toolIds: string[] }[]; ready: boolean };
      }) => useSidebarChips(groups),
      {
        initialProps: {
          groups: groupsReady([{ id: 'local-abc', name: 'My Kit', toolIds: [] }]),
        },
      }
    );
    expect(result.current.chips.map((c) => c.id)).toContain('local-abc');
    // Adoption: useToolGroups dispatches the id map, then swaps the group list
    // to server ids — the chip must follow instead of being pruned.
    act(() => {
      window.dispatchEvent(
        new CustomEvent('fmx:tool-groups-adopted', {
          detail: { idMap: { 'local-abc': 'server-1' } },
        })
      );
    });
    rerender({ groups: groupsReady([{ id: 'server-1', name: 'My Kit', toolIds: [] }]) });
    expect(result.current.chips.map((c) => c.id)).toContain('server-1');
    expect(result.current.chips.map((c) => c.id)).not.toContain('local-abc');
  });
});
