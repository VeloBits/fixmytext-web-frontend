/**
 * Type definitions for the FixMyText tool catalog.
 * Derived from the actual shape of src/constants/tools.js.
 */

// ── Group IDs ────────────────────────────────────────────
/** All 14 valid tool group identifiers. */
export type ToolGroup =
  | 'case'
  | 'cleanup'
  | 'lines'
  | 'encoding'
  | 'escaping'
  | 'hashing'
  | 'ciphers'
  | 'developer'
  | 'ai_writing'
  | 'ai_content'
  | 'language'
  | 'compare'
  | 'generate'
  | 'utility';

// ── Tool Types ────────────────────────────────────────────
/**
 * Discriminant for how a tool is invoked:
 *   api    – calls a backend endpoint via RTK Query
 *   ai     – calls an AI handler function
 *   local  – runs a local (in-browser) handler function
 *   drawer – opens a side-panel / drawer component
 *   select – renders a dropdown selector before executing
 */
export type ToolType = 'api' | 'ai' | 'local' | 'drawer' | 'select';

// ── Tab IDs ───────────────────────────────────────────────
/** Valid USE_CASE_TABS identifiers that tools can belong to. */
export type ToolTab = 'all' | 'writing' | 'transform' | 'code' | 'ai' | 'language' | 'encode';

// ── Sidebar chips ─────────────────────────────────────────
// The editor's sidebar navigation (2026-07-22): a user-editable ordered row of
// chips replacing the USE_CASE_TABS category tabs. A chip is either a smart
// view or a filter on one group. Persisted per-account as
// ui-settings.sidebar_chips; [] there means "never customized".

/** Smart-view identifiers — the default chip row. */
export type SidebarViewId = 'all' | 'pinned' | 'recent' | 'suggested';

export type SidebarChipType = 'view' | 'group' | 'custom_group';

/**
 * One sidebar chip. `id` is a SidebarViewId for 'view', a ToolGroup id for
 * 'group', and a user_tool_groups UUID (or local- id pre-adoption) for
 * 'custom_group'. Shape mirrors the backend SidebarChipItem schema.
 */
export interface SidebarChip {
  type: SidebarChipType;
  id: string;
}

/** A smart-view entry from SIDEBAR_VIEWS. */
export interface SidebarView {
  id: SidebarViewId;
  label: string;
}

// ── Color tokens ─────────────────────────────────────────
/** Color strings observed across the full tool catalog. */
export type ToolColor =
  | 'violet'
  | 'blush'
  | 'teal'
  | 'indigo'
  | 'emerald'
  | 'sky'
  | 'skyblue'
  | 'green'
  | 'pink'
  | 'orange'
  | 'purple'
  | 'amber'
  | 'rose';

// ── Select option tuple ───────────────────────────────────
/** [value, displayLabel] tuple used in `options` arrays on select-type tools. */
export type SelectOption = [string, string];

// ── ToolDefinition ────────────────────────────────────────
/**
 * Canonical shape for a single tool object in the TOOLS catalog.
 *
 * Required properties are present on every tool.
 * Optional properties are conditional on the `type` discriminant:
 *
 *   type === 'api'
 *     endpoint (string)  – API path from ENDPOINTS
 *     successMsg (string) – toast text shown on success
 *
 *   type === 'local' | 'ai'
 *     handlerKey (string) – function name on the handler map
 *
 *   type === 'drawer'
 *     panelId (string)   – identifies which drawer/panel to open
 *
 *   type === 'select'
 *     handlerKey (string)
 *     selectKey  (string) – state key holding current selection
 *     setterKey  (string) – state setter function key
 *     options    (SelectOption[]) – dropdown choices
 *
 * Some select-type tools also carry handlerKey (all of them do).
 * Some ai-type tools also omit handlerKey in principle, but in practice
 * every 'ai' tool in the catalog has one — keeping it optional covers edge cases.
 */
export interface ToolDefinition {
  // ── Always present ──────────────────────────────────────
  /** Unique kebab/snake_case identifier. */
  id: string;
  /** Human-readable display name shown in the UI. */
  label: string;
  /** One-line description shown in tooltips and search results. */
  description: string;
  /** Short icon string (2–4 chars) rendered in the tool button. */
  icon: string;
  /** Color token used to style the tool button. */
  color: ToolColor;
  /** Group this tool belongs to; must be one of the 14 TOOL_GROUPS ids. */
  group: ToolGroup;
  /** Use-case tabs this tool appears in. */
  tabs: ToolTab[];
  /** Determines how the tool is invoked. */
  type: ToolType;
  /** Search keywords for the tool search/suggest system. */
  keywords: string[];

  // ── api type ────────────────────────────────────────────
  /** Backend API path (from ENDPOINTS). Required when type === 'api'. */
  endpoint?: string;
  /** Toast message displayed on successful API call. Required when type === 'api'. */
  successMsg?: string;

  // ── local | ai | select type ────────────────────────────
  /** Handler function name on the handlers map. Required for local, ai, and select types. */
  handlerKey?: string;

  // ── drawer type ─────────────────────────────────────────
  /** Panel/drawer identifier to open. Required when type === 'drawer'. */
  panelId?: string;

  // ── select type ─────────────────────────────────────────
  /** State key holding the currently selected option value. Required when type === 'select'. */
  selectKey?: string;
  /** State setter function key. Required when type === 'select'. */
  setterKey?: string;
  /** Available options for the select dropdown. Required when type === 'select'. */
  options?: SelectOption[];
}

// ── Supplementary catalog types ───────────────────────────

/** A tool group entry from TOOL_GROUPS. */
export interface ToolGroup_ {
  id: ToolGroup;
  label: string;
}

/** A use-case tab entry from USE_CASE_TABS. */
export interface UseCaseTab {
  id: ToolTab;
  label: string;
  icon: string;
  color: string;
}

/** Valid starter-kit keys — literal union (not derived from STARTER_KITS) to avoid a types→tools import cycle. */
export type StarterKitId = 'writer' | 'student' | 'developer' | 'social' | 'explorer';

/** A starter-kit entry from STARTER_KITS: an onboarding card whose pick seeds
 * the user's first custom tool group (replaced personas, 2026-07-14). */
export interface StarterKit {
  id: StarterKitId;
  label: string;
  icon: string;
  /** Name of the custom group the kit creates. Empty string = the kit creates
   * nothing (explorer). Must stay in sync with backend migration 0004 seeds. */
  groupName: string;
  /** Tool ids seeded into the created group. */
  toolIds: string[];
}

/** A smart-suggestion rule that maps a text-detection function to tool IDs. */
export interface SmartSuggestionRule {
  test: (text: string) => boolean;
  toolIds: string[];
}

/** A single tool-use operation record (e.g. the analytics recent-activity list). */
export interface QuestOp {
  id?: string;
  tab?: string;
  isNew?: boolean;
  time?: number;
}
