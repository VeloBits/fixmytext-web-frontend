import { useState, useCallback } from 'react';

// Deliberately device-local (no account sync, no owner tag): recents are
// ephemeral per-device context, like VSCode's recent files — syncing them
// would let a phone session pollute the desktop's list. Decided 2026-07-22
// with the sidebar-chips feature; the Recent view chip reads this.
const RECENT_TOOLS_KEY = 'fmx_recent_tools';
export const MAX_RECENT_TOOLS = 10;

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_TOOLS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string').slice(0, MAX_RECENT_TOOLS);
  } catch {
    return [];
  }
}

export interface RecentToolsValue {
  /** Most recent first, deduped, capped at MAX_RECENT_TOOLS. */
  recentToolIds: string[];
  recordToolUse: (toolId: string) => void;
}

/** Tracks the tools the user actually ran, for the sidebar's Recent view. */
export default function useRecentTools(): RecentToolsValue {
  const [recentToolIds, setRecentToolIds] = useState<string[]>(() => loadRecents());

  const recordToolUse = useCallback((toolId: string): void => {
    setRecentToolIds((prev) => {
      if (prev[0] === toolId) return prev;
      const next = [toolId, ...prev.filter((id) => id !== toolId)].slice(0, MAX_RECENT_TOOLS);
      try {
        localStorage.setItem(RECENT_TOOLS_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { recentToolIds, recordToolUse };
}

// Test-only surface (mirrors TOOL_GROUPS_STORAGE_KEYS convention).
export const RECENT_TOOLS_STORAGE_KEY = RECENT_TOOLS_KEY;
