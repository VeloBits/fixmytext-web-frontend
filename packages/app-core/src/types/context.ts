// Shared application context value types.
//
// These describe the gamification / subscription / user state that the shell
// produces (via AppProvider) and injects as props into the federated remote
// surfaces. They live in app-core so both the shell provider and the remotes
// depend on a single shared definition rather than on each other's source.

import type { components } from './openapi';
import type {
  Persona,
  Achievement,
  LevelDefinition,
  QuestOp,
  ToolDefinition,
} from './tools';

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
  handleBuyPass: (passId: string, toolIds?: string[]) => Promise<void>;
  handleBuyCredits: (packId: string) => Promise<void>;
  handleSpin: () => Promise<void>;
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
