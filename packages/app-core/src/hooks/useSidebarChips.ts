import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useGetUiSettingsQuery,
  useUpdateUiSettingsMutation,
} from '../store/api/userDataApi';
import { useOidcAuth } from '../auth/useOidcAuth';
import { DEFAULT_SIDEBAR_CHIPS, SIDEBAR_VIEWS } from '../constants/tools';
import type { SidebarChip } from '../types/tools';
import type { SidebarChipsContextValue, ToolGroupsContextValue } from '../types/context';

// Mirror of the server-side cap (account-svc UiSettingsUpdate.sidebar_chips).
export const MAX_SIDEBAR_CHIPS = 40;

// Same guest-persistence idiom as useToolGroups: chip config is real user
// data that must survive tab closes, owner-tagged so user B on the same
// browser doesn't inherit (and sync up) A's row.
const GUEST_CHIPS_KEY = 'fmx_sidebar_chips';
const GUEST_CHIPS_OWNER_KEY = 'fmx_sidebar_chips_owner';

const VIEW_IDS = new Set<string>(SIDEBAR_VIEWS.map((v) => v.id));
const CHIP_TYPES = new Set(['view', 'group', 'custom_group']);

function isValidChip(c: unknown): c is SidebarChip {
  if (!c || typeof c !== 'object') return false;
  const chip = c as SidebarChip;
  if (!CHIP_TYPES.has(chip.type) || typeof chip.id !== 'string' || !chip.id) return false;
  if (chip.type === 'view' && !VIEW_IDS.has(chip.id)) return false;
  return true;
}

/** Dedupe by (type,id), force view:all present (the escape hatch), cap size. */
function sanitize(chips: SidebarChip[]): SidebarChip[] {
  const seen = new Set<string>();
  const out: SidebarChip[] = [];
  for (const chip of chips) {
    if (!isValidChip(chip)) continue;
    const key = `${chip.type}:${chip.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ type: chip.type, id: chip.id });
  }
  if (!out.some((c) => c.type === 'view' && c.id === 'all')) {
    out.unshift({ type: 'view', id: 'all' });
  }
  return out.slice(0, MAX_SIDEBAR_CHIPS);
}

function sameChips(a: SidebarChip[], b: SidebarChip[]): boolean {
  return a.length === b.length && a.every((c, i) => c.type === b[i]!.type && c.id === b[i]!.id);
}

/** null = never customized (render the default row). */
function loadGuestChips(): SidebarChip[] | null {
  try {
    const raw = localStorage.getItem(GUEST_CHIPS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return sanitize(parsed as SidebarChip[]);
  } catch {
    return null;
  }
}

function loadGuestChipsOwner(): string | null {
  try {
    return localStorage.getItem(GUEST_CHIPS_OWNER_KEY);
  } catch {
    return null;
  }
}

function saveGuestChips(chips: SidebarChip[] | null, owner: string): void {
  try {
    if (chips === null) {
      localStorage.removeItem(GUEST_CHIPS_KEY);
      localStorage.removeItem(GUEST_CHIPS_OWNER_KEY);
    } else {
      localStorage.setItem(GUEST_CHIPS_KEY, JSON.stringify(chips));
      localStorage.setItem(GUEST_CHIPS_OWNER_KEY, owner);
    }
  } catch {
    /* ignore */
  }
}

type UiSettingsData = { sidebar_chips?: SidebarChip[] } | undefined;

/**
 * The editor sidebar's user-editable chip row (replaced the USE_CASE_TABS
 * category tabs, 2026-07-22). Default row = All/Pinned/Recent/Suggested;
 * users add group chips whose labels match the panel section headers.
 *
 * Signed-in users persist via ui-settings.sidebar_chips ([] = uncustomized);
 * guests persist to localStorage and their row is adopted into the account on
 * first login (server-wins when the account already customized).
 *
 * Takes the toolGroups context so custom_group chips can be pruned when their
 * group disappears (delete cascade) — pass the same instance AppProvider owns.
 */
export default function useSidebarChips(
  toolGroups: Pick<ToolGroupsContextValue, 'groups' | 'ready'>
): SidebarChipsContextValue {
  const [custom, setCustom] = useState<SidebarChip[] | null>(() => loadGuestChips());

  const { isAuthenticated, oidcUser } = useOidcAuth();
  const userSub = oidcUser?.profile.sub;

  const { data: uiSettings, isLoading } = useGetUiSettingsQuery(undefined, {
    skip: !isAuthenticated,
  });
  const [apiUpdateUiSettings] = useUpdateUiSettingsMutation();

  // One-time guest→account adoption guard (see useToolGroups).
  const adoptionStarted = useRef(false);

  const owner = isAuthenticated && userSub ? userSub : 'guest';

  /** Persist + sync one new value. null = back to defaults. */
  const commit = useCallback(
    (next: SidebarChip[] | null): void => {
      setCustom(next);
      saveGuestChips(next, owner);
      if (isAuthenticated) {
        apiUpdateUiSettings({ sidebar_chips: next ?? [] })
          .unwrap()
          .catch(() => {});
      }
    },
    [isAuthenticated, owner, apiUpdateUiSettings]
  );

  // Hydration — self-contained, keyed on the query data (the useToolGroups
  // pattern from the P2-TC-22 ordering race).
  useEffect(() => {
    if (!isAuthenticated || !uiSettings) return;
    const serverChips = ((uiSettings as UiSettingsData)?.sidebar_chips ?? []) as SidebarChip[];
    if (serverChips.length > 0) {
      const sanitized = sanitize(serverChips);
      setCustom((prev) => (prev && sameChips(prev, sanitized) ? prev : sanitized));
      saveGuestChips(sanitized, userSub ?? 'guest');
      return;
    }
    // Server uncustomized. A local row made as a guest (or by this same
    // account) is adopted and synced up; a different account's row is not
    // ours: drop it so this user starts on the default row.
    const stored = loadGuestChips();
    if (stored === null) return;
    const storedOwner = loadGuestChipsOwner();
    if (storedOwner === null || storedOwner === 'guest' || storedOwner === userSub) {
      setCustom(stored);
      saveGuestChips(stored, userSub ?? 'guest');
      if (!adoptionStarted.current) {
        adoptionStarted.current = true;
        apiUpdateUiSettings({ sidebar_chips: stored })
          .unwrap()
          .catch(() => {});
      }
    } else {
      saveGuestChips(null, 'guest');
      const storedJson = JSON.stringify(stored);
      setCustom((prev) => (JSON.stringify(prev) === storedJson ? null : prev));
    }
  }, [isAuthenticated, uiSettings, userSub, apiUpdateUiSettings]);

  // Just-remapped ids are exempt from pruning until their server group shows
  // up in the groups list — the remap and the groups update land in separate
  // renders in some flows, and the prune effect must not win that race.
  const remapGraceRef = useRef<Set<string>>(new Set());

  // Guest→account tool-group adoption swaps local- group ids for server UUIDs;
  // useToolGroups broadcasts the mapping so chips referencing those groups
  // follow instead of dangling.
  useEffect(() => {
    const onAdopted = (e: Event) => {
      const idMap = (e as CustomEvent<{ idMap?: Record<string, string> }>).detail?.idMap;
      if (!idMap) return;
      for (const newId of Object.values(idMap)) remapGraceRef.current.add(newId);
      setCustom((prev) => {
        if (!prev) return prev;
        let changed = false;
        const next = prev.map((chip) => {
          if (chip.type === 'custom_group' && idMap[chip.id]) {
            changed = true;
            return { ...chip, id: idMap[chip.id]! };
          }
          return chip;
        });
        if (!changed) return prev;
        saveGuestChips(next, owner);
        if (isAuthenticated) {
          apiUpdateUiSettings({ sidebar_chips: next })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    };
    window.addEventListener('fmx:tool-groups-adopted', onAdopted);
    return () => window.removeEventListener('fmx:tool-groups-adopted', onAdopted);
  }, [isAuthenticated, owner, apiUpdateUiSettings]);

  const ready = !isAuthenticated || !isLoading;

  // Delete cascade: a custom_group chip whose group no longer exists (deleted
  // here, on another device, or left behind by adoption) silently disappears.
  // Runs only when both sides have settled — never against half-hydrated state.
  useEffect(() => {
    if (!ready || !toolGroups.ready || custom === null) return;
    const alive = new Set(toolGroups.groups.map((g) => g.id));
    // A graced id has arrived — it no longer needs protection.
    for (const id of [...remapGraceRef.current]) {
      if (alive.has(id)) remapGraceRef.current.delete(id);
    }
    const next = custom.filter(
      (c) => c.type !== 'custom_group' || alive.has(c.id) || remapGraceRef.current.has(c.id)
    );
    if (next.length !== custom.length) commit(next);
  }, [ready, toolGroups.ready, toolGroups.groups, custom, commit]);

  const chips = custom ?? DEFAULT_SIDEBAR_CHIPS;

  const addChip = useCallback(
    (chip: SidebarChip): void => {
      if (!isValidChip(chip)) return;
      setCustom((prev) => {
        const base = prev ?? DEFAULT_SIDEBAR_CHIPS;
        if (base.some((c) => c.type === chip.type && c.id === chip.id)) return prev;
        if (base.length >= MAX_SIDEBAR_CHIPS) return prev;
        const next = [...base, { type: chip.type, id: chip.id }];
        saveGuestChips(next, owner);
        if (isAuthenticated) {
          apiUpdateUiSettings({ sidebar_chips: next })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, owner, apiUpdateUiSettings]
  );

  const removeChip = useCallback(
    (chip: SidebarChip): void => {
      if (chip.type === 'view' && chip.id === 'all') return;
      setCustom((prev) => {
        const base = prev ?? DEFAULT_SIDEBAR_CHIPS;
        const next = base.filter((c) => !(c.type === chip.type && c.id === chip.id));
        if (next.length === base.length) return prev;
        saveGuestChips(next, owner);
        if (isAuthenticated) {
          apiUpdateUiSettings({ sidebar_chips: next })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, owner, apiUpdateUiSettings]
  );

  const moveChip = useCallback(
    (from: number, to: number): void => {
      setCustom((prev) => {
        const base = prev ?? DEFAULT_SIDEBAR_CHIPS;
        if (from === to || from < 0 || to < 0 || from >= base.length || to >= base.length) {
          return prev;
        }
        const next = [...base];
        const [moved] = next.splice(from, 1);
        next.splice(to, 0, moved!);
        saveGuestChips(next, owner);
        if (isAuthenticated) {
          apiUpdateUiSettings({ sidebar_chips: next })
            .unwrap()
            .catch(() => {});
        }
        return next;
      });
    },
    [isAuthenticated, owner, apiUpdateUiSettings]
  );

  const setChips = useCallback(
    (next: SidebarChip[]): void => {
      commit(sanitize(next));
    },
    [commit]
  );

  const resetChips = useCallback((): void => {
    commit(null);
  }, [commit]);

  return {
    chips,
    ready,
    isCustomized: custom !== null,
    addChip,
    removeChip,
    moveChip,
    setChips,
    resetChips,
  };
}

// Test-only surface for the storage keys (mirrors useToolGroups' convention).
export const SIDEBAR_CHIPS_STORAGE_KEYS = {
  chips: GUEST_CHIPS_KEY,
  owner: GUEST_CHIPS_OWNER_KEY,
} as const;
