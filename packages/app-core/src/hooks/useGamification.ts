import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useGetGamificationQuery,
  useUpdateGamificationMutation,
  useGetDiscoveredToolsQuery,
  useGetPipelinesQuery,
} from '../store/api/userDataApi';
import { TOOLS, ACHIEVEMENTS, QUEST_TEMPLATES, LEVELS } from '../constants/tools';
import { useOidcAuth } from '../auth/useOidcAuth';
import { isGamificationEnabled } from '../config/features';
import type { Achievement, LevelDefinition, QuestOp, QuestTemplate } from '../types/tools';
import type {
  GamificationContextValue,
  GamificationStreak,
  GamificationDailyQuest,
} from '../types/context';

// Persona and favorites were extracted into usePersona / useFavorites (Phase A
// of the gamification removal) — they are product features that survive
// gamification and are NOT gated by the kill switch below.
//
// Kill switch: when VITE_GAMIFICATION_ENABLED === 'false' this hook goes inert
// — every /user/gamification (+ discovered-tools/pipelines) query is skipped,
// hydration and the debounced PUT never run, and recordToolUse is a no-op. A
// flag-off bundle must issue ZERO requests to /user/gamification.

// localStorage is a read-cache for pre-auth display speed only — never the source of truth.
const STORAGE_KEY = 'fmx_gamification';

// Pre-compute static tool ID sets (TOOLS never changes)
const AI_TOOL_IDS = TOOLS.filter((t) => t.tabs?.includes('ai')).map((t) => t.id);
const DEV_TOOL_IDS = TOOLS.filter((t) => t.tabs?.includes('code')).map((t) => t.id);

interface GamificationState {
  toolsUsed: Record<string, number>;
  discoveredTools: string[];
  totalOps: number;
  totalChars: number;
  xp: number;
  streak: GamificationStreak;
  achievements: string[];
  dailyQuest: GamificationDailyQuest;
  savedPipelines: unknown[];
  completedQuests: string[];
  sessionOps: QuestOp[];
}

function loadState(): Partial<GamificationState> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Partial<GamificationState>;
  } catch {
    /* ignore */
  }
  return null;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickDailyQuest(completed: string[] = []): QuestTemplate {
  const available = (QUEST_TEMPLATES as QuestTemplate[]).filter((q) => !completed.includes(q.id));
  const pool = available.length > 0 ? available : (QUEST_TEMPLATES as QuestTemplate[]);
  const day = (Date.now() / 86400000) | 0;
  const hash = (day * 2654435761) >>> 0;
  // pool is always non-empty (either available or QUEST_TEMPLATES)
  return pool[hash % pool.length]!;
}

function getLevel(xp: number): LevelDefinition {
  let lvl = (LEVELS as LevelDefinition[])[0]!;
  for (const l of LEVELS as LevelDefinition[]) {
    if (xp >= l.xp) lvl = l;
    else break;
  }
  return lvl;
}

/** Convert API response (flat) to hook state shape (nested).
 *  Note: favorites are NOT included here — they load from GET /user/favorites
 *  (useFavorites). persona is NOT included either — it lives in
 *  /user/preferences and hydrates in usePersona. Emitting `persona: null` here
 *  once wiped a persona the tab already knew whenever this response beat the
 *  preferences response (blocking welcome modal re-shown for onboarded users). */
function apiToState(api: Record<string, unknown>): Partial<GamificationState> {
  // Cast unknown fields with defaults; numeric/boolean/string fields are explicitly typed
  return {
    totalOps: (api.total_ops as number) || 0,
    totalChars: (api.total_chars as number) || 0,
    xp: (api.xp as number) || 0,
    streak: {
      current: (api.streak_current as number) || 0,
      lastDate: (api.streak_last_date as string | null) || null,
    },
    achievements: (api.achievements as string[]) || [],
    dailyQuest: {
      id: (api.daily_quest_id as string | null) || null,
      date: (api.daily_quest_date as string | null) || null,
      completed: (api.daily_quest_completed as boolean) || false,
    },
    completedQuests: (api.completed_quests as string[]) || [],
  };
}

/** Convert hook state (nested) to API payload (flat).
 *  favorites are excluded — managed via dedicated /user/favorites endpoint. */
function stateToApi(s: GamificationState): Record<string, unknown> {
  return {
    xp: s.xp,
    streak_current: s.streak.current,
    streak_last_date: s.streak.lastDate,
    total_ops: s.totalOps,
    total_chars: s.totalChars,
    achievements: s.achievements,
    completed_quests: s.completedQuests,
    daily_quest_id: s.dailyQuest.id,
    daily_quest_date: s.dailyQuest.date,
    daily_quest_completed: s.dailyQuest.completed,
  };
}

const DEFAULT_STATE: GamificationState = {
  toolsUsed: {},
  discoveredTools: [],
  totalOps: 0,
  totalChars: 0,
  xp: 0,
  streak: { current: 0, lastDate: null },
  achievements: [],
  dailyQuest: { id: null, date: null, completed: false },
  savedPipelines: [],
  completedQuests: [],
  sessionOps: [],
};

export interface UseGamificationOptions {
  /** Current favorites count (from useFavorites) — the achievement evaluator
   * inside recordToolUse reads it (favorite_fan). Threaded in as an argument
   * so this hook no longer owns favorites state; recordToolUse's public
   * signature stays (toolId, charCount?) for the remotes. */
  favoritesCount?: number;
}

export default function useGamification(
  options: UseGamificationOptions = {}
): GamificationContextValue {
  const { favoritesCount = 0 } = options;
  const enabled = isGamificationEnabled();

  const [state, setState] = useState<GamificationState>(() => {
    const saved = loadState();
    return saved ? { ...DEFAULT_STATE, ...saved, sessionOps: [] } : { ...DEFAULT_STATE };
  });

  const speedTimestamps = useRef<number[]>([]);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const hydrated = useRef(false);

  // Latest favorites count for the achievement evaluator: recordToolUse keeps
  // its stable []-deps identity, so it reads through a ref.
  const favoritesCountRef = useRef(favoritesCount);
  favoritesCountRef.current = favoritesCount;

  // Auth state from OIDC
  const { isAuthenticated } = useOidcAuth();

  // RTK Query — fetch gamification data from DB when enabled + authenticated.
  // The skip on the flag is the kill switch's network guarantee.
  const { data: dbGamification } = useGetGamificationQuery(undefined, {
    skip: !enabled || !isAuthenticated,
  });
  const { data: dbDiscovered } = useGetDiscoveredToolsQuery(undefined, {
    skip: !enabled || !isAuthenticated,
  });
  const { data: dbPipelines } = useGetPipelinesQuery(undefined, {
    skip: !enabled || !isAuthenticated,
  });
  const [syncToDb] = useUpdateGamificationMutation();

  // Hydrate from DB on first fetch (DB is authoritative; localStorage was read-only pre-auth cache)
  useEffect(() => {
    if (!enabled) return;
    if (dbGamification && !hydrated.current) {
      hydrated.current = true;
      // Cast: RTK Query returns unknown; shape is the flat gamification API object.
      // apiToState carries no persona, so this merge can never clobber one.
      const dbState = apiToState(dbGamification as Record<string, unknown>);
      setState((prev) => ({ ...prev, ...dbState, sessionOps: prev.sessionOps }));
    }
  }, [dbGamification, enabled]);

  // Hydrate discovered tools from dedicated endpoint
  useEffect(() => {
    const disc = dbDiscovered as { tools?: Array<{ tool_id: string }> } | undefined;
    if (disc?.tools) {
      const ids = disc.tools.map((t) => t.tool_id);
      setState((prev) => {
        // Merge: keep any locally-tracked discoveries not yet in DB
        const merged = [...new Set([...ids, ...prev.discoveredTools])];
        if (
          merged.length === prev.discoveredTools.length &&
          merged.every((id) => prev.discoveredTools.includes(id))
        ) {
          return prev; // no change
        }
        return { ...prev, discoveredTools: merged };
      });
    }
  }, [dbDiscovered]);

  // Hydrate saved pipelines from dedicated endpoint
  useEffect(() => {
    if (dbPipelines) {
      setState((prev) => ({ ...prev, savedPipelines: dbPipelines as unknown[] }));
    }
  }, [dbPipelines]);

  // Reset hydration flag on logout
  useEffect(() => {
    if (!isAuthenticated) hydrated.current = false;
  }, [isAuthenticated]);

  // Sync to DB on state change (debounced). localStorage is NOT written — DB is source of truth.
  useEffect(() => {
    if (!enabled || !isAuthenticated) return;
    const timer = setTimeout(() => {
      syncToDb(stateToApi(state))
        .unwrap()
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [state, isAuthenticated, syncToDb, enabled]);

  // Check streak on mount
  useEffect(() => {
    if (!isGamificationEnabled()) return;
    setState((prev) => {
      const d = today();
      const streak = { ...prev.streak };
      if (streak.lastDate === d) return prev;
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yStr = yesterday.toISOString().slice(0, 10);
      if (streak.lastDate === yStr) {
        streak.current += 1;
        streak.lastDate = d;
      } else if (streak.lastDate !== d) {
        streak.current = streak.lastDate ? 0 : 0;
        streak.lastDate = d;
      }
      return { ...prev, streak };
    });
  }, []);

  // Ensure daily quest
  useEffect(() => {
    setState((prev) => {
      const d = today();
      if (prev.dailyQuest.date === d) return prev;
      const quest = pickDailyQuest(prev.completedQuests);
      return { ...prev, dailyQuest: { id: quest.id, date: d, completed: false } };
    });
  }, []);

  const recordToolUse = useCallback((toolId: string, charCount = 0): void => {
    // Kill switch: no XP, no achievements, and — critically — no state change
    // that would wake the debounced PUT.
    if (!isGamificationEnabled()) return;

    const now = Date.now();
    speedTimestamps.current.push(now);
    speedTimestamps.current = speedTimestamps.current.filter((t) => now - t < 60000);

    setState((prev) => {
      const tool = TOOLS.find((t) => t.id === toolId);
      const isNew = !prev.discoveredTools.includes(toolId);
      const firstTab = tool?.tabs?.[0] || 'transform';

      let xpEarned = 10;
      if (isNew) xpEarned += 25;

      const toolsUsed = { ...prev.toolsUsed, [toolId]: (prev.toolsUsed[toolId] || 0) + 1 };
      const discoveredTools = isNew ? [...prev.discoveredTools, toolId] : prev.discoveredTools;
      const totalOps = prev.totalOps + 1;
      const totalChars = prev.totalChars + charCount;
      const streak = { ...prev.streak, lastDate: today(), current: prev.streak.current || 1 };

      const sessionOps = [...prev.sessionOps, { id: toolId, tab: firstTab, isNew, time: now }];

      let dailyQuest = { ...prev.dailyQuest };
      let completedQuests = [...prev.completedQuests];
      if (!dailyQuest.completed && dailyQuest.id) {
        const questId = dailyQuest.id as string;
        const questDef = (QUEST_TEMPLATES as QuestTemplate[]).find((q) => q.id === questId);
        if (questDef?.check(sessionOps)) {
          dailyQuest = { ...dailyQuest, completed: true };
          completedQuests = [...completedQuests, questId];
          xpEarned += questDef.xp;
        }
      }

      const translateOpts = TOOLS.find((t) => t.id === 'translate')?.options || [];
      const langCount = translateOpts.filter(
        () => toolsUsed['translate'] && prev.discoveredTools.includes('translate')
      ).length;

      const hour = new Date().getHours();
      const achieveState = {
        totalOps,
        discoveredTools,
        sessionOps: sessionOps.length,
        speedCount: speedTimestamps.current.length,
        aiToolsUsed: discoveredTools.filter((id) => AI_TOOL_IDS.includes(id)).length,
        devToolsUsed: discoveredTools.filter((id) => DEV_TOOL_IDS.includes(id)).length,
        languagesUsed: langCount,
        streak: streak.current,
        totalChars,
        favoritesCount: favoritesCountRef.current,
        savedPipelines: prev.savedPipelines.length,
        nightOwl: hour >= 0 && hour < 5,
        earlyBird: hour >= 5 && hour < 7,
      };

      let achievements = [...prev.achievements];
      let newUnlock: Achievement | null = null;
      for (const a of ACHIEVEMENTS) {
        if (!achievements.includes(a.id) && a.condition(achieveState)) {
          achievements = [...achievements, a.id];
          newUnlock = a;
          xpEarned += 100;
        }
      }

      setTimeout(() => setXpGain(xpEarned), 0);
      setTimeout(() => setXpGain(null), 2000);

      if (newUnlock) {
        setTimeout(() => setNewAchievement(newUnlock), 300);
        setTimeout(() => setNewAchievement(null), 6000);
      }

      return {
        ...prev,
        toolsUsed,
        discoveredTools,
        totalOps,
        totalChars,
        xp: prev.xp + xpEarned,
        streak,
        achievements,
        dailyQuest,
        completedQuests,
        sessionOps,
      };
    });
  }, []);

  const level = getLevel(state.xp);
  const nextLevel = LEVELS.find((l) => l.xp > state.xp) || level;
  const xpProgress =
    nextLevel.xp > level.xp ? ((state.xp - level.xp) / (nextLevel.xp - level.xp)) * 100 : 100;

  return {
    ...state,
    level,
    nextLevel,
    xpProgress,
    newAchievement,
    dismissAchievement: () => setNewAchievement(null),
    xpGain,
    recordToolUse,
  };
}
