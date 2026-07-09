import { useState, useCallback, useEffect, useRef } from 'react';
import {
  useGetGamificationQuery,
  useUpdateGamificationMutation,
  useUpdatePreferencesMutation,
  useGetPreferencesQuery,
  useGetFavoritesQuery,
  useAddFavoriteMutation,
  useRemoveFavoriteMutation,
  useGetDiscoveredToolsQuery,
  useGetPipelinesQuery,
} from '../store/api/userDataApi';
import { TOOLS, ACHIEVEMENTS, QUEST_TEMPLATES, LEVELS } from '../constants/tools';
import { useOidcAuth } from '../auth/useOidcAuth';
import type {
  Achievement,
  LevelDefinition,
  QuestOp,
  QuestTemplate,
  Persona,
} from '../types/tools';
import type {
  GamificationContextValue,
  GamificationStreak,
  GamificationDailyQuest,
} from '../types/context';

// localStorage is a read-cache for pre-auth display speed only — never the source of truth.
const STORAGE_KEY = 'fmx_gamification';
// Guest persona lives in sessionStorage so the onboarding picker shows at most once
// per tab session for unauthenticated users; signed-in users persist via /user/preferences.
const GUEST_PERSONA_KEY = 'fmx_guest_persona';

// Pre-compute static tool ID sets (TOOLS never changes)
const AI_TOOL_IDS = TOOLS.filter((t) => t.tabs?.includes('ai')).map((t) => t.id);
const DEV_TOOL_IDS = TOOLS.filter((t) => t.tabs?.includes('code')).map((t) => t.id);

interface GamificationState {
  persona: Persona | null;
  toolsUsed: Record<string, number>;
  discoveredTools: string[];
  totalOps: number;
  totalChars: number;
  xp: number;
  streak: GamificationStreak;
  achievements: string[];
  favorites: string[];
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

function loadGuestPersona(): Persona | null {
  try {
    return sessionStorage.getItem(GUEST_PERSONA_KEY) as unknown as Persona | null;
  } catch {
    return null;
  }
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
 *  Note: favorites are NOT included here — they load from GET /user/favorites. */
function apiToState(api: Record<string, unknown>): Partial<GamificationState> {
  // Cast unknown fields with defaults; numeric/boolean/string fields are explicitly typed
  return {
    persona: null, // persona is in preferences, not gamification
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
  persona: null,
  toolsUsed: {},
  discoveredTools: [],
  totalOps: 0,
  totalChars: 0,
  xp: 0,
  streak: { current: 0, lastDate: null },
  achievements: [],
  favorites: [], // populated from GET /user/favorites when authenticated
  dailyQuest: { id: null, date: null, completed: false },
  savedPipelines: [],
  completedQuests: [],
  sessionOps: [],
};

export default function useGamification(): GamificationContextValue {
  const [state, setState] = useState<GamificationState>(() => {
    const saved = loadState();
    const base = saved ? { ...DEFAULT_STATE, ...saved, sessionOps: [] } : { ...DEFAULT_STATE };
    return base.persona ? base : { ...base, persona: loadGuestPersona() };
  });

  const speedTimestamps = useRef<number[]>([]);
  const [newAchievement, setNewAchievement] = useState<Achievement | null>(null);
  const [xpGain, setXpGain] = useState<number | null>(null);
  const hydrated = useRef(false);

  // Auth state from OIDC
  const { isAuthenticated } = useOidcAuth();

  // RTK Query — fetch gamification + preferences + favorites from DB when authenticated
  const { data: dbGamification } = useGetGamificationQuery(undefined, { skip: !isAuthenticated });
  const { data: dbPrefs } = useGetPreferencesQuery(undefined, { skip: !isAuthenticated });
  const { data: dbFavorites } = useGetFavoritesQuery(undefined, { skip: !isAuthenticated });
  const { data: dbDiscovered } = useGetDiscoveredToolsQuery(undefined, { skip: !isAuthenticated });
  const { data: dbPipelines } = useGetPipelinesQuery(undefined, { skip: !isAuthenticated });
  const [syncToDb] = useUpdateGamificationMutation();
  const [syncPrefs] = useUpdatePreferencesMutation();
  const [apiAddFavorite] = useAddFavoriteMutation();
  const [apiRemoveFavorite] = useRemoveFavoriteMutation();

  // Hydrate from DB on first fetch (DB is authoritative; localStorage was read-only pre-auth cache)
  useEffect(() => {
    if (dbGamification && !hydrated.current) {
      hydrated.current = true;
      // Cast: RTK Query returns unknown; shape is the flat gamification API object
      const dbState = apiToState(dbGamification as Record<string, unknown>);
      setState((prev) => {
        const merged = { ...prev, ...dbState, sessionOps: prev.sessionOps };
        if (dbPrefs) {
          const prefs = dbPrefs as { persona?: Persona };
          merged.persona = prefs.persona || prev.persona;
        }
        return merged;
      });
      // Mirror the DB persona into the guest sessionStorage copy: after logout
      // this tab falls back to guest state, and without the copy the welcome
      // picker would reappear for a user who onboarded long ago elsewhere.
      const personaFromDb = (dbPrefs as { persona?: Persona } | undefined)?.persona;
      if (personaFromDb) {
        try {
          sessionStorage.setItem(GUEST_PERSONA_KEY, personaFromDb as unknown as string);
        } catch {
          /* ignore */
        }
      }
    }
  }, [dbGamification, dbPrefs]);

  // Hydrate favorites from dedicated endpoint
  useEffect(() => {
    if (dbFavorites) {
      const favs = dbFavorites as { favorites: Array<{ tool_id: string }> };
      const ids = favs.favorites.map((f) => f.tool_id);
      setState((prev) => ({ ...prev, favorites: ids }));
    }
  }, [dbFavorites]);

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
    if (!isAuthenticated) return;
    const timer = setTimeout(() => {
      syncToDb(stateToApi(state))
        .unwrap()
        .catch(() => {});
    }, 500);
    return () => clearTimeout(timer);
  }, [state, isAuthenticated, syncToDb]);

  // Check streak on mount
  useEffect(() => {
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
        favoritesCount: prev.favorites.length,
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

  const toggleFavorite = useCallback(
    (toolId: string): void => {
      setState((prev) => {
        const isFav = prev.favorites.includes(toolId);
        if (isAuthenticated) {
          if (isFav)
            apiRemoveFavorite(toolId)
              .unwrap()
              .catch(() => {});
          else
            apiAddFavorite(toolId)
              .unwrap()
              .catch(() => {});
        }
        const favorites = isFav
          ? prev.favorites.filter((id) => id !== toolId)
          : [...prev.favorites, toolId];
        return { ...prev, favorites };
      });
    },
    [isAuthenticated, apiAddFavorite, apiRemoveFavorite]
  );

  const setPersona = useCallback(
    (persona: Persona): void => {
      setState((prev) => ({ ...prev, persona }));
      // Always keep the guest copy too, even when authenticated: after logout
      // the hook falls back to guest state, and without it the welcome picker
      // would reappear on the logged-out home right after signing out.
      try {
        sessionStorage.setItem(GUEST_PERSONA_KEY, persona as unknown as string);
      } catch {
        /* ignore */
      }
      if (isAuthenticated) {
        syncPrefs({ persona: persona as unknown as string })
          .unwrap()
          .catch(() => {});
      }
    },
    [isAuthenticated, syncPrefs]
  );

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
    onboarded: !!state.persona,
    recordToolUse,
    toggleFavorite,
    setPersona,
  };
}
