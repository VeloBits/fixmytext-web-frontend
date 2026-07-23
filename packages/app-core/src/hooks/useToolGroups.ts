import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useGetToolGroupsQuery,
  useCreateToolGroupMutation,
  useRenameToolGroupMutation,
  useDeleteToolGroupMutation,
  useAddToolToGroupMutation,
  useRemoveToolFromGroupMutation,
  useSetToolGroupToolsMutation,
  useReorderToolGroupsMutation,
} from '../store/api/userDataApi';
import { useOidcAuth } from '../auth/useOidcAuth';
import type { ToolGroupsContextValue, ToolGroupView } from '../types/context';

// Mirrors of the server-side caps (account-svc user_data.py) so guests get the
// same limits and signed-in optimistic updates can't outrun a 400.
export const MAX_TOOL_GROUPS = 20;
export const MAX_TOOLS_PER_GROUP = 50;

// Guest groups live in localStorage (not sessionStorage like the old guest
// persona): they are real user data that must survive tab closes, not a
// once-per-tab prompt.
const GUEST_GROUPS_KEY = 'fmx_guest_groups';
// Who the local copy belongs to: 'guest' (edited while signed out) or a
// Keycloak sub. Without this, user B logging in after user A on the same
// browser would inherit (and sync up) A's groups.
const GUEST_GROUPS_OWNER_KEY = 'fmx_guest_groups_owner';

// Ids created before server adoption; never sent to the API.
const LOCAL_ID_PREFIX = 'local-';

function newLocalId(): string {
  return `${LOCAL_ID_PREFIX}${crypto.randomUUID()}`;
}

function isLocalId(id: string): boolean {
  return id.startsWith(LOCAL_ID_PREFIX);
}

function loadGuestGroups(): ToolGroupView[] {
  try {
    const raw = localStorage.getItem(GUEST_GROUPS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (g): g is ToolGroupView =>
        !!g &&
        typeof (g as ToolGroupView).id === 'string' &&
        typeof (g as ToolGroupView).name === 'string' &&
        Array.isArray((g as ToolGroupView).toolIds)
    );
  } catch {
    return [];
  }
}

/** null = entry written before owner tagging — treated as adoptable, same as 'guest'. */
function loadGuestGroupsOwner(): string | null {
  try {
    return localStorage.getItem(GUEST_GROUPS_OWNER_KEY);
  } catch {
    return null;
  }
}

function saveGuestGroups(groups: ToolGroupView[], owner: string): void {
  try {
    localStorage.setItem(GUEST_GROUPS_KEY, JSON.stringify(groups));
    localStorage.setItem(GUEST_GROUPS_OWNER_KEY, owner);
  } catch {
    /* ignore */
  }
}

function clearGuestGroups(): void {
  try {
    localStorage.removeItem(GUEST_GROUPS_KEY);
    localStorage.removeItem(GUEST_GROUPS_OWNER_KEY);
  } catch {
    /* ignore */
  }
}

function dedupe(toolIds: string[]): string[] {
  return [...new Set(toolIds)];
}

type ServerGroups = {
  groups: Array<{ id: string; name: string; tools: Array<{ tool_id: string }> }>;
};

function serverToView(data: ServerGroups): ToolGroupView[] {
  return data.groups.map((g) => ({
    id: g.id,
    name: g.name,
    toolIds: g.tools.map((t) => t.tool_id),
  }));
}

/**
 * Custom tool groups: user-created named groups of tools, shown as pinned
 * sections in the tool panel. Replaced personas (2026-07-14) — the onboarding
 * starter-kit pick just calls createGroup.
 *
 * Signed-in users persist via /user/tool-groups; guests persist to
 * localStorage and their groups are adopted into the account on first login
 * (server-wins when the account already has groups).
 */
export default function useToolGroups(): ToolGroupsContextValue {
  const [groups, setGroups] = useState<ToolGroupView[]>(() => loadGuestGroups());

  const { isAuthenticated, oidcUser } = useOidcAuth();
  const userSub = oidcUser?.profile.sub;

  const { data: dbGroups, isLoading } = useGetToolGroupsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [apiCreateGroup] = useCreateToolGroupMutation();
  const [apiRenameGroup] = useRenameToolGroupMutation();
  const [apiDeleteGroup] = useDeleteToolGroupMutation();
  const [apiAddTool] = useAddToolToGroupMutation();
  const [apiRemoveTool] = useRemoveToolFromGroupMutation();
  const [apiSetGroupTools] = useSetToolGroupToolsMutation();
  const [apiReorderGroups] = useReorderToolGroupsMutation();

  // Guards the one-time guest→account adoption: the effect re-runs on every
  // refetch (each create invalidates the ToolGroups tag), and without the ref
  // a slow server response would re-POST the same groups.
  const adoptionStarted = useRef(false);

  // Hydration is deliberately its own effect keyed on the query data — the
  // same self-contained pattern usePersona settled on after the P2-TC-22
  // ordering race (a shared one-shot hydration guard re-showed onboarding
  // for already-onboarded users).
  useEffect(() => {
    if (!isAuthenticated || !dbGroups) return;
    const serverGroups = serverToView(dbGroups as ServerGroups);
    if (serverGroups.length > 0) {
      setGroups(serverGroups);
      // Mirror into the local copy: after logout this browser falls back to
      // guest state, and the mirror keeps groups visible (and the onboarding
      // gate closed) for a user who onboarded long ago elsewhere.
      saveGuestGroups(serverGroups, userSub ?? 'guest');
      return;
    }
    // Server has no groups. Local ones made as a guest (or by this same
    // account) are adopted and synced up; ones left behind by a DIFFERENT
    // account are not ours: drop them so this user starts clean.
    const stored = loadGuestGroups();
    if (stored.length === 0) return;
    const owner = loadGuestGroupsOwner();
    if (owner === null || owner === 'guest' || owner === userSub) {
      setGroups(stored);
      saveGuestGroups(stored, userSub ?? 'guest');
      if (!adoptionStarted.current) {
        adoptionStarted.current = true;
        // The ToolGroups tag invalidation refetch re-hydrates state with
        // server ids once the creates land; create is idempotent by name so
        // a retried adoption can't duplicate.
        for (const g of stored) {
          apiCreateGroup({ name: g.name, tool_ids: g.toolIds })
            .unwrap()
            .catch(() => {});
        }
      }
    } else {
      clearGuestGroups();
      // Only clear state that came from the foreign copy — never groups the
      // user just actively created (createGroup may have run in between).
      const storedJson = JSON.stringify(stored);
      setGroups((prev) => (JSON.stringify(prev) === storedJson ? [] : prev));
    }
  }, [isAuthenticated, dbGroups, userSub, apiCreateGroup]);

  // Always keep the local copy too, even when authenticated (see mirror note
  // in the hydration effect).
  const persist = useCallback(
    (next: ToolGroupView[]): void => {
      saveGuestGroups(next, isAuthenticated && userSub ? userSub : 'guest');
    },
    [isAuthenticated, userSub]
  );

  // Decisions and API calls happen inside the state updaters (the useFavorites
  // idiom): the updater is the only place the current list is reliably visible
  // to rapid successive calls. Every endpoint is idempotent, so a re-invoked
  // updater (StrictMode) can't duplicate anything server-side.

  const createGroup = useCallback(
    (name: string, toolIds: string[] = []): void => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setGroups((prev) => {
        // Idempotent by name, same as the server
        if (prev.length >= MAX_TOOL_GROUPS || prev.some((g) => g.name === trimmed)) {
          return prev;
        }
        const seeded = dedupe(toolIds).slice(0, MAX_TOOLS_PER_GROUP);
        const next = [...prev, { id: newLocalId(), name: trimmed, toolIds: seeded }];
        persist(next);
        if (isAuthenticated) {
          apiCreateGroup({ name: trimmed, tool_ids: seeded })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, apiCreateGroup, persist]
  );

  const renameGroup = useCallback(
    (groupId: string, name: string): void => {
      const trimmed = name.trim();
      if (!trimmed) return;
      setGroups((prev) => {
        if (prev.some((g) => g.id !== groupId && g.name === trimmed)) return prev;
        if (!prev.some((g) => g.id === groupId && g.name !== trimmed)) return prev;
        const next = prev.map((g) => (g.id === groupId ? { ...g, name: trimmed } : g));
        persist(next);
        if (isAuthenticated && !isLocalId(groupId)) {
          apiRenameGroup({ id: groupId, name: trimmed })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, apiRenameGroup, persist]
  );

  const deleteGroup = useCallback(
    (groupId: string): void => {
      setGroups((prev) => {
        const next = prev.filter((g) => g.id !== groupId);
        if (next.length === prev.length) return prev;
        persist(next);
        if (isAuthenticated && !isLocalId(groupId)) {
          apiDeleteGroup(groupId)
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, apiDeleteGroup, persist]
  );

  const addToolToGroup = useCallback(
    (groupId: string, toolId: string): void => {
      setGroups((prev) => {
        const group = prev.find((g) => g.id === groupId);
        if (
          !group ||
          group.toolIds.includes(toolId) ||
          group.toolIds.length >= MAX_TOOLS_PER_GROUP
        ) {
          return prev;
        }
        const next = prev.map((g) =>
          g.id === groupId ? { ...g, toolIds: [...g.toolIds, toolId] } : g
        );
        persist(next);
        if (isAuthenticated && !isLocalId(groupId)) {
          apiAddTool({ groupId, toolId })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, apiAddTool, persist]
  );

  const removeToolFromGroup = useCallback(
    (groupId: string, toolId: string): void => {
      setGroups((prev) => {
        const group = prev.find((g) => g.id === groupId);
        if (!group || !group.toolIds.includes(toolId)) return prev;
        const next = prev.map((g) =>
          g.id === groupId ? { ...g, toolIds: g.toolIds.filter((id) => id !== toolId) } : g
        );
        persist(next);
        if (isAuthenticated && !isLocalId(groupId)) {
          apiRemoveTool({ groupId, toolId })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, apiRemoveTool, persist]
  );

  const setGroupTools = useCallback(
    (groupId: string, toolIds: string[]): void => {
      setGroups((prev) => {
        const group = prev.find((g) => g.id === groupId);
        if (!group) return prev;
        const nextIds = dedupe(toolIds).slice(0, MAX_TOOLS_PER_GROUP);
        if (JSON.stringify(nextIds) === JSON.stringify(group.toolIds)) return prev;
        const next = prev.map((g) => (g.id === groupId ? { ...g, toolIds: nextIds } : g));
        persist(next);
        if (isAuthenticated && !isLocalId(groupId)) {
          apiSetGroupTools({ groupId, toolIds: nextIds })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, apiSetGroupTools, persist]
  );

  const reorderGroups = useCallback(
    (groupIds: string[]): void => {
      setGroups((prev) => {
        // Mirror the server's semantics: listed groups first (array position =
        // display order), unlisted ones keep their relative order after them.
        const byId = new Map(prev.map((g) => [g.id, g]));
        const listed = groupIds
          .map((id) => byId.get(id))
          .filter((g): g is ToolGroupView => !!g);
        const listedIds = new Set(listed.map((g) => g.id));
        const next = [...listed, ...prev.filter((g) => !listedIds.has(g.id))];
        if (next.every((g, i) => g === prev[i])) return prev;
        persist(next);
        if (isAuthenticated) {
          const serverIds = next.map((g) => g.id).filter((id) => !isLocalId(id));
          if (serverIds.length > 0) {
            apiReorderGroups(serverIds)
              .unwrap()
              .catch(() => {});
          }
        }
        return next;
      });
    },
    [isAuthenticated, apiReorderGroups, persist]
  );

  return {
    groups,
    // Guests are ready immediately; signed-in users once the server list has
    // settled (either way) — gating UI must not act on a half-hydrated state.
    ready: !isAuthenticated || !isLoading,
    createGroup,
    renameGroup,
    deleteGroup,
    addToolToGroup,
    removeToolFromGroup,
    setGroupTools,
    reorderGroups,
  };
}

// Test-only surface for the storage keys (mirrors usePersona's convention of
// asserting on raw storage in its spec).
export const TOOL_GROUPS_STORAGE_KEYS = {
  groups: GUEST_GROUPS_KEY,
  owner: GUEST_GROUPS_OWNER_KEY,
} as const;
