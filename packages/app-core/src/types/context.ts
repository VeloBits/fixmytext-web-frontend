// Shared application context value types.
//
// These describe the tool-groups / favorites / subscription / user state that
// the shell produces (via AppProvider) and injects as props into the federated
// remote surfaces. They live in app-core so both the shell provider and the
// remotes depend on a single shared definition rather than on each other's source.

import type { components } from './openapi';
import type { SidebarChip, ToolDefinition } from './tools';

// ── User ─────────────────────────────────────────────────────────────────────

export type User = components['schemas']['UserResponse'];

// ── Tool groups ───────────────────────────────────────────────────────────────
// User-created named groups of tools, rendered as pinned sections at the top
// of the tool panel. Replaced personas (2026-07-14): the onboarding starter-kit
// pick just seeds the user's first group.

export interface ToolGroupView {
  id: string;
  name: string;
  toolIds: string[];
}

export interface ToolGroupsContextValue {
  groups: ToolGroupView[];
  /** False while a signed-in user's server groups haven't settled yet.
   * Adoption-sensitive UI (onboarding gating) should wait for true. */
  ready: boolean;
  createGroup: (name: string, toolIds?: string[]) => void;
  renameGroup: (groupId: string, name: string) => void;
  deleteGroup: (groupId: string) => void;
  addToolToGroup: (groupId: string, toolId: string) => void;
  removeToolFromGroup: (groupId: string, toolId: string) => void;
  /** Replace a group's tools with an explicit ordered list (drag-and-drop:
   * one call covers reorder, insert-at-position, bulk add/remove, and undo). */
  setGroupTools: (groupId: string, toolIds: string[]) => void;
  /** Reorder the groups themselves; array position becomes display order. */
  reorderGroups: (groupIds: string[]) => void;
}

// ── Sidebar chips ─────────────────────────────────────────────────────────────
// The editor sidebar's user-editable navigation row (replaced the
// USE_CASE_TABS category tabs, 2026-07-22). Produced by useSidebarChips in the
// shell's AppProvider and threaded into the editor remote.

export interface SidebarChipsContextValue {
  /** The resolved row: the user's customized list, or the default four views. */
  chips: SidebarChip[];
  /** True once persistence has settled (guests immediately, signed-in after
   * the ui-settings fetch) - chip-editing UI should wait for it. */
  ready: boolean;
  /** True when the user has customized the row (a reset target exists). */
  isCustomized: boolean;
  addChip: (chip: SidebarChip) => void;
  /** No-op for view:all - the escape-hatch chip is not removable. */
  removeChip: (chip: SidebarChip) => void;
  moveChip: (from: number, to: number) => void;
  /** Full replace (reorder / undo-restore). Must keep view:all present. */
  setChips: (chips: SidebarChip[]) => void;
  /** Back to the default row (clears the customization). */
  resetChips: () => void;
}

// ── Favorites ─────────────────────────────────────────────────────────────────

export interface FavoritesContextValue {
  favorites: string[];
  toggleFavorite: (toolId: string) => void;
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
  /** Base free uses per tool per day (server-driven; login bonus not included). */
  freeUsesPerTool: number;
  /** When the current Pro period ends (ISO string; null when not Pro). */
  proExpiresAt: string | null;
  /** True when Pro is cancelled but access continues until proExpiresAt. */
  proCancelled: boolean;
  getToolUsage: (toolId: string) => ToolUsage;
  checkToolAccess: (tool: ToolDefinition | null | undefined) => boolean;
  /** Server said 402 for this tool: open the upsell modal and resync counters. */
  notifyBlocked: (tool: ToolDefinition) => void;
  showUpgradeModal: boolean;
  dismissUpgradeModal: () => void;
  blockedTool: ToolDefinition | null;
  handleUpgrade: () => Promise<void>;
  handleCancelSubscription: () => Promise<void>;
  upgradeLoading: boolean;
  cancelLoading: boolean;
  // from usePasses spread
  activePasses: components['schemas']['ActivePass'][];
  activeCredits: components['schemas']['ActiveCredit'][];
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
  /** True while signed in but the first /auth/me fetch hasn't settled (user is
   * still null). Identity UI (avatar, name) should treat this as loading, not
   * as a guest. Optional so existing mock/context builders stay valid. */
  userResolving?: boolean;
  toolGroups: ToolGroupsContextValue;
  favorites: FavoritesContextValue;
  sidebarChips: SidebarChipsContextValue;
  subscription: SubscriptionContextValue;
}
