import { createContext, useContext, useMemo } from 'react';
import type React from 'react';
import { useAuth } from '../hooks/useAuth';
import useGamification from '../hooks/useGamification';
import useSubscription from '../hooks/useSubscription';
import { useAlertContext } from './AlertContext';
import type { components } from '../types';
import type {
  Persona,
  Achievement,
  LevelDefinition,
  QuestOp,
  ToolDefinition,
} from '../types/tools';

// ── User ─────────────────────────────────────────────────────────────────────

export type User = components['schemas']['UserResponse'];

// ── Gamification ──────────────────────────────────────────────────────────────

export interface GamificationStreak {
  current: number;
  lastDate: string | null;
}

export interface GamificationDailyQuest {
  id: string | null;
  date: string | null;
  completed: boolean;
}

export interface GamificationContextValue {
  // state fields spread from the hook's internal state
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
  // computed / extra fields
  level: LevelDefinition;
  nextLevel: LevelDefinition;
  xpProgress: number;
  newAchievement: Achievement | null;
  dismissAchievement: () => void;
  xpGain: number | null;
  onboarded: boolean;
  // actions
  recordToolUse: (toolId: string, charCount?: number) => void;
  toggleFavorite: (toolId: string) => void;
  setPersona: (persona: Persona) => void;
}

// ── Subscription ──────────────────────────────────────────────────────────────

export interface ToolUsage {
  uses: number;
  max: number;
  hasPass: boolean;
}

export interface SubscriptionContextValue {
  tier: string;
  isPro: boolean;
  region: string;
  toolUsesToday: Record<string, number>;
  dailyLoginBonus: boolean;
  getToolUsage: (toolId: string) => ToolUsage;
  checkToolAccess: (tool: ToolDefinition | null | undefined) => boolean;
  showUpgradeModal: boolean;
  dismissUpgradeModal: () => void;
  blockedTool: ToolDefinition | null;
  handleUpgrade: () => Promise<void>;
  handleCancelSubscription: () => Promise<void>;
  upgradeLoading: boolean;
  cancelLoading: boolean;
  // from usePasses spread
  activePasses: unknown[];
  activeCredits: unknown[];
  totalCredits: number;
  hasPassFor: (toolId: string) => boolean;
  handleBuyPass: (...args: unknown[]) => unknown;
  handleBuyCredits: (...args: unknown[]) => unknown;
  handleSpin: (...args: unknown[]) => unknown;
  passOrderLoading: boolean;
  creditOrderLoading: boolean;
  spinLoading: boolean;
  spinHistory: unknown[];
  refetchSpinHistory: () => void;
  refetchStatus: () => void;
  refetchPasses: () => void;
}

// ── AppContextValue ───────────────────────────────────────────────────────────

export interface AppContextValue {
  user: User | null;
  isAuthenticated: boolean;
  gamification: GamificationContextValue;
  subscription: SubscriptionContextValue;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { showAlert } = useAlertContext();
  const { user, isAuthenticated } = useAuth();
  const gamification = useGamification();
  const subscription = useSubscription({ showAlert });

  const value = useMemo(
    () => ({ user, isAuthenticated, gamification, subscription }),
    [user, isAuthenticated, gamification, subscription]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}
