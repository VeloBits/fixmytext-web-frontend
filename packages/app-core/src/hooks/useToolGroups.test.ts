import { renderHook, act } from '@testing-library/react';

const mockCreateGroup = vi.fn();
const mockRenameGroup = vi.fn();
const mockDeleteGroup = vi.fn();
const mockAddTool = vi.fn();
const mockRemoveTool = vi.fn();

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
  useGetToolGroupsQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useCreateToolGroupMutation: () => [mockCreateGroup],
  useRenameToolGroupMutation: () => [mockRenameGroup],
  useDeleteToolGroupMutation: () => [mockDeleteGroup],
  useAddToolToGroupMutation: () => [mockAddTool],
  useRemoveToolFromGroupMutation: () => [mockRemoveTool],
}));

import { useOidcAuth } from '../auth/useOidcAuth';
import { useGetToolGroupsQuery } from '../store/api/userDataApi';
import useToolGroups, { TOOL_GROUPS_STORAGE_KEYS, MAX_TOOL_GROUPS } from './useToolGroups';

const mockUseOidcAuth = useOidcAuth as unknown as ReturnType<typeof vi.fn>;
const mockGetToolGroups = useGetToolGroupsQuery as unknown as ReturnType<typeof vi.fn>;

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

function serverGroups(...groups: Array<{ id: string; name: string; toolIds: string[] }>) {
  return {
    groups: groups.map((g, i) => ({
      id: g.id,
      name: g.name,
      sort_order: i,
      tools: g.toolIds.map((tool_id, j) => ({ tool_id, sort_order: j })),
      created_at: '2026-07-14T00:00:00Z',
      updated_at: '2026-07-14T00:00:00Z',
    })),
  };
}

function storedGroups(): Array<{ id: string; name: string; toolIds: string[] }> {
  return JSON.parse(localStorage.getItem(TOOL_GROUPS_STORAGE_KEYS.groups) ?? '[]');
}

describe('useToolGroups', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    sessionStorage.clear();
    mockAuth(true);
    // Re-pin the query defaults: clearAllMocks doesn't undo per-test mockReturnValue
    mockGetToolGroups.mockReturnValue({ data: undefined, isLoading: false });
    const unwrapOk = { unwrap: () => Promise.resolve({}) };
    mockCreateGroup.mockReturnValue(unwrapOk);
    mockRenameGroup.mockReturnValue(unwrapOk);
    mockDeleteGroup.mockReturnValue(unwrapOk);
    mockAddTool.mockReturnValue(unwrapOk);
    mockRemoveTool.mockReturnValue(unwrapOk);
  });

  it('createGroup adds an editable group and syncs to the API when authenticated', () => {
    const { result } = renderHook(() => useToolGroups());
    act(() => {
      result.current.createGroup('My kit', ['summarize', 'eli5', 'summarize']);
    });
    expect(result.current.groups).toHaveLength(1);
    expect(result.current.groups[0]!.name).toBe('My kit');
    // duplicate tool ids collapse
    expect(result.current.groups[0]!.toolIds).toEqual(['summarize', 'eli5']);
    expect(mockCreateGroup).toHaveBeenCalledWith({
      name: 'My kit',
      tool_ids: ['summarize', 'eli5'],
    });
  });

  it('createGroup is idempotent by name, mirroring the server', () => {
    const { result } = renderHook(() => useToolGroups());
    act(() => {
      result.current.createGroup('Kit');
      result.current.createGroup('Kit');
    });
    expect(result.current.groups).toHaveLength(1);
    expect(mockCreateGroup).toHaveBeenCalledTimes(1);
  });

  it('createGroup enforces the group cap', () => {
    const { result } = renderHook(() => useToolGroups());
    act(() => {
      for (let i = 0; i < MAX_TOOL_GROUPS + 5; i++) {
        result.current.createGroup(`Group ${i}`);
      }
    });
    expect(result.current.groups).toHaveLength(MAX_TOOL_GROUPS);
  });

  it('guests persist groups to localStorage instead of the API', () => {
    mockAuth(false);
    const { result } = renderHook(() => useToolGroups());
    act(() => {
      result.current.createGroup('Guest kit', ['word_count']);
    });
    expect(result.current.groups).toHaveLength(1);
    expect(storedGroups()[0]!.name).toBe('Guest kit');
    expect(localStorage.getItem(TOOL_GROUPS_STORAGE_KEYS.owner)).toBe('guest');
    expect(mockCreateGroup).not.toHaveBeenCalled();
  });

  it('restores guest groups from localStorage on init', () => {
    mockAuth(false);
    localStorage.setItem(
      TOOL_GROUPS_STORAGE_KEYS.groups,
      JSON.stringify([{ id: 'local-1', name: 'Saved kit', toolIds: ['eli5'] }])
    );
    const { result } = renderHook(() => useToolGroups());
    expect(result.current.groups).toEqual([
      { id: 'local-1', name: 'Saved kit', toolIds: ['eli5'] },
    ]);
  });

  it('rename/delete/add/remove update state, storage, and the API', () => {
    mockAuth(true, 'user-a');
    mockGetToolGroups.mockReturnValue({
      data: serverGroups({ id: 'g1', name: 'Kit', toolIds: ['eli5'] }),
      isLoading: false,
    });
    const { result } = renderHook(() => useToolGroups());
    expect(result.current.groups).toHaveLength(1);

    act(() => result.current.addToolToGroup('g1', 'word_count'));
    expect(result.current.groups[0]!.toolIds).toEqual(['eli5', 'word_count']);
    expect(mockAddTool).toHaveBeenCalledWith({ groupId: 'g1', toolId: 'word_count' });

    act(() => result.current.addToolToGroup('g1', 'word_count'));
    expect(mockAddTool).toHaveBeenCalledTimes(1); // already present → no-op

    act(() => result.current.removeToolFromGroup('g1', 'eli5'));
    expect(result.current.groups[0]!.toolIds).toEqual(['word_count']);
    expect(mockRemoveTool).toHaveBeenCalledWith({ groupId: 'g1', toolId: 'eli5' });

    act(() => result.current.renameGroup('g1', 'Blog kit'));
    expect(result.current.groups[0]!.name).toBe('Blog kit');
    expect(mockRenameGroup).toHaveBeenCalledWith({ id: 'g1', name: 'Blog kit' });
    expect(storedGroups()[0]!.name).toBe('Blog kit');

    act(() => result.current.deleteGroup('g1'));
    expect(result.current.groups).toHaveLength(0);
    expect(mockDeleteGroup).toHaveBeenCalledWith('g1');
  });

  it('never fires API mutations for pre-adoption local- ids', () => {
    mockAuth(true, 'user-a');
    mockGetToolGroups.mockReturnValue({ data: undefined, isLoading: true });
    const { result } = renderHook(() => useToolGroups());
    act(() => {
      result.current.createGroup('Kit', ['eli5']);
    });
    const localId = result.current.groups[0]!.id;
    expect(localId.startsWith('local-')).toBe(true);
    act(() => {
      result.current.renameGroup(localId, 'Kit 2');
      result.current.addToolToGroup(localId, 'word_count');
      result.current.removeToolFromGroup(localId, 'eli5');
      result.current.deleteGroup(localId);
    });
    expect(mockRenameGroup).not.toHaveBeenCalled();
    expect(mockAddTool).not.toHaveBeenCalled();
    expect(mockRemoveTool).not.toHaveBeenCalled();
    expect(mockDeleteGroup).not.toHaveBeenCalled();
    // create itself DOES sync (server assigns the real id via refetch)
    expect(mockCreateGroup).toHaveBeenCalledTimes(1);
  });

  // Hydration is self-contained (keyed on the query data), the pattern
  // usePersona settled on after the P2-TC-22 ordering race.
  describe('hydration and adoption', () => {
    it('keeps local groups while the server list is still in flight', () => {
      localStorage.setItem(
        TOOL_GROUPS_STORAGE_KEYS.groups,
        JSON.stringify([{ id: 'local-1', name: 'Kit', toolIds: [] }])
      );
      mockAuth(true, 'user-a');
      mockGetToolGroups.mockReturnValue({ data: undefined, isLoading: true });
      const { result } = renderHook(() => useToolGroups());
      expect(result.current.groups).toHaveLength(1);
      expect(result.current.ready).toBe(false);
    });

    it('adopts server groups and mirrors them locally with the owner tag', () => {
      mockAuth(true, 'user-a');
      mockGetToolGroups.mockReturnValue({ data: undefined, isLoading: true });
      const { result, rerender } = renderHook(() => useToolGroups());
      expect(result.current.groups).toHaveLength(0);
      mockGetToolGroups.mockReturnValue({
        data: serverGroups({ id: 'g1', name: 'Writing essentials', toolIds: ['fix_grammar'] }),
        isLoading: false,
      });
      rerender();
      expect(result.current.groups).toEqual([
        { id: 'g1', name: 'Writing essentials', toolIds: ['fix_grammar'] },
      ]);
      expect(storedGroups()[0]!.id).toBe('g1');
      expect(localStorage.getItem(TOOL_GROUPS_STORAGE_KEYS.owner)).toBe('user-a');
      expect(result.current.ready).toBe(true);
    });

    it('adopts guest groups into an empty account and POSTs them up once', () => {
      localStorage.setItem(
        TOOL_GROUPS_STORAGE_KEYS.groups,
        JSON.stringify([
          { id: 'local-1', name: 'Guest kit', toolIds: ['eli5'] },
          { id: 'local-2', name: 'Second kit', toolIds: [] },
        ])
      );
      localStorage.setItem(TOOL_GROUPS_STORAGE_KEYS.owner, 'guest');
      mockAuth(true, 'user-a');
      mockGetToolGroups.mockReturnValue({ data: serverGroups(), isLoading: false });
      const { result, rerender } = renderHook(() => useToolGroups());
      expect(result.current.groups).toHaveLength(2);
      expect(mockCreateGroup).toHaveBeenCalledTimes(2);
      expect(mockCreateGroup).toHaveBeenCalledWith({ name: 'Guest kit', tool_ids: ['eli5'] });
      expect(localStorage.getItem(TOOL_GROUPS_STORAGE_KEYS.owner)).toBe('user-a');
      // a refetch with still-empty data must not re-POST (adoption ref guard)
      rerender();
      expect(mockCreateGroup).toHaveBeenCalledTimes(2);
    });

    it("drops another account's groups so the new user starts clean", () => {
      localStorage.setItem(
        TOOL_GROUPS_STORAGE_KEYS.groups,
        JSON.stringify([{ id: 'g9', name: 'A kit', toolIds: [] }])
      );
      localStorage.setItem(TOOL_GROUPS_STORAGE_KEYS.owner, 'user-a');
      mockAuth(true, 'user-b');
      mockGetToolGroups.mockReturnValue({ data: serverGroups(), isLoading: false });
      const { result } = renderHook(() => useToolGroups());
      expect(result.current.groups).toHaveLength(0);
      expect(localStorage.getItem(TOOL_GROUPS_STORAGE_KEYS.groups)).toBeNull();
      expect(mockCreateGroup).not.toHaveBeenCalled();
    });

    it('adopts an owner-untagged (legacy) local copy like a guest one', () => {
      localStorage.setItem(
        TOOL_GROUPS_STORAGE_KEYS.groups,
        JSON.stringify([{ id: 'local-1', name: 'Old kit', toolIds: [] }])
      );
      mockAuth(true, 'user-a');
      mockGetToolGroups.mockReturnValue({ data: serverGroups(), isLoading: false });
      const { result } = renderHook(() => useToolGroups());
      expect(result.current.groups).toHaveLength(1);
      expect(mockCreateGroup).toHaveBeenCalledTimes(1);
    });

    it('tags local writes with the signed-in owner', () => {
      mockAuth(true, 'user-a');
      const { result } = renderHook(() => useToolGroups());
      act(() => {
        result.current.createGroup('Kit');
      });
      expect(localStorage.getItem(TOOL_GROUPS_STORAGE_KEYS.owner)).toBe('user-a');
    });
  });

  it('survives corrupt localStorage JSON', () => {
    mockAuth(false);
    localStorage.setItem(TOOL_GROUPS_STORAGE_KEYS.groups, '{not json');
    const { result } = renderHook(() => useToolGroups());
    expect(result.current.groups).toEqual([]);
  });
});
