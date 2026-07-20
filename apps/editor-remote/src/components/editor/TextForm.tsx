import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  lazy,
  Suspense,
  type ReactNode,
  type Ref,
  type RefObject,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransformTextMutation } from '@velobits/app-core/store/api/textApi';
import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
import {
  useGetHistoryQuery,
  useDeleteHistoryEntryMutation,
  useClearHistoryMutation,
} from '@velobits/app-core/store/api/historyApi';
import {
  useGetUiSettingsQuery,
  useUpdateUiSettingsMutation,
} from '@velobits/app-core/store/api/userDataApi';
import { TOOLS, USE_CASE_TABS } from '@velobits/app-core/constants/tools';
import type { ToolDefinition, ToolTab } from '@velobits/app-core/types/tools';
import type {
  FavoritesContextValue,
  ToolGroupsContextValue,
} from '@velobits/app-core/types/context';
import { ENDPOINTS } from '@velobits/app-core/constants/endpoints';
import { ROUTES } from '@velobits/app-core/constants';
import {
  BarChart3Icon,
  CornerUpLeftIcon,
  CornerUpRightIcon,
  FileTextIcon,
  HeartIcon,
  HistoryIcon,
  CommandIcon,
  KeyboardIcon,
  LayoutTemplateIcon,
  LogInIcon,
  LogOutIcon,
  MoonIcon,
  SunIcon,
  XIcon,
  ZapIcon,
} from '@velobits/design-system';

// Hooks
import useFindReplace from '@/hooks/useFindReplace';
import useTextCompare from '@/hooks/useTextCompare';
import useGenerators from '@/hooks/useGenerators';
import useFormatter from '@/hooks/useFormatter';
import useAiTools, { type AiResult } from '@/hooks/useAiTools';
import useSpeech from '@/hooks/useSpeech';
import useExport from '@/hooks/useExport';
import useRegexTester from '@/hooks/useRegexTester';
import useTemplates from '@/hooks/useTemplates';
import useHistory from '@velobits/app-core/hooks/useHistory';
import useWordFrequency from '@/hooks/useWordFrequency';
import usePipeline from '@/hooks/usePipeline';
import useSmartSuggestions from '@/hooks/useSmartSuggestions';
import useToolSearch from '@/hooks/useToolSearch';
import useResize from '@/hooks/useResize';
import useMediaQuery from '@/hooks/useMediaQuery';
import useTrialLimit from '@velobits/app-core/hooks/useTrialLimit';
import useDrawerState from '@/hooks/useDrawerState';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import useHashTools from '@/hooks/useHashTools';
import useClientTools from '@/hooks/useClientTools';

// Components
import ToolPanel from './ToolPanel';
import ToolIcon from '@velobits/app-core/components/editor/ToolIcon';
import OutputPanel from './OutputPanel';
import ParagraphGutter from './ParagraphGutter';

// Same groups OutputPanel treats as prose-style (paragraph numbering, etc.).
const PROSE_GROUPS = new Set(['ai_writing', 'ai_content', 'language', 'cleanup', 'case', 'lines']);
import TabBar from './TabBar';
import DrawerPanel from '@/components/drawers/DrawerPanel';
import FmtConfigBar from './FmtConfigBar';

// Drawers are lazy-loaded — each only renders when its panel/tab is active,
// so pulling them out of the main bundle has no UX cost beyond a one-shot
// chunk fetch the first time a user opens that particular drawer.
//
// Named exports use the .then(m => ({ default: m.X })) shim because
// React.lazy only understands default exports.
const FindReplaceDrawer = lazy(() => import('../drawers/FindReplaceDrawer'));
const CompareOutput = lazy(() => import('../drawers/CompareDrawer'));
const CompareInput = lazy(() =>
  import('../drawers/CompareDrawer').then((m) => ({ default: m.CompareInput }))
);
const RandomTextDrawer = lazy(() =>
  import('../drawers/GeneratorDrawer').then((m) => ({ default: m.RandomTextDrawer }))
);
const PasswordDrawer = lazy(() =>
  import('../drawers/GeneratorDrawer').then((m) => ({ default: m.PasswordDrawer }))
);
const RegexDrawer = lazy(() => import('../drawers/RegexDrawer'));
const WrapLinesDrawer = lazy(() =>
  import('../drawers/LineToolsDrawer').then((m) => ({ default: m.WrapLinesDrawer }))
);
const FilterLinesDrawer = lazy(() =>
  import('../drawers/LineToolsDrawer').then((m) => ({ default: m.FilterLinesDrawer }))
);
const TruncateLinesDrawer = lazy(() =>
  import('../drawers/LineToolsDrawer').then((m) => ({ default: m.TruncateLinesDrawer }))
);
const NthLineDrawer = lazy(() =>
  import('../drawers/LineToolsDrawer').then((m) => ({ default: m.NthLineDrawer }))
);
const TemplatesDrawer = lazy(() => import('../drawers/TemplatesDrawer'));
const HistoryDrawer = lazy(() => import('../drawers/HistoryDrawer'));
const CipherDrawer = lazy(() => import('../drawers/CipherDrawer'));
const DiffDrawer = lazy(() => import('../drawers/DiffDrawer'));
const FakeDataDrawer = lazy(() => import('../drawers/FakeDataDrawer'));
const JsonPathDrawer = lazy(() =>
  import('../drawers/DevToolsDrawer').then((m) => ({ default: m.JsonPathDrawer }))
);
const MarkdownPreviewDrawer = lazy(() =>
  import('../drawers/DevToolsDrawer').then((m) => ({ default: m.MarkdownPreviewDrawer }))
);
const LoremIpsumDrawer = lazy(() =>
  import('../drawers/DevToolsDrawer').then((m) => ({ default: m.LoremIpsumDrawer }))
);
const SampleJsonDrawer = lazy(() =>
  import('../drawers/DevToolsDrawer').then((m) => ({ default: m.SampleJsonDrawer }))
);

// Tiny wrapper so each lazy drawer call site stays a single JSX expression.
// fallback={null} keeps the drawer slot empty during the (typically <100ms)
// chunk fetch — drawers are user-initiated, so a flash of empty space is
// less jarring than a spinner that disappears almost immediately.
function LazyDrawer({ children }: { children: ReactNode }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
import SmartSuggestions from './SmartSuggestions';
import BottomPanel from './BottomPanel';
import { noopNotice } from './noopNotice';
import CommandPalette from '@/components/layout/CommandPalette';
import KeyboardShortcuts from '@/components/layout/KeyboardShortcuts';

// SVG icons for activity bar (module-level constant — avoids recreation on every render)
const ACTIVITY_ICONS = {
  all: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  ),
  writing: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  ),
  transform: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  ),
  code: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  ai: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
      <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
      <circle cx="9" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6.5" r="0.8" fill="currentColor" stroke="none" />
    </svg>
  ),
  language: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  encode: (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
};

// Drawer panel metadata (static — no need to recreate per render)
const DRAWERS = {
  find: { title: 'Find & Replace', color: 'teal' },
  compare: { title: 'Text Compare', color: 'purple' },
  randtext: { title: 'Random Text Generator', color: 'amber' },
  password: { title: 'Password Generator', color: 'amber' },
  regex: { title: 'Regex Tester', color: 'teal' },
  templates: { title: 'Text Templates', color: 'amber' },
  history: { title: 'History / Undo', color: 'slate' },
  wraplines: { title: 'Wrap Lines', color: 'teal' },
  filterlines: { title: 'Keep Lines', color: 'teal' },
  droplines: { title: 'Drop Lines', color: 'teal' },
  truncatelines: { title: 'Truncate Lines', color: 'teal' },
  nthlines: { title: 'Every Nth Line', color: 'teal' },
};

/* Tab bar component extracted to ./TabBar.jsx */

interface WorkspaceTab {
  id: string;
  label: string;
  icon?: string;
  type: string;
  tool?: {
    id: string;
    color?: string;
    type?: string;
    label?: string;
    icon?: string;
    endpoint?: string;
    successMsg?: string;
    selectKey?: string;
    setterKey?: string;
    options?: Array<[string, string]>;
    panelId?: string;
    handlerKey?: string;
    group?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
  panelId?: string;
  color?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>;

interface TextFormProps {
  showAlert: (msg: string, type: string) => void;
  toolGroups: ToolGroupsContextValue;
  favorites: FavoritesContextValue;
  user: AnyRecord | null;
  isAuthenticated: boolean;
  mode: string;
  setMode: (mode: string) => void;
  subscription?: AnyRecord | null;
}

/**
 * Main editor orchestrator component.
 * Manages workspace tabs, tool execution, text state per tab, drawer panels,
 * keyboard shortcuts, and coordinates between all editor sub-components
 * (ToolPanel, OutputPanel, TabBar, drawers, etc.).
 *
 * @param {object} props
 * @param {function} props.showAlert - Alert notification callback.
 * @param {object} props.toolGroups - Custom tool groups state.
 * @param {object} props.favorites - Favorites state.
 * @param {object|null} props.user - Current user object.
 * @param {boolean} props.isAuthenticated - Whether user is authenticated.
 * @param {string} props.mode - Current theme mode.
 * @param {function} props.setMode - Theme mode setter.
 * @param {object} props.subscription - Subscription hook state.
 */
export default function TextForm(props: TextFormProps) {
  const [toolTexts, setToolTexts] = useState<Record<string, string>>({});
  const [dyslexiaMode, setDyslexiaMode] = useState(false);
  const [markdownMode, setMarkdownMode] = useState(false);
  const { activePanel, setActivePanel, togglePanel } = useDrawerState();
  const [previewMode, setPreviewMode] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string | null>('all');
  // Must match the mobile breakpoint in editor.css — inline resize sizes would
  // otherwise override the media query and collapse the layout on small screens
  const isMobile = useMediaQuery('(max-width: 768px)');
  // Desktop: sidebar visible by default; mobile: it's a bottom sheet, start closed
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolViewMode, setToolViewMode] = useState(
    () => localStorage.getItem('fmx_tool_view') || 'grid'
  );
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);
  useEffect(() => {
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);
  // Mobile: picking a tool opens a workspace — dismiss the sheet so the editor shows
  useEffect(() => {
    if (isMobile && activeWorkspaceId) setSidebarOpen(false);
  }, [isMobile, activeWorkspaceId]);
  const [toolResults, setToolResults] = useState<Record<string, unknown>>({}); // keyed by tab ID, not tool ID
  const [inputScrollTop, setInputScrollTop] = useState(0);
  const aiResultSourceRef = useRef<string | null>(null); // tracks which toolId/panelId produced the current ai.aiResult
  const lastTextPerTab = useRef<Record<string, string>>({}); // tracks last input text per tab for debounce
  const [, setSavedTabs] = useState<Record<string, boolean>>({});
  const [saveModal, setSaveModal] = useState<{ tabId: string; defaultName: string } | null>(null); // { tabId, defaultName }

  // Per-tool text: derived from the active workspace tab
  const activeTabIdRef = useRef<string | null>(null);
  activeTabIdRef.current = activeWorkspaceId;
  const text = (activeWorkspaceId ? toolTexts[activeWorkspaceId] : '') || '';
  const setText = useCallback((valOrFn: string | ((prev: string) => string)) => {
    const tabId = activeTabIdRef.current;
    if (!tabId) return;
    setToolTexts((prev) => {
      const oldVal = prev[tabId] || '';
      const newVal = typeof valOrFn === 'function' ? valOrFn(oldVal) : valOrFn;
      return { ...prev, [tabId]: newVal };
    });
    // Mark as unsaved when text changes
    setSavedTabs((prev) => (prev[tabId] ? { ...prev, [tabId]: false } : prev));
  }, []);
  const sharedTextRef = useRef<string | null>(null);
  const pendingAutoRun = useRef<ToolDefinition | null>(null);
  const selectValueRef = useRef<string | null>(null); // holds the freshly-clicked value for select tools

  const showAlert = props.showAlert;
  const navigate = useNavigate();
  const { isAuthenticated, logout: oidcLogout } = useOidcAuth();

  const handleLogout = async () => {
    try {
      await oidcLogout();
      showAlert('Logged out', 'success');
      navigate(ROUTES.HOME);
    } catch {
      showAlert('Logout failed', 'danger');
    }
  };

  // ── RTK Query mutation ──────────────────────────────────
  const [transformText, { isLoading: rtkLoading }] = useTransformTextMutation();
  const [localLoading, setLocalLoading] = useState(false);
  const loading = rtkLoading || localLoading;

  // ── Hooks ───────────────────────────────────────────────
  const findReplace = useFindReplace(text, setText, showAlert);
  const compare = useTextCompare(text, showAlert);
  const generators = useGenerators(setText, showAlert);
  const formatter = useFormatter(text, setLocalLoading, showAlert, (label, result) => {
    const toolId = activeWorkspaceId?.replace('tool-', '') || null;
    aiResultSourceRef.current = toolId;
    ai.setAiResult({ label, result });
    setPreviewMode('result');
    history.pushHistory(label, text, result, { toolType: 'local' });
  });
  const history = useHistory(setText, showAlert);
  // Server-authoritative 402 (daily quota exhausted): open the pass-purchase
  // upsell for signed-in users; guests get a sign-in prompt instead. The
  // client-side counter gate can desync from the server — the server verdict
  // always wins here.
  const handleToolBlocked = useCallback(
    (toolId: string): void => {
      const tool = TOOLS.find((t) => t.id === toolId);
      if (isAuthenticated && tool && props.subscription?.notifyBlocked) {
        props.subscription.notifyBlocked(tool);
        return;
      }
      showAlert(
        isAuthenticated
          ? 'Daily limit reached for this tool. Get a pass or go Pro for more uses.'
          : 'Daily free limit reached — sign in for an extra free use, or get a pass.',
        'warning'
      );
    },
    [isAuthenticated, props.subscription, showAlert]
  );
  const ai = useAiTools(
    text,
    setText,
    setMarkdownMode,
    setPreviewMode,
    showAlert,
    history.pushHistory,
    handleToolBlocked
  ) as ReturnType<typeof useAiTools> & Record<string, unknown>;
  const speech = useSpeech(text, setText, showAlert);
  const exportTools = useExport(setLocalLoading, showAlert);
  const regex = useRegexTester(text, showAlert);
  const templateHelpersRef = useRef<{
    getActiveToolId: () => string | null;
    openToolById: (toolId: string | null, text: string) => void;
    renameActiveTab: (name: string) => void;
  }>({ getActiveToolId: () => null, openToolById: () => {}, renameActiveTab: () => {} });
  const templates = useTemplates(text, setText, showAlert, {
    getActiveToolId: () => templateHelpersRef.current.getActiveToolId(),
    openToolById: (toolId, content) => templateHelpersRef.current.openToolById(toolId, content),
    renameActiveTab: (name) => templateHelpersRef.current.renameActiveTab(name),
  });
  const wordFreq = useWordFrequency(
    text,
    showAlert,
    ai.setAiResult,
    setPreviewMode,
    history.pushHistory
  );
  const toolGroups = props.toolGroups;
  const favorites = props.favorites;
  const pipeline = usePipeline();
  const suggestions = useSmartSuggestions(text);
  const search = useToolSearch();
  const trial = useTrialLimit(props.isAuthenticated);
  const subscription = props.subscription;

  // ── Persistent history (server-side) ─────────────────────
  const [historyView, setHistoryView] = useState('session'); // 'session' | 'saved'
  const [historyPage, setHistoryPage] = useState(1);
  const { data: serverHistory, isFetching: historyFetching } = useGetHistoryQuery(
    { page: historyPage, pageSize: 25 },
    { skip: !isAuthenticated || historyView !== 'saved' }
  );
  const [deleteHistoryEntry] = useDeleteHistoryEntryMutation();
  const [clearServerHistory] = useClearHistoryMutation();

  // ── UI Settings (tool_view + panel sizes synced to server) ──
  const { data: uiSettings } = useGetUiSettingsQuery(undefined, { skip: !isAuthenticated });
  const [updateUiSettings] = useUpdateUiSettingsMutation();
  const uiSettingsHydrated = useRef(false);

  // Resizable panels
  const splitRef = useRef<HTMLElement>(null);
  const gutterRef = useRef<HTMLElement>(null);
  const textRef = useRef<string>(text);
  textRef.current = text;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Extracted tool hooks (must be after textRef is defined) ──
  const hashTools = useHashTools({
    textRef,
    setLocalLoading,
    setAiResult: ai.setAiResult,
    setPreviewMode,
    pushHistory: history.pushHistory,
    showAlert,
  });
  const clientTools = useClientTools({
    textRef,
    setToolResults: setToolResults as (
      fn: (prev: Record<string, string>) => Record<string, string>
    ) => void,
    setPreviewMode,
    setLocalLoading,
    showAlert,
    activeWorkspaceId: activeWorkspaceId ?? '',
    setAiResult: ai.setAiResult,
    pushHistory: history.pushHistory,
  });
  const sidebarResize = useResize('horizontal', 240, {
    min: 160,
    max: 480,
    storageKey: 'fmx_sidebar_w',
  });
  const splitResize = useResize('horizontal', 50, {
    min: 20,
    max: 80,
    storageKey: 'fmx_split_pct',
    unit: 'percent',
    containerRef: splitRef as unknown as RefObject<HTMLElement>,
  });
  const bottomResize = useResize('vertical', 200, {
    min: 80,
    max: 500,
    storageKey: 'fmx_bottom_h',
  });

  // Hydrate tool_view and panel sizes from server on login
  useEffect(() => {
    if (uiSettings && !uiSettingsHydrated.current) {
      uiSettingsHydrated.current = true;
      if (uiSettings.tool_view) {
        setToolViewMode(uiSettings.tool_view);
        localStorage.setItem('fmx_tool_view', uiSettings.tool_view);
      }
      const ps = uiSettings.panel_sizes || {};
      if (ps.fmx_sidebar_w) {
        localStorage.setItem('fmx_sidebar_w', String(ps.fmx_sidebar_w));
        sidebarResize.setSize(Number(ps.fmx_sidebar_w));
      }
      if (ps.fmx_split_pct) {
        localStorage.setItem('fmx_split_pct', String(ps.fmx_split_pct));
        splitResize.setSize(Number(ps.fmx_split_pct));
      }
      if (ps.fmx_bottom_h) {
        localStorage.setItem('fmx_bottom_h', String(ps.fmx_bottom_h));
        bottomResize.setSize(Number(ps.fmx_bottom_h));
      }
    }
  }, [uiSettings, sidebarResize, splitResize, bottomResize]);

  useEffect(() => {
    if (!isAuthenticated) uiSettingsHydrated.current = false;
  }, [isAuthenticated]);

  // Sync panel sizes to server when authenticated (debounced)
  const panelSizeSyncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const syncPanelSizes = useCallback(
    (updates: Record<string, number>) => {
      if (!isAuthenticated) return;
      clearTimeout(panelSizeSyncTimer.current);
      panelSizeSyncTimer.current = setTimeout(() => {
        updateUiSettings({ panel_sizes: updates })
          .unwrap()
          .catch(() => {});
      }, 800);
    },
    [isAuthenticated, updateUiSettings]
  );

  // Watch panel sizes and sync to server
  useEffect(() => {
    if (!isAuthenticated || !uiSettingsHydrated.current) return;
    syncPanelSizes({
      fmx_sidebar_w: sidebarResize.size,
      fmx_split_pct: splitResize.size,
      fmx_bottom_h: bottomResize.size,
    });
  }, [isAuthenticated, syncPanelSizes, sidebarResize.size, splitResize.size, bottomResize.size]);

  // The shell dispatches this right after a starter-kit pick so the editor
  // lands on the kit's tab. Transient by design — nothing is persisted, and
  // it only ever fires from the onboarding modal.
  useEffect(() => {
    const onKitTab = (e: Event) => {
      const tab = (e as CustomEvent<{ tab?: string }>).detail?.tab;
      if (tab) setActiveTab(tab);
    };
    window.addEventListener('fmx:onboarding-tab', onKitTab);
    return () => window.removeEventListener('fmx:onboarding-tab', onKitTab);
  }, []);

  // Capture AI results per-tab for persistence
  // Keyed by tab ID so each tab is fully independent
  useEffect(() => {
    if (ai.aiResult && activeWorkspaceId) {
      const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
      if (!ws) return;
      // Only persist if this result belongs to the active tab
      const expectedSource = ws.type === 'tool' ? ws.tool?.id : ws.panelId;
      if (aiResultSourceRef.current === expectedSource) {
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId as string]: ai.aiResult }));
      }
    }
  }, [ai.aiResult, activeWorkspaceId, workspaceTabs]);

  const closeWorkspaceTab = (tabId: string) => {
    setWorkspaceTabs((tabs) => {
      const remaining = tabs.filter((t) => t.id !== tabId);
      if (activeWorkspaceId === tabId) {
        const newActive = remaining.length > 0 ? remaining[remaining.length - 1] : null;
        setActiveWorkspaceId(newActive?.id || null);
        setActivePanel(newActive?.type === 'drawer' ? (newActive.panelId ?? null) : null);
      }
      return remaining;
    });
    // Clean up per-tab text
    setToolTexts((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    // Clean up per-tab result
    setToolResults((prev) => {
      const next = { ...prev };
      delete next[tabId];
      return next;
    });
    // Clean up per-tab text tracking
    if (lastTextPerTab.current[tabId] !== undefined) {
      delete lastTextPerTab.current[tabId];
    }
  };

  // ── URL shared text decode on mount ─────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get('t');
    if (shared) {
      try {
        sharedTextRef.current = decodeURIComponent(atob(shared));
      } catch {
        /* ignore invalid shared text */
      }
    }
  }, []);

  // ── Generic API handler (RTK Query) ─────────────────────
  const callApi = useCallback(
    async (endpoint: string, successMsg: string, toolMeta?: Record<string, unknown>) => {
      const t = textRef.current;
      // Whitespace-only input is not runnable (backend rejects it with 422 and it
      // must never burn a free use). Prompt only when something was typed —
      // fully-empty input keeps the silent no-op so tab-switch auto-runs stay quiet.
      if (!t.trim()) {
        if (t) showAlert('Please enter some text', 'warning');
        return;
      }
      const original = t;
      try {
        const data = await transformText({ endpoint, text: t }).unwrap();
        if (toolMeta?.toolId) aiResultSourceRef.current = toolMeta.toolId as string;
        ai.setAiResult({ label: successMsg, result: data.result });
        setPreviewMode('result');
        history.pushHistory(successMsg, original, data.result, toolMeta);
        const notice = noopNotice(original, data.result, toolMeta?.toolGroup as string | undefined);
        showAlert(notice ?? successMsg, notice ? 'info' : 'success');
        return { success: true, result: data.result };
      } catch (err) {
        if ((err as { status?: number }).status === 402) {
          handleToolBlocked((toolMeta?.toolId as string) || '');
          return { success: false };
        }
        const detail = (err as { data?: { detail?: unknown } }).data?.detail;
        const message =
          typeof detail === 'string'
            ? detail
            : (detail as { message?: string } | null)?.message ||
              'Something went wrong. Please try again.';
        showAlert(message, 'danger');
        return { success: false };
      }
    },
    [transformText, ai, history, showAlert, handleToolBlocked]
  );

  // ── Generic API handler with extra params (for drawer tools) ──
  const callApiWithParams = async (
    endpoint: string,
    successMsg: string,
    extraParams: Record<string, unknown>,
    toolMeta?: Record<string, unknown>
  ) => {
    const t = textRef.current;
    if (!t.trim()) {
      if (t) showAlert('Please enter some text', 'warning');
      return;
    }
    const original = t;
    try {
      const data = await transformText({ endpoint, text: t, ...extraParams }).unwrap();
      if (toolMeta?.toolId) aiResultSourceRef.current = toolMeta.toolId as string;
      ai.setAiResult({ label: successMsg, result: data.result });
      setPreviewMode('result');
      history.pushHistory(successMsg, original, data.result, toolMeta);
      const notice = noopNotice(original, data.result, toolMeta?.toolGroup as string | undefined);
      showAlert(notice ?? successMsg, notice ? 'info' : 'success');
      return { success: true, result: data.result };
    } catch (err) {
      if ((err as { status?: number }).status === 402) {
        handleToolBlocked((toolMeta?.toolId as string) || '');
        return { success: false };
      }
      const detail = (err as { data?: { detail?: unknown } }).data?.detail;
      const message =
        typeof detail === 'string'
          ? detail
          : (detail as { message?: string } | null)?.message ||
            'Something went wrong. Please try again.';
      showAlert(message, 'danger');
      return { success: false };
    }
  };

  // ── Clipboard ───────────────────────────────────────────
  const handleClear = () => {
    setText('');
    ai.setAiResult(null);
    setPreviewMode(null);
    showAlert('Text cleared', 'success');
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(textRef.current);
    showAlert('Copied to clipboard', 'success');
  };
  const handlePaste = () => {
    navigator.clipboard.readText().then((t) => {
      setText((prev) => prev + t);
      const ws = workspaceTabs.find((tab) => tab.id === activeWorkspaceId);
      if (ws?.type === 'tool') setTimeout(() => executeToolAction(ws.tool as ToolDefinition), 150);
    });
    showAlert('Pasted from clipboard', 'success');
  };
  const handleClearPaste = () => {
    navigator.clipboard.readText().then((t) => {
      setText(t);
      const ws = workspaceTabs.find((tab) => tab.id === activeWorkspaceId);
      if (ws?.type === 'tool') setTimeout(() => executeToolAction(ws.tool as ToolDefinition), 150);
    });
    showAlert('Cleared and pasted', 'success');
  };

  // ── Encoding ────────────────────────────────────────────
  const handleBase64Encode = useCallback(
    () => callApi(ENDPOINTS.BASE64_ENCODE, 'Base64 encoded'),
    [callApi]
  );
  const handleBase64Decode = useCallback(
    () => callApi(ENDPOINTS.BASE64_DECODE, 'Base64 decoded'),
    [callApi]
  );
  const handleUrlEncode = useCallback(
    () => callApi(ENDPOINTS.URL_ENCODE, 'URL encoded'),
    [callApi]
  );
  const handleUrlDecode = useCallback(
    () => callApi(ENDPOINTS.URL_DECODE, 'URL decoded'),
    [callApi]
  );
  const handleHexEncode = useCallback(
    () => callApi(ENDPOINTS.HEX_ENCODE, 'Hex encoded'),
    [callApi]
  );
  const handleHexDecode = useCallback(
    () => callApi(ENDPOINTS.HEX_DECODE, 'Hex decoded'),
    [callApi]
  );
  const handleMorseEncode = useCallback(
    () => callApi(ENDPOINTS.MORSE_ENCODE, 'Morse encoded'),
    [callApi]
  );
  const handleMorseDecode = useCallback(
    () => callApi(ENDPOINTS.MORSE_DECODE, 'Morse decoded'),
    [callApi]
  );
  const handleBinaryEncode = useCallback(
    () => callApi(ENDPOINTS.BINARY_ENCODE, 'Binary encoded'),
    [callApi]
  );
  const handleBinaryDecode = useCallback(
    () => callApi(ENDPOINTS.BINARY_DECODE, 'Binary decoded'),
    [callApi]
  );
  const handleOctalEncode = useCallback(
    () => callApi(ENDPOINTS.OCTAL_ENCODE, 'Octal encoded'),
    [callApi]
  );
  const handleOctalDecode = useCallback(
    () => callApi(ENDPOINTS.OCTAL_DECODE, 'Octal decoded'),
    [callApi]
  );
  const handleDecimalEncode = useCallback(
    () => callApi(ENDPOINTS.DECIMAL_ENCODE, 'Decimal encoded'),
    [callApi]
  );
  const handleDecimalDecode = useCallback(
    () => callApi(ENDPOINTS.DECIMAL_DECODE, 'Decimal decoded'),
    [callApi]
  );
  const handleUnicodeEscape = useCallback(
    () => callApi(ENDPOINTS.UNICODE_ESCAPE, 'Unicode escaped'),
    [callApi]
  );
  const handleUnicodeUnescape = useCallback(
    () => callApi(ENDPOINTS.UNICODE_UNESCAPE, 'Unicode unescaped'),
    [callApi]
  );
  const handleAtbash = useCallback(
    () => callApi(ENDPOINTS.ATBASH, 'Atbash cipher applied'),
    [callApi]
  );
  const handleBrainfuckEncode = useCallback(
    () => callApi(ENDPOINTS.BRAINFUCK_ENCODE, 'Brainfuck encoded'),
    [callApi]
  );
  const handleBrainfuckDecode = useCallback(
    () => callApi(ENDPOINTS.BRAINFUCK_DECODE, 'Brainfuck decoded'),
    [callApi]
  );

  // ── Escape / Unescape ───────────────────────────────────
  const handleJsonEscape = useCallback(
    () => callApi(ENDPOINTS.JSON_ESCAPE, 'JSON escaped'),
    [callApi]
  );
  const handleJsonUnescape = useCallback(
    () => callApi(ENDPOINTS.JSON_UNESCAPE, 'JSON unescaped'),
    [callApi]
  );
  const handleHtmlEscape = useCallback(
    () => callApi(ENDPOINTS.HTML_ESCAPE, 'HTML escaped'),
    [callApi]
  );
  const handleHtmlUnescape = useCallback(
    () => callApi(ENDPOINTS.HTML_UNESCAPE, 'HTML unescaped'),
    [callApi]
  );

  // ── Developer Tools ─────────────────────────────────────
  const handleJsonFormat = useCallback(
    () => callApi(ENDPOINTS.FORMAT_JSON, 'JSON formatted'),
    [callApi]
  );
  const handleJsonToYaml = useCallback(
    () => callApi(ENDPOINTS.JSON_TO_YAML, 'Converted to YAML'),
    [callApi]
  );
  const handleCsvToJson = useCallback(
    () => callApi(ENDPOINTS.CSV_TO_JSON, 'CSV converted to JSON'),
    [callApi]
  );
  const handleJsonToCsv = useCallback(
    () => callApi(ENDPOINTS.JSON_TO_CSV, 'JSON converted to CSV'),
    [callApi]
  );

  // ── Accessibility ───────────────────────────────────────
  const handleDyslexiaMode = () => {
    setDyslexiaMode((prev) => {
      const next = !prev;
      showAlert(next ? 'Dyslexia font on' : 'Dyslexia font off', 'info');
      if (next) setPreviewMode('dyslexia');
      else if (previewMode === 'dyslexia') setPreviewMode(null);
      return next;
    });
  };
  const handleMarkdownMode = useCallback(() => {
    setMarkdownMode((prev) => {
      const next = !prev;
      showAlert(next ? 'Markdown preview on' : 'Markdown preview off', 'info');
      if (next) setPreviewMode('markdown');
      else if (previewMode === 'markdown') setPreviewMode(null);
      return next;
    });
  }, [showAlert, previewMode]);

  // ── Local tool handlers extracted to useClientTools & useHashTools hooks ──

  // ── Handler Map (for data-driven tool dispatch) ─────────
  const handlerMap = useMemo(
    () => ({
      handleBase64Encode,
      handleBase64Decode,
      handleUrlEncode,
      handleUrlDecode,
      handleHexEncode,
      handleHexDecode,
      handleMorseEncode,
      handleMorseDecode,
      handleBinaryEncode,
      handleBinaryDecode,
      handleOctalEncode,
      handleOctalDecode,
      handleDecimalEncode,
      handleDecimalDecode,
      handleUnicodeEscape,
      handleUnicodeUnescape,
      handleAtbash,
      handleBrainfuckEncode,
      handleBrainfuckDecode,
      handleMd5: hashTools.handleMd5,
      handleSha1: hashTools.handleSha1,
      handleSha224: hashTools.handleSha224,
      handleSha256: hashTools.handleSha256,
      handleSha384: hashTools.handleSha384,
      handleSha512: hashTools.handleSha512,
      handleSha512_224: hashTools.handleSha512_224,
      handleSha512_256: hashTools.handleSha512_256,
      handleSha3_224: hashTools.handleSha3_224,
      handleSha3_256: hashTools.handleSha3_256,
      handleSha3_384: hashTools.handleSha3_384,
      handleSha3_512: hashTools.handleSha3_512,
      handleKeccak256: hashTools.handleKeccak256,
      handleRipemd160: hashTools.handleRipemd160,
      handleBlake2b: hashTools.handleBlake2b,
      handleBlake2s: hashTools.handleBlake2s,
      handleWhirlpool: hashTools.handleWhirlpool,
      handleCrc32: hashTools.handleCrc32,
      handleAdler32: hashTools.handleAdler32,
      handleFnv1a: hashTools.handleFnv1a,
      handleXxhash: hashTools.handleXxhash,
      handleMurmurHash3: hashTools.handleMurmurHash3,
      handleReverseText: () => callApi(ENDPOINTS.REVERSE, 'Text reversed'),
      handleSortAsc: () => callApi(ENDPOINTS.SORT_LINES_ASC, 'Lines sorted A → Z'),
      handleSortDesc: () => callApi(ENDPOINTS.SORT_LINES_DESC, 'Lines sorted Z → A'),
      handleRemoveDuplicates: () =>
        callApi(ENDPOINTS.REMOVE_DUPLICATE_LINES, 'Duplicate lines removed'),
      handleReverseLines: () => callApi(ENDPOINTS.REVERSE_LINES, 'Lines reversed'),
      handleNumberLines: () => callApi(ENDPOINTS.NUMBER_LINES, 'Lines numbered'),
      handleRot13: () => callApi(ENDPOINTS.ROT13, 'ROT13 applied'),
      handleJsonEscape,
      handleJsonUnescape,
      handleHtmlEscape,
      handleHtmlUnescape,
      handleJsonFormat,
      handleJsonToYaml,
      handleCsvToJson,
      handleJsonToCsv,
      handleJwtDecode: clientTools.handleJwtDecode,
      handleFormatHtml: formatter.handleFormatHtml,
      handleFormatCss: formatter.handleFormatCss,
      handleFormatJs: formatter.handleFormatJs,
      handleFormatTs: formatter.handleFormatTs,
      handleFixGrammar: ai.handleFixGrammar,
      handleParaphrase: ai.handleParaphrase,
      handleProofread: ai.handleProofread,
      handleSummarize: ai.handleSummarize,
      handleEli5: ai.handleEli5,
      handleLengthenText: ai.handleLengthenText,
      handleEmailRewrite: ai.handleEmailRewrite,
      handleTweetShorten: ai.handleTweetShorten,
      handleHashtags: ai.handleHashtags,
      handleSeoTitles: ai.handleSeoTitles,
      handleMetaDescriptions: ai.handleMetaDescriptions,
      handleBlogOutline: ai.handleBlogOutline,
      handleKeywords: ai.handleKeywords,
      handleSentiment: ai.handleSentiment,
      handleGenerateTitle: ai.handleGenerateTitle,
      handleRefactorPrompt: ai.handleRefactorPrompt,
      handleEmojify: ai.handleEmojify,
      handleChangeFormat: ai.handleChangeFormat,
      handleChangeTone: ai.handleChangeTone,
      handleTranslate: ai.handleTranslate,
      handleTransliterate: ai.handleTransliterate,
      handleSplitToLines: ai.handleSplitToLines,
      handleJoinLines: ai.handleJoinLines,
      handlePadLines: ai.handlePadLines,
      handleMarkdownMode,
      handleWordFrequency: wordFreq.handleWordFrequency,
      // New Cipher & Crypto local handlers
      handleFrequencyAnalysis: clientTools.handleFrequencyAnalysis,
      handleCaesarCipher: ai.handleCaesarCipher,
      handleRailFenceEnc: ai.handleRailFenceEnc,
      handleRailFenceDec: ai.handleRailFenceDec,
      // New Developer Tool local handlers
      handleFormatSql: clientTools.handleFormatSql,
      handleFormatXml: clientTools.handleFormatXml,
      handleJsonMinify: clientTools.handleJsonMinify,
      handleJsonToTs: clientTools.handleJsonToTs,
      handleUuidGen: clientTools.handleUuidGen,
      handleTimestampConvert: clientTools.handleTimestampConvert,
      handleColorConvert: clientTools.handleColorConvert,
      handleUlidGen: clientTools.handleUlidGen,
      handleCronExplain: clientTools.handleCronExplain,
      handleHttpHeaderParse: clientTools.handleHttpHeaderParse,
      handleUrlParser: clientTools.handleUrlParser,
      handleCurlToCode: ai.handleCurlToCode,
      // New AI Writing handlers
      handleAcademicStyle: ai.handleAcademicStyle,
      handleCreativeStyle: ai.handleCreativeStyle,
      handleTechnicalStyle: ai.handleTechnicalStyle,
      handleActiveVoice: ai.handleActiveVoice,
      handleRedundancyRemover: ai.handleRedundancyRemover,
      handleSentenceSplitter: ai.handleSentenceSplitter,
      handleConciseness: ai.handleConciseness,
      handleResumeBullets: ai.handleResumeBullets,
      handleMeetingNotes: ai.handleMeetingNotes,
      handleCoverLetter: ai.handleCoverLetter,
      handleOutlineToDraft: ai.handleOutlineToDraft,
      handleContinueWriting: ai.handleContinueWriting,
      handleRewriteUnique: ai.handleRewriteUnique,
      handleToneAnalyzer: ai.handleToneAnalyzer,
      // New AI Content handlers
      handleLinkedinPost: ai.handleLinkedinPost,
      handleTwitterThread: ai.handleTwitterThread,
      handleInstagramCaption: ai.handleInstagramCaption,
      handleYoutubeDesc: ai.handleYoutubeDesc,
      handleSocialBio: ai.handleSocialBio,
      handleProductDesc: ai.handleProductDesc,
      handleCtaGenerator: ai.handleCtaGenerator,
      handleAdCopy: ai.handleAdCopy,
      handleLandingHeadline: ai.handleLandingHeadline,
      handleEmailSubject: ai.handleEmailSubject,
      handleContentIdeas: ai.handleContentIdeas,
      handleHookGenerator: ai.handleHookGenerator,
      handleAngleGenerator: ai.handleAngleGenerator,
      handleFaqSchema: ai.handleFaqSchema,
      handleSlugGenerator: clientTools.handleSlugGenerator,
      // New Language handlers
      handlePosTagger: ai.handlePosTagger,
      handleSentenceType: ai.handleSentenceType,
      handleGrammarExplain: ai.handleGrammarExplain,
      handleSynonymFinder: ai.handleSynonymFinder,
      handleAntonymFinder: ai.handleAntonymFinder,
      handleDefineWords: ai.handleDefineWords,
      handleWordPower: ai.handleWordPower,
      handleReadingLevel: clientTools.handleReadingLevel,
      handleVocabComplexity: ai.handleVocabComplexity,
      handleJargonSimplifier: ai.handleJargonSimplifier,
      handleFormalityDetector: ai.handleFormalityDetector,
      handleClicheDetector: ai.handleClicheDetector,
      // New Generator handlers
      handleNanoidGen: clientTools.handleNanoidGen,
      handleTimestampGen: clientTools.handleTimestampGen,
      handleUsernameGen: clientTools.handleUsernameGen,
      handlePlaceholderImg: clientTools.handlePlaceholderImg,
      handleRegexGen: ai.handleRegexGen,
      handleWritingPrompt: ai.handleWritingPrompt,
      handleTeamNameGen: ai.handleTeamNameGen,
      handleMockApiResponse: ai.handleMockApiResponse,
      // New Utility handlers
      handleReadingTime: clientTools.handleReadingTime,
      handleCharCount: clientTools.handleCharCount,
      handleTextStats: clientTools.handleTextStats,
      handleDuplicateWords: clientTools.handleDuplicateWords,
      handleOverusedWords: clientTools.handleOverusedWords,
      handleNumToWords: clientTools.handleNumToWords,
      handleWordsToNum: clientTools.handleWordsToNum,
      handleDateFormat: ai.handleDateFormat,
      handleRomanNumeral: clientTools.handleRomanNumeral,
      handleQrFromText: clientTools.handleQrFromText,
      handleMdToHtml: clientTools.handleMdToHtml,
      handleTextToTable: clientTools.handleTextToTable,
      handleExtractEmails: clientTools.handleExtractEmails,
      handleExtractUrls: clientTools.handleExtractUrls,
      handleExtractNumbers: clientTools.handleExtractNumbers,
    }),
    [
      callApi,
      ai,
      formatter,
      wordFreq,
      hashTools,
      clientTools,
      handleBase64Encode,
      handleBase64Decode,
      handleUrlEncode,
      handleUrlDecode,
      handleHexEncode,
      handleHexDecode,
      handleMorseEncode,
      handleMorseDecode,
      handleBinaryEncode,
      handleBinaryDecode,
      handleOctalEncode,
      handleOctalDecode,
      handleDecimalEncode,
      handleDecimalDecode,
      handleUnicodeEscape,
      handleUnicodeUnescape,
      handleAtbash,
      handleBrainfuckEncode,
      handleBrainfuckDecode,
      handleJsonEscape,
      handleJsonUnescape,
      handleHtmlEscape,
      handleHtmlUnescape,
      handleJsonFormat,
      handleJsonToYaml,
      handleCsvToJson,
      handleJsonToCsv,
      handleMarkdownMode,
    ]
  );

  // ── Open a tool as a workspace tab ──────────────────────
  const openToolTab = useCallback(
    (tool: ToolDefinition) => {
      if (!tool) return;
      const tabId = `tool-${tool.id}`;
      let isNew = false;
      setWorkspaceTabs((tabs) => {
        if (tabs.find((t) => t.id === tabId)) return tabs;
        isNew = true;
        return [
          ...tabs,
          {
            id: tabId,
            label: tool.label,
            icon: tool.icon,
            type: 'tool',
            tool,
          } as unknown as WorkspaceTab,
        ];
      });
      // Seed new tab: only from URL shared text, otherwise start empty
      if (isNew) {
        const seedText = sharedTextRef.current || '';
        if (sharedTextRef.current) sharedTextRef.current = null;
        setToolTexts((prev) => (prev[tabId] ? prev : { ...prev, [tabId]: seedText }));
        if (seedText) {
          pendingAutoRun.current = tool;
        }
      }
      setActiveWorkspaceId(tabId);
      // Clear stale global output state so the new tab starts clean
      ai.setAiResult(null);
      setPreviewMode(null);
    },
    [ai]
  );

  // ── Open tool by ID and seed with content (used by templates) ──
  const openToolById = useCallback(
    (toolId: string | null, content: string) => {
      const tool = toolId ? TOOLS.find((t) => t.id === toolId) : null;
      if (!tool) {
        // No tool_id or tool not found — load into current tab if open, otherwise open a generic tab
        const activeId = activeTabIdRef.current;
        if (activeId) {
          setToolTexts((prev) => ({ ...prev, [activeId]: content }));
        } else {
          // No tab open — pick the first non-drawer, non-action tool as a generic text holder

          const fallback = TOOLS.find((t) => t.type === 'api' && t.group === 'case') ?? TOOLS[0]!;
          const tabId = `tool-${fallback.id}`;
          setWorkspaceTabs((tabs) => {
            if (tabs.find((t) => t.id === tabId)) return tabs;
            return [
              ...tabs,
              {
                id: tabId,
                label: fallback.label,
                icon: fallback.icon,
                type: 'tool',
                tool: fallback as unknown as WorkspaceTab['tool'],
              } as WorkspaceTab,
            ];
          });
          setToolTexts((prev) => ({ ...prev, [tabId]: content }));
          setActiveWorkspaceId(tabId);
        }
        return;
      }
      const tabId = `tool-${tool.id}`;
      setWorkspaceTabs((tabs) => {
        if (tabs.find((t) => t.id === tabId)) return tabs;
        return [
          ...tabs,
          {
            id: tabId,
            label: tool.label,
            icon: tool.icon,
            type: 'tool',
            tool,
          } as unknown as WorkspaceTab,
        ];
      });
      setToolTexts((prev) => ({ ...prev, [tabId]: content }));
      setActiveWorkspaceId(tabId);
      ai.setAiResult(null);
      setPreviewMode(null);
      // Schedule auto-run after text is set
      pendingAutoRun.current = tool;
    },
    [ai]
  );

  // Keep template helpers ref up to date
  templateHelpersRef.current = {
    getActiveToolId: () => {
      const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
      return ws?.type === 'tool' ? (ws.tool?.id ?? null) : null;
    },
    openToolById,
    renameActiveTab: (name) => {
      if (!activeWorkspaceId) return;
      setWorkspaceTabs((tabs) =>
        tabs.map((t) => (t.id === activeWorkspaceId ? { ...t, label: name } : t))
      );
    },
  };

  // ── Execute a tool ──
  const executeToolAction = useCallback(
    (tool: ToolDefinition) => {
      if (!tool) return;
      if (!trial.checkTrial()) return;

      // Unified tool access check (all tool types: ai, api, local, action, select)
      if (subscription?.checkToolAccess && !subscription.checkToolAccess(tool)) return;

      // Stamp the source so the persistence effect knows which tool produced the result
      aiResultSourceRef.current = tool.id;

      if (tool.type === 'api') {
        callApi(tool.endpoint!, tool.successMsg ?? '', {
          toolId: tool.id,
          toolType: tool.type,
          toolGroup: tool.group,
        }).then((res) => {
          if (res?.success) pipeline.addStep(tool.id, tool.label, res.result ?? '');
          if (subscription?.refetchStatus) subscription.refetchStatus();
        });
      } else if (tool.type === 'ai' || tool.type === 'local' || tool.type === 'select') {
        const handler = tool.handlerKey
          ? (handlerMap[tool.handlerKey as keyof typeof handlerMap] as
              | ((val?: string | null) => unknown)
              | undefined)
          : undefined;
        if (handler) {
          // For select tools, pass the freshly-clicked value from the ref to avoid stale closure
          const freshVal = selectValueRef.current;
          selectValueRef.current = null;
          const result = handler(freshVal);
          const resultAsPromise = result as { then?: (fn: () => void) => void } | null;
          if (resultAsPromise && typeof resultAsPromise.then === 'function') {
            resultAsPromise.then(() => {
              pipeline.addStep(tool.id, tool.label, '');
              if (subscription?.refetchStatus) subscription.refetchStatus();
            });
          } else {
            pipeline.addStep(tool.id, tool.label, '');
            if (subscription?.refetchStatus) subscription.refetchStatus();
          }
        }
      } else if (tool.type === 'drawer') {
        togglePanel(tool.panelId!);
      }
    },
    [trial, subscription, callApi, pipeline, handlerMap, togglePanel]
  );

  // ── Unified tool click handler ──────────────────────────
  const handleToolClick = useCallback(
    (tool: ToolDefinition) => {
      if (!tool) return;
      if (tool.type === 'drawer') {
        // Panels that host multiple distinct tools get a per-tool tab so each tool
        // keeps its own state and shows up independently in the tab strip.
        const PER_TOOL_PANELS = new Set(['cipherdrawer', 'diffdrawer', 'fakedata']);
        const panelId = tool.panelId ?? '';
        const tabId = PER_TOOL_PANELS.has(panelId)
          ? `drawer-${panelId}-${tool.id}`
          : `drawer-${panelId}`;
        let isNew = false;
        setWorkspaceTabs((tabs) => {
          const existing = tabs.find((t) => t.id === tabId);
          if (existing) {
            return tabs.map((t) =>
              t.id === tabId ? { ...t, label: tool.label, icon: tool.icon, tool } : t
            );
          }
          isNew = true;
          return [
            ...tabs,
            {
              id: tabId,
              label: tool.label,
              icon: tool.icon,
              type: 'drawer',
              panelId: panelId,
              tool,
            },
          ];
        });
        // Reset compare state on fresh open so user starts with empty text
        if (isNew && panelId === 'compare') {
          setToolTexts((prev) => ({ ...prev, [tabId]: '' }));
          compare.setCompareText('');
          compare.setDiffResult(null);
        }
        setActiveWorkspaceId(tabId);
        setActivePanel(panelId);
      } else {
        // api, ai, local, select → open as workspace tab; action is handled via executeToolAction
        if (
          tool.type === 'api' ||
          tool.type === 'ai' ||
          tool.type === 'local' ||
          tool.type === 'select'
        ) {
          openToolTab(tool);
        } else {
          executeToolAction(tool);
        }
      }
    },
    [openToolTab, executeToolAction, compare, setActivePanel]
  );

  // ── Auto-run tool on first open (when text was seeded) ──
  useEffect(() => {
    if (pendingAutoRun.current && text) {
      const tool = pendingAutoRun.current;
      pendingAutoRun.current = null;
      setTimeout(() => executeToolAction(tool), 50);
    }
  }, [text, activeWorkspaceId, executeToolAction]);

  // ── Debounced auto-run: re-run tool 2s after user stops typing ──
  useEffect(() => {
    if (!activeWorkspaceId || !text || loading) return;
    const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
    if (!ws || ws.type !== 'tool') return;

    const prevText = lastTextPerTab.current[activeWorkspaceId];
    // First time seeing this tab — record text, don't auto-run (result may already be stored)
    if (prevText === undefined) {
      lastTextPerTab.current[activeWorkspaceId] = text;
      return;
    }
    // Text hasn't actually changed (tab switch back to same text)
    if (text === prevText) return;
    lastTextPerTab.current[activeWorkspaceId] = text;

    // Text genuinely changed — clear stale result and schedule re-run
    if (toolResults[activeWorkspaceId]) {
      setToolResults((prev) => {
        const next = { ...prev };
        delete next[activeWorkspaceId];
        return next;
      });
    }

    const timer = setTimeout(() => {
      if (ws.tool) executeToolAction(ws.tool as ToolDefinition);
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounce must re-arm only on text/tab change; other deps re-running the effect would cancel the pending timer
  }, [text, activeWorkspaceId]);

  // ── Auto-run formatter when config changes ───────────
  const fmtCfgRef = useRef(formatter.fmtCfg);
  useEffect(() => {
    if (fmtCfgRef.current === formatter.fmtCfg) return;
    fmtCfgRef.current = formatter.fmtCfg;
    if (!activeWorkspaceId || !text || loading) return;
    const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
    if (!ws || ws.type !== 'tool') return;
    if (!ws.tool || !['js_fmt', 'ts_fmt', 'css_fmt', 'html_fmt'].includes(ws.tool.id)) return;
    const timer = setTimeout(() => {
      if (ws.tool) executeToolAction(ws.tool as ToolDefinition);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs only when the formatter config changes by design; fmtCfgRef guards re-entry
  }, [formatter.fmtCfg]);

  // ── ?tool=<id> deep-link from /tools/[slug] CTA ─────────
  // When a user arrives from a per-tool SEO page via
  //   WEB_APP_BASE_URL?tool=<id>
  // pre-select that tool in the editor on first mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const toolId = params.get('tool');
    if (!toolId) return;
    const match = TOOLS.find((t) => t.id === toolId);
    if (match) {
      handleToolClick(match);
      // Clean the query string so the URL looks canonical.
      const url = new URL(window.location.href);
      url.searchParams.delete('tool');
      window.history.replaceState({}, '', url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // intentionally runs once on mount; handleToolClick is stable

  // ── Keyboard Shortcuts (power-user hotkeys) ─────────────
  // Use a ref so the keydown handler always sees the latest closures
  // without triggering re-registration on every render.
  const kbActionsRef = useRef<Record<string, unknown> | null>(null);
  kbActionsRef.current = {
    openPalette: () => (search.isOpen ? search.close() : search.open()),
    toggleSidebar: () => setSidebarOpen((o) => !o),
    toggleSettings: () => setSettingsOpen((o) => !o),
    onEscape: () => {
      if (search.isOpen) {
        search.close();
        return;
      }
      if (settingsOpen) {
        setSettingsOpen(false);
        return;
      }
      if (activePanel) {
        setActivePanel(null);
        return;
      }
      if (sidebarOpen) {
        setSidebarOpen(false);
        return;
      }
    },
    runActiveTool: () => {
      const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
      if (ws?.type === 'tool' && ws.tool) executeToolAction(ws.tool as ToolDefinition);
    },
    saveTemplate: () => {
      if (activeWorkspaceId) {
        const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
        setSaveModal({ tabId: activeWorkspaceId, defaultName: ws?.label || 'Untitled' });
      }
    },
    closeActiveTab: () => {
      if (activeWorkspaceId) closeWorkspaceTab(activeWorkspaceId);
    },
    clearText: () => handleClear(),
    undo: () => history.handleUndo(),
    redo: () => history.handleRedo(),
    copyOutput: () => {
      const result = ((activeWorkspaceId ? toolResults[activeWorkspaceId] : undefined) ||
        ai.aiResult) as { result?: string } | null;
      if (result?.result) {
        navigator.clipboard.writeText(result.result);
        showAlert('Output copied', 'success');
      }
    },
    clearPaste: () => handleClearPaste(),
    goToTab: (idx: number) => {
      if (idx === 8) {
        const last = workspaceTabs[workspaceTabs.length - 1];
        if (last) setActiveWorkspaceId(last.id);
      } else if (workspaceTabs[idx]) {
        setActiveWorkspaceId(workspaceTabs[idx]!.id);
      }
    },
    nextTab: () => {
      if (workspaceTabs.length === 0) return;
      const idx = workspaceTabs.findIndex((t) => t.id === activeWorkspaceId);
      const next = (idx + 1) % workspaceTabs.length;
      setActiveWorkspaceId(workspaceTabs[next]!.id);
    },
    prevTab: () => {
      if (workspaceTabs.length === 0) return;
      const idx = workspaceTabs.findIndex((t) => t.id === activeWorkspaceId);
      const prev = (idx - 1 + workspaceTabs.length) % workspaceTabs.length;
      setActiveWorkspaceId(workspaceTabs[prev]!.id);
    },
    runTool: (tool: ToolDefinition) => handleToolClick(tool),
  };
  // Stable proxy object — never changes identity, always delegates to latest ref
  const keyboardActions = useMemo(() => {
    const proxy: Record<string, (...args: unknown[]) => unknown> = {};
    const keys = [
      'openPalette',
      'toggleSidebar',
      'toggleSettings',
      'onEscape',
      'runActiveTool',
      'saveTemplate',
      'closeActiveTab',
      'clearText',
      'undo',
      'redo',
      'copyOutput',
      'clearPaste',
      'goToTab',
      'nextTab',
      'prevTab',
      'runTool',
    ];
    keys.forEach((k) => {
      proxy[k] = (...args: unknown[]) =>
        (kbActionsRef.current as Record<string, (...a: unknown[]) => unknown>)?.[k]?.(...args);
    });
    return proxy;
  }, []);

  const {
    shortcutsOpen,
    setShortcutsOpen,
    groups: shortcutGroups,
    overrides: shortcutOverrides,
    updateBinding,
    resetAll: resetAllBindings,
    resetOne: resetOneBinding,
    isCustomized: isBindingCustomized,
  } = useKeyboardShortcuts(keyboardActions);

  // ── Derived stats ───────────────────────────────────────
  const disabled = text.trim().length === 0 || loading;
  const { words, chars, sentences } = useMemo(
    () => ({
      words: text.split(/\s+/).filter(Boolean).length,
      chars: text.length,
      sentences: text.split(/[.?]\s*(?=\S|$)|\n/).filter((s) => s.trim()).length,
    }),
    [text]
  );

  // togglePanel and closePanel provided by useDrawerState hook

  const renderDrawerContent = () => {
    switch (activePanel) {
      case 'find':
        return null; // Renders inline in input area
      case 'compare':
        return null; // Compare uses its own layout
      case 'randtext':
        return null; // Renders inline in input area
      case 'password':
        return null; // Renders inline in input area
      case 'regex':
        return <RegexDrawer {...regex} disabled={disabled} />;
      case 'templates':
        return <TemplatesDrawer {...templates} disabled={disabled} />;
      case 'history':
        return <HistoryDrawer {...history} setText={setText} showAlert={showAlert} />;
      case 'wraplines':
        return null; // Renders inline in input area
      case 'filterlines':
        return null; // Renders inline in input area
      case 'droplines':
        return null; // Renders inline in input area
      case 'truncatelines':
        return null; // Renders inline in input area
      case 'nthlines':
        return null; // Renders inline in input area
      case 'cipherdrawer':
        return null; // Renders inline
      case 'diffdrawer':
        return null; // Renders inline
      case 'fakedata':
        return null; // Renders inline
      case 'jsonpath':
        return null; // Renders inline
      case 'mdpreview':
        return null; // Renders inline
      case 'loremipsum':
        return null; // Renders inline
      case 'samplejson':
        return null; // Renders inline
      default:
        return null;
    }
  };

  // Activity bar tab click — toggles sidebar
  const handleActivityClick = (tabId: string) => {
    if (activeTab === tabId && sidebarOpen) {
      setSidebarOpen(false);
    } else {
      setActiveTab(tabId);
      setSidebarOpen(true);
    }
  };

  return (
    <>
      <main
        role="main"
        className={`tu-forge${sidebarOpen ? '' : ' tu-forge--sidebar-collapsed'}`}
        style={
          sidebarOpen && !isMobile
            ? { gridTemplateColumns: `48px ${sidebarResize.size}px 1fr` }
            : undefined
        }
      >
        {/* ─── Activity Bar (far left icons) ─── */}
        <div className="tu-activity-bar">
          {USE_CASE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tu-activity-btn${
                activeTab === tab.id && sidebarOpen ? ' tu-activity-btn--active' : ''
              }`}
              onClick={() => handleActivityClick(tab.id)}
              data-tooltip={tab.label}
              aria-label={tab.label}
              aria-pressed={activeTab === tab.id && sidebarOpen}
            >
              {ACTIVITY_ICONS[tab.id] || <span>{tab.icon}</span>}
            </button>
          ))}
          {/* Favourites */}
          <button
            className={`tu-activity-btn${
              activeTab === '_favourites' && sidebarOpen ? ' tu-activity-btn--active' : ''
            }`}
            onClick={() => handleActivityClick('_favourites')}
            data-tooltip="Favourites"
            aria-label="Favourites"
            aria-pressed={activeTab === '_favourites' && sidebarOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
          <div className="tu-activity-spacer" />
          {/* Templates */}
          <button
            className={`tu-activity-btn${
              activeTab === '_templates' && sidebarOpen ? ' tu-activity-btn--active' : ''
            }`}
            onClick={() => handleActivityClick('_templates')}
            data-tooltip="Templates"
            aria-label="Templates"
            aria-pressed={activeTab === '_templates' && sidebarOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </button>
          {/* History */}
          <button
            className={`tu-activity-btn${
              activeTab === '_history' && sidebarOpen ? ' tu-activity-btn--active' : ''
            }`}
            onClick={() => handleActivityClick('_history')}
            data-tooltip="History"
            aria-label="History"
            aria-pressed={activeTab === '_history' && sidebarOpen}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </button>
          {/* Bottom: avatar */}
          <button
            className={`tu-activity-avatar${settingsOpen ? ' tu-activity-avatar--open' : ''}`}
            onClick={() => setSettingsOpen((o) => !o)}
          >
            <span className="tu-activity-avatar-letter">
              {props.user?.display_name?.charAt(0)?.toUpperCase() || 'G'}
            </span>
          </button>
        </div>

        {/* ─── Sidebar (tool explorer / templates / history) ─── */}
        <div className="tu-forge-sidebar">
          <div className="tu-sidebar-header">
            <span title="~/FixMyText/workspace/tools">
              {activeTab === '_templates'
                ? 'Templates'
                : activeTab === '_history'
                  ? 'History'
                  : activeTab === '_favourites'
                    ? 'Favourites'
                    : USE_CASE_TABS.find((t) => t.id === activeTab)?.label || 'Explorer'}
              {activeTab && !activeTab.startsWith('_') && (
                <span className="tu-sidebar-header-count">
                  {activeTab === 'all'
                    ? TOOLS.length
                    : TOOLS.filter((t) => t.tabs?.includes(activeTab as ToolTab)).length}
                </span>
              )}
            </span>
            <div className="tu-sidebar-header-actions">
              {((activeTab && !activeTab.startsWith('_')) || activeTab === '_favourites') && (
                <>
                  <button
                    className={`tu-sidebar-header-btn${
                      toolViewMode === 'list' ? ' tu-sidebar-header-btn--active' : ''
                    }`}
                    onClick={() => {
                      setToolViewMode('list');
                      localStorage.setItem('fmx_tool_view', 'list');
                      if (isAuthenticated)
                        updateUiSettings({ tool_view: 'list' })
                          .unwrap()
                          .catch(() => {});
                    }}
                    title="List view"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <line x1="8" y1="6" x2="21" y2="6" />
                      <line x1="8" y1="12" x2="21" y2="12" />
                      <line x1="8" y1="18" x2="21" y2="18" />
                      <line x1="3" y1="6" x2="3.01" y2="6" />
                      <line x1="3" y1="12" x2="3.01" y2="12" />
                      <line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                  </button>
                  <button
                    className={`tu-sidebar-header-btn${
                      toolViewMode === 'grid' ? ' tu-sidebar-header-btn--active' : ''
                    }`}
                    onClick={() => {
                      setToolViewMode('grid');
                      localStorage.setItem('fmx_tool_view', 'grid');
                      if (isAuthenticated)
                        updateUiSettings({ tool_view: 'grid' })
                          .unwrap()
                          .catch(() => {});
                    }}
                    title="Grid view"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </button>
                </>
              )}
              <button
                className="tu-sidebar-header-btn"
                onClick={() => setSidebarOpen(false)}
                title="Close sidebar"
              >
                <XIcon size={14} />
              </button>
            </div>
          </div>

          {/* Mobile: the activity bar (which switches these panels on desktop)
              is hidden, so surface its non-category panels as sheet tabs */}
          {isMobile && (
            <div className="tu-sheet-tabs">
              {[
                { id: '_favourites', label: 'Favourites', icon: HeartIcon },
                { id: '_templates', label: 'Templates', icon: LayoutTemplateIcon },
                { id: '_history', label: 'History', icon: HistoryIcon },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`tu-sheet-tab${activeTab === t.id ? ' tu-sheet-tab--active' : ''}`}
                  onClick={() => setActiveTab(activeTab === t.id ? 'all' : t.id)}
                  aria-pressed={activeTab === t.id}
                >
                  <span aria-hidden="true">
                    <t.icon size={13} />
                  </span>{' '}
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Tool panel — when a tool category is active */}
          {activeTab && !activeTab.startsWith('_') && (
            <ToolPanel
              tools={TOOLS}
              activeTab={activeTab}
              onTabChange={(tabId) => setActiveTab(tabId)}
              onToolClick={handleToolClick}
              disabled={loading}
              favorites={favorites}
              activeToolId={(() => {
                const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
                if (ws?.type === 'tool') return ws.tool?.id ?? null;
                if (ws?.type === 'drawer') {
                  if (ws.tool?.id) return ws.tool.id;
                  return TOOLS.find((t) => t.panelId === ws.panelId)?.id || null;
                }
                return null;
              })()}
              hideTabs={!isMobile}
              viewMode={toolViewMode}
              suggestedToolIds={suggestions.suggestions.map((t) => t.id)}
              toolGroups={toolGroups}
            />
          )}

          {/* Favourites panel */}
          {activeTab === '_favourites' &&
            (() => {
              const favTools = favorites.favorites
                .map((id: string) => TOOLS.find((t) => t.id === id))
                .filter(Boolean) as ToolDefinition[];
              return (
                <div className="tu-tpanel">
                  {favTools.length === 0 ? (
                    <div className="tu-sidebar-panel-empty">
                      No favourite tools yet.
                      <br />
                      Click <HeartIcon size={11} /> on any tool to add it here.
                    </div>
                  ) : toolViewMode === 'grid' ? (
                    <div className="tu-tpanel-list">
                      <div className="tu-group-grid">
                        {favTools.map((tool) => (
                          <div
                            key={tool.id}
                            className="tu-tgrid-card"
                            onClick={() => handleToolClick(tool)}
                          >
                            <div className="tu-tgrid-card-icon">
                              <ToolIcon icon={tool.icon} color={tool.color} toolId={tool.id} />
                            </div>
                            <span className="tu-tgrid-card-name">{tool.label}</span>
                            <button
                              className="tu-titem-fav tu-tgrid-card-fav tu-titem-fav--active"
                              onClick={(e) => {
                                e.stopPropagation();
                                favorites.toggleFavorite(tool.id);
                              }}
                              title="Remove from favourites"
                            >
                              <HeartIcon size={13} fill="currentColor" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="tu-tpanel-list">
                      {favTools.map((tool) => (
                        <div key={tool.id} className="tu-titem-wrap">
                          <div className="tu-titem" onClick={() => handleToolClick(tool)}>
                            <ToolIcon icon={tool.icon} color={tool.color} toolId={tool.id} />
                            <span className="tu-titem-name">{tool.label}</span>
                            <button
                              className="tu-titem-fav tu-titem-fav--active"
                              onClick={(e) => {
                                e.stopPropagation();
                                favorites.toggleFavorite(tool.id);
                              }}
                              title="Remove from favourites"
                            >
                              <HeartIcon size={13} fill="currentColor" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}

          {/* Templates panel */}
          {activeTab === '_templates' && (
            <div className="tu-sidebar-panel">
              <div className="tu-sidebar-panel-actions">
                <input
                  className="tu-sidebar-panel-input"
                  type="text"
                  placeholder="Template name..."
                  value={templates.templateName}
                  onChange={(e) => templates.setTemplateName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && templates.handleSaveTemplate()}
                />
                <button
                  className="tu-sidebar-panel-btn"
                  onClick={templates.handleSaveTemplate}
                  title="Save current text as template"
                >
                  Save
                </button>
              </div>

              {templates.templates.length === 0 ? (
                <div className="tu-sidebar-panel-empty">No saved templates yet</div>
              ) : (
                <div className="tu-sidebar-panel-list">
                  {templates.templates.map((tpl, i) => (
                    <div
                      key={i}
                      className="tu-sidebar-panel-item"
                      onClick={() => templates.handleLoadTemplate(i)}
                    >
                      <span className="tu-sidebar-panel-item-icon">
                        <FileTextIcon size={13} />
                      </span>
                      <span className="tu-sidebar-panel-item-name">{tpl.name}</span>
                      <span className="tu-sidebar-panel-item-meta">
                        {new Date(tpl.updatedAt as string).toLocaleDateString()}
                      </span>
                      <button
                        className="tu-sidebar-panel-item-del"
                        onClick={(e) => {
                          e.stopPropagation();
                          templates.handleDeleteTemplate(i);
                        }}
                        title="Delete template"
                      >
                        <XIcon size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* History panel */}
          {activeTab === '_history' && (
            <div className="tu-sidebar-panel">
              {/* View toggle: Session vs Saved (only if logged in) */}
              {isAuthenticated && (
                <div className="tu-sidebar-panel-tabs">
                  <button
                    className={`tu-sidebar-panel-tab${
                      historyView === 'session' ? ' tu-sidebar-panel-tab--active' : ''
                    }`}
                    onClick={() => setHistoryView('session')}
                  >
                    Session
                  </button>
                  <button
                    className={`tu-sidebar-panel-tab${
                      historyView === 'saved' ? ' tu-sidebar-panel-tab--active' : ''
                    }`}
                    onClick={() => {
                      setHistoryView('saved');
                      setHistoryPage(1);
                    }}
                  >
                    All History
                  </button>
                </div>
              )}

              {/* Session history (local, in-memory) */}
              {historyView === 'session' && (
                <>
                  {history.history.length > 0 && (
                    <div className="tu-sidebar-panel-actions">
                      <span className="tu-sidebar-panel-count">
                        {history.history.length} operations
                      </span>
                      <button
                        className="tu-sidebar-panel-btn tu-sidebar-panel-btn--danger"
                        onClick={history.handleClearHistory}
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                  {history.history.length === 0 ? (
                    <div className="tu-sidebar-panel-empty">No operations yet</div>
                  ) : (
                    <div className="tu-sidebar-panel-list">
                      {[...history.history].reverse().map((h, ri) => {
                        const i = history.history.length - 1 - ri;
                        return (
                          <div key={i} className="tu-sidebar-panel-item">
                            <span className="tu-sidebar-panel-item-icon">
                              <ZapIcon size={13} />
                            </span>
                            <span className="tu-sidebar-panel-item-name">{h.operation}</span>
                            <span className="tu-sidebar-panel-item-meta">
                              {new Date(h.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button
                              className="tu-sidebar-panel-item-action"
                              onClick={() => {
                                setText(h.original);
                                showAlert(`Restored input from "${h.operation}"`, 'success');
                              }}
                              title="Restore input"
                            >
                              <CornerUpLeftIcon size={13} />
                            </button>
                            <button
                              className="tu-sidebar-panel-item-action"
                              onClick={() => {
                                setText(h.result);
                                showAlert(`Restored result from "${h.operation}"`, 'success');
                              }}
                              title="Restore result"
                            >
                              <CornerUpRightIcon size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* Saved history (server-side, paginated) */}
              {historyView === 'saved' && isAuthenticated && (
                <>
                  {serverHistory && serverHistory.total > 0 && (
                    <div className="tu-sidebar-panel-actions">
                      <span className="tu-sidebar-panel-count">{serverHistory.total} total</span>
                      <button
                        className="tu-sidebar-panel-btn tu-sidebar-panel-btn--danger"
                        onClick={() => {
                          clearServerHistory()
                            .unwrap()
                            .then(() => showAlert('All history cleared', 'success'))
                            .catch(() => {});
                        }}
                      >
                        Clear All
                      </button>
                    </div>
                  )}
                  {historyFetching ? (
                    <div className="tu-sidebar-panel-empty">Loading...</div>
                  ) : !serverHistory || serverHistory.items.length === 0 ? (
                    <div className="tu-sidebar-panel-empty">No saved history yet</div>
                  ) : (
                    <>
                      <div className="tu-sidebar-panel-list">
                        {serverHistory.items.map((h) => (
                          <div key={h.id} className="tu-sidebar-panel-item">
                            <span className="tu-sidebar-panel-item-icon">
                              <ZapIcon size={13} />
                            </span>
                            <span className="tu-sidebar-panel-item-name">{h.tool_label}</span>
                            <span className="tu-sidebar-panel-item-meta">
                              {new Date(h.created_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                              })}{' '}
                              {new Date(h.created_at).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            <button
                              className="tu-sidebar-panel-item-action"
                              onClick={() => {
                                setText(h.input_preview);
                                showAlert(`Restored input from "${h.tool_label}"`, 'success');
                              }}
                              title="Restore input"
                            >
                              <CornerUpLeftIcon size={13} />
                            </button>
                            <button
                              className="tu-sidebar-panel-item-action"
                              onClick={() => {
                                setText(h.output_preview);
                                showAlert(`Restored output from "${h.tool_label}"`, 'success');
                              }}
                              title="Restore output"
                            >
                              <CornerUpRightIcon size={13} />
                            </button>
                            <button
                              className="tu-sidebar-panel-item-action tu-sidebar-panel-item-action--danger"
                              onClick={() => {
                                deleteHistoryEntry(h.id)
                                  .unwrap()
                                  .catch(() => {});
                              }}
                              title="Delete entry"
                            >
                              <XIcon size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Pagination */}
                      {serverHistory.total > 25 && (
                        <div className="tu-sidebar-panel-pagination">
                          <button
                            className="tu-sidebar-panel-btn"
                            disabled={historyPage <= 1}
                            onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                          >
                            Prev
                          </button>
                          <span className="tu-sidebar-panel-count">
                            Page {historyPage} of {Math.ceil(serverHistory.total / 25)}
                          </span>
                          <button
                            className="tu-sidebar-panel-btn"
                            disabled={!serverHistory.has_more}
                            onClick={() => setHistoryPage((p) => p + 1)}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* ─── Sidebar Footer: Subscription ─── */}
          {(() => {
            const showPro = subscription?.isPro;
            const showCredits =
              subscription &&
              props.isAuthenticated &&
              !subscription.isPro &&
              subscription.totalCredits > 0;
            // Nothing to show (no subscription badges): skip the footer
            // entirely so its border/padding don't render as an empty strip.
            if (!showPro && !showCredits) return null;
            return (
              <div className="tu-sidebar-footer">
                {/* Subscription Status */}
                {showPro && (
                  <div className="tu-sf-row tu-sf-ai-usage">
                    <span className="tu-sf-label tu-sf-label--pro">PRO</span>
                    <span className="tu-sf-value">Unlimited</span>
                  </div>
                )}
                {showCredits && (
                  <div className="tu-sf-row tu-sf-ai-usage">
                    <span className="tu-sf-label">Credits</span>
                    <span className="tu-sf-value">{subscription.totalCredits}</span>
                  </div>
                )}
              </div>
            );
          })()}
          {/* Sidebar resize handle */}
          {sidebarOpen && (
            <div
              className="tu-resize-handle tu-resize-handle--sidebar"
              onMouseDown={sidebarResize.onMouseDown}
            />
          )}
        </div>

        {/* ─── Center: Editor Area ─── */}
        <div className="tu-forge-center">
          {/* ─── Workspace Tab Bar (top-level, tools as files) ─── */}
          {workspaceTabs.length > 0 && (
            <TabBar
              workspaceTabs={workspaceTabs}
              activeWorkspaceId={activeWorkspaceId}
              setActiveWorkspaceId={setActiveWorkspaceId}
              setActivePanel={setActivePanel}
              setSaveModal={setSaveModal}
              closeWorkspaceTab={closeWorkspaceTab}
              onTabSwitch={() => {
                ai.setAiResult(null);
                setPreviewMode(null);
              }}
            />
          )}

          {/* ─── Landing page (no tool selected) ─── */}
          {!activeWorkspaceId && (
            <div className="tu-landing">
              {props.isAuthenticated ? (
                /* ══════════ SIGNED-IN DASHBOARD ══════════ */
                <>
                  {/* Greeting + search */}
                  <div className="tu-landing-greeting">
                    <div className="tu-landing-greeting-left">
                      <h1 className="tu-landing-title">
                        Welcome back, {props.user?.display_name?.split(' ')[0] || 'there'}
                      </h1>
                    </div>
                    <button className="tu-landing-search-btn" onClick={() => search.open()}>
                      <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                      Search tools...
                      <kbd>Ctrl+K</kbd>
                    </button>
                  </div>

                  {/* Favorites + Recent tools */}
                  <div className="tu-landing-tools-row">
                    {/* Favourites */}
                    <div className="tu-landing-card tu-landing-card--wide">
                      <h2 className="tu-landing-card-title">
                        <span className="tu-landing-card-icon">&#x2764;</span>
                        {favorites.favorites.length > 0 ? 'Your Favourites' : 'Popular Tools'}
                      </h2>
                      <div className="tu-landing-tool-grid">
                        {(favorites.favorites.length > 0
                          ? favorites.favorites
                              .slice(0, 8)
                              .map((id: string) => TOOLS.find((t) => t.id === id))
                              .filter((t): t is ToolDefinition => Boolean(t))
                          : [
                              'fix_grammar',
                              'paraphrase',
                              'summarize',
                              'uppercase',
                              'lowercase',
                              'title_case',
                              'word_count',
                              'find_replace',
                            ]
                              .map((id: string) => TOOLS.find((t) => t.id === id))
                              .filter((t): t is ToolDefinition => Boolean(t))
                        ).map((tool) => (
                          <button
                            key={tool.id}
                            className="tu-landing-tool-btn"
                            onClick={() => handleToolClick(tool)}
                          >
                            <span className={`tu-landing-tool-icon tu-titem-icon--${tool.color}`}>
                              {tool.icon}
                            </span>
                            <span className="tu-landing-tool-name">{tool.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Category grid + Shortcuts */}
                  <div className="tu-landing-bottom">
                    <div className="tu-landing-categories">
                      <h2 className="tu-landing-heading">Explore categories</h2>
                      <div className="tu-landing-cat-grid">
                        {USE_CASE_TABS.filter((t) => t.id !== 'all').map((tab) => {
                          const count = TOOLS.filter((t) => t.tabs?.includes(tab.id)).length;
                          return (
                            <button
                              key={tab.id}
                              className="tu-landing-cat-card"
                              onClick={() => {
                                setActiveTab(tab.id);
                                setSidebarOpen(true);
                              }}
                            >
                              <span className="tu-landing-cat-icon">
                                {ACTIVITY_ICONS[tab.id] || <span>{tab.icon}</span>}
                              </span>
                              <span className="tu-landing-cat-name">{tab.label}</span>
                              <span className="tu-landing-cat-count">{count} tools</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="tu-landing-shortcuts">
                      <h2 className="tu-landing-heading">Keyboard shortcuts</h2>
                      <div className="tu-landing-shortcut-list">
                        <div className="tu-landing-shortcut">
                          <kbd>Ctrl</kbd>
                          <kbd>K</kbd>
                          <span>Command palette</span>
                        </div>
                        <div className="tu-landing-shortcut">
                          <kbd>Ctrl</kbd>
                          <kbd>&#x23CE;</kbd>
                          <span>Run tool</span>
                        </div>
                        <div className="tu-landing-shortcut">
                          <kbd>Ctrl</kbd>
                          <kbd>B</kbd>
                          <span>Toggle sidebar</span>
                        </div>
                        <div className="tu-landing-shortcut">
                          <kbd>Ctrl</kbd>
                          <kbd>Z</kbd>
                          <span>Undo</span>
                        </div>
                        <div className="tu-landing-shortcut">
                          <kbd>Ctrl</kbd>
                          <kbd>S</kbd>
                          <span>Save template</span>
                        </div>
                        <div className="tu-landing-shortcut">
                          <kbd>Ctrl</kbd>
                          <kbd>/</kbd>
                          <span>All shortcuts</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                /* ══════════ SIGNED-OUT MARKETING PAGE ══════════ */
                <>
                  {/* Hero */}
                  <div className="tu-landing-hero tu-landing-hero--big">
                    <h1 className="tu-landing-title tu-landing-title--big">
                      Fix, transform &amp; enhance
                      <br />
                      your text instantly
                    </h1>
                    <p className="tu-landing-subtitle tu-landing-subtitle--big">
                      {TOOLS.length}+ powerful tools for writing, coding, translating, and more
                      &mdash; all in one place. No installs. No fluff.
                    </p>
                    <div className="tu-landing-hero-actions">
                      <button className="tu-landing-cta" onClick={() => navigate('/login')}>
                        Get Started Free
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                      <button className="tu-landing-cta-secondary" onClick={() => search.open()}>
                        <svg
                          width="15"
                          height="15"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="11" cy="11" r="8" />
                          <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        Try a tool now
                        <kbd>Ctrl+K</kbd>
                      </button>
                    </div>
                  </div>

                  {/* Feature highlights */}
                  <div className="tu-landing-features">
                    <div className="tu-landing-feature">
                      <div className="tu-landing-feature-icon">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                        </svg>
                      </div>
                      <h2 className="tu-landing-feature-title">
                        {TOOLS.filter((t) => t.tabs?.includes('writing')).length}+ Writing Tools
                      </h2>
                      <p className="tu-landing-feature-desc">
                        Grammar fixes, paraphrasing, tone adjustment, summarization, proofreading,
                        and more.
                      </p>
                    </div>
                    <div className="tu-landing-feature">
                      <div className="tu-landing-feature-icon">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="16 18 22 12 16 6" />
                          <polyline points="8 6 2 12 8 18" />
                        </svg>
                      </div>
                      <h2 className="tu-landing-feature-title">Developer Friendly</h2>
                      <p className="tu-landing-feature-desc">
                        JSON formatting, Base64 encoding, regex testing, slug generation, and code
                        utilities.
                      </p>
                    </div>
                    <div className="tu-landing-feature">
                      <div className="tu-landing-feature-icon">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 2a4 4 0 0 1 4 4v2a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4z" />
                          <path d="M16 14H8a4 4 0 0 0-4 4v2h16v-2a4 4 0 0 0-4-4z" />
                        </svg>
                      </div>
                      <h2 className="tu-landing-feature-title">AI-Powered</h2>
                      <p className="tu-landing-feature-desc">
                        Translate, rewrite in any tone, ELI5, summarize — backed by state-of-the-art
                        AI models.
                      </p>
                    </div>
                    <div className="tu-landing-feature">
                      <div className="tu-landing-feature-icon">
                        <svg
                          width="28"
                          height="28"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--accent)"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="17 1 21 5 17 9" />
                          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                          <polyline points="7 23 3 19 7 15" />
                          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                        </svg>
                      </div>
                      <h2 className="tu-landing-feature-title">Instant Transforms</h2>
                      <p className="tu-landing-feature-desc">
                        UPPERCASE, lowercase, title case, reverse, sort lines, remove duplicates —
                        one click away.
                      </p>
                    </div>
                  </div>

                  {/* How it works */}
                  <div className="tu-landing-how">
                    <h2 className="tu-landing-section-title">How it works</h2>
                    <div className="tu-landing-how-steps">
                      <div className="tu-landing-how-step">
                        <span className="tu-landing-step-num">1</span>
                        <div>
                          <h3 className="tu-landing-how-step-title">Pick a tool</h3>
                          <p className="tu-landing-how-step-desc">
                            Browse {TOOLS.length}+ tools by category or search with Ctrl+K
                          </p>
                        </div>
                      </div>
                      <div className="tu-landing-how-step">
                        <span className="tu-landing-step-num">2</span>
                        <div>
                          <h3 className="tu-landing-how-step-title">Paste or type your text</h3>
                          <p className="tu-landing-how-step-desc">
                            The split editor shows input on the left, output on the right
                          </p>
                        </div>
                      </div>
                      <div className="tu-landing-how-step">
                        <span className="tu-landing-step-num">3</span>
                        <div>
                          <h3 className="tu-landing-how-step-title">
                            Click Run or press Ctrl+Enter
                          </h3>
                          <p className="tu-landing-how-step-desc">
                            Your transformed text appears instantly. Copy, export, or chain more
                            tools
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Category grid */}
                  <div className="tu-landing-categories">
                    <h2 className="tu-landing-section-title">Explore categories</h2>
                    <div className="tu-landing-cat-grid">
                      {USE_CASE_TABS.filter((t) => t.id !== 'all').map((tab) => {
                        const count = TOOLS.filter((t) => t.tabs?.includes(tab.id)).length;
                        return (
                          <button
                            key={tab.id}
                            className="tu-landing-cat-card"
                            onClick={() => {
                              setActiveTab(tab.id);
                              setSidebarOpen(true);
                            }}
                          >
                            <span className="tu-landing-cat-icon">
                              {ACTIVITY_ICONS[tab.id] || <span>{tab.icon}</span>}
                            </span>
                            <span className="tu-landing-cat-name">{tab.label}</span>
                            <span className="tu-landing-cat-count">{count} tools</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Social proof / highlights */}
                  <div className="tu-landing-highlights">
                    <div className="tu-landing-highlight">
                      <span className="tu-landing-highlight-val">{TOOLS.length}+</span>
                      <span className="tu-landing-highlight-label">Text tools</span>
                    </div>
                    <div className="tu-landing-highlight">
                      <span className="tu-landing-highlight-val">
                        {USE_CASE_TABS.filter((t) => t.id !== 'all').length}
                      </span>
                      <span className="tu-landing-highlight-label">Categories</span>
                    </div>
                    <div className="tu-landing-highlight">
                      <span className="tu-landing-highlight-val">
                        {TOOLS.filter((t) => t.type === 'ai').length}+
                      </span>
                      <span className="tu-landing-highlight-label">AI-powered tools</span>
                    </div>
                    <div className="tu-landing-highlight">
                      <span className="tu-landing-highlight-val">Free</span>
                      <span className="tu-landing-highlight-label">To get started</span>
                    </div>
                  </div>

                  {/* Bottom CTA */}
                  <div className="tu-landing-bottom-cta">
                    <h2 className="tu-landing-section-title">Ready to fix your text?</h2>
                    <p className="tu-landing-subtitle">
                      Create a free account to sync your work across devices, keep your full
                      history, and pin your favourite tools.
                    </p>
                    <div className="tu-landing-hero-actions">
                      <button className="tu-landing-cta" onClick={() => navigate('/login')}>
                        Sign Up Free
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="5" y1="12" x2="19" y2="12" />
                          <polyline points="12 5 19 12 12 19" />
                        </svg>
                      </button>
                      <button className="tu-landing-cta-secondary" onClick={() => search.open()}>
                        Or just start using tools
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeWorkspaceId && (
            <>
              <div
                ref={splitRef as unknown as Ref<HTMLDivElement>}
                className="tu-editor-split"
                style={{
                  gridTemplateColumns: `${splitResize.size}fr 4px ${100 - splitResize.size}fr`,
                }}
              >
                {/* ─── Left: Input (or generator panel for no-input tools) ─── */}
                <div
                  className={`tu-editor-input${
                    workspaceTabs.find((t) => t.id === activeWorkspaceId)?.panelId === 'compare'
                      ? ' tu-editor-input--split'
                      : ''
                  }`}
                >
                  <>
                    <div className="tu-editor-topbar">
                      <span className="tu-editor-label" title="~/FixMyText/workspace/input.txt">
                        INPUT
                      </span>
                      <div className="tu-topbar-stats">
                        <span className="tu-topbar-stat">
                          <b>{words}</b> words
                        </span>
                        <span className="tu-topbar-stat">
                          <b>{chars}</b> chars
                        </span>
                        <span className="tu-topbar-stat">
                          <b>{sentences}</b> sentences
                        </span>
                      </div>
                    </div>
                    <div className="tu-input-toolbar">
                      <button
                        className="tu-input-toolbar-btn"
                        onClick={handleCopy}
                        title="Copy"
                        disabled={!text}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        <span>Copy</span>
                      </button>
                      <button className="tu-input-toolbar-btn" onClick={handlePaste} title="Paste">
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                          <rect x="8" y="2" width="8" height="4" rx="1" />
                        </svg>
                        <span>Paste</span>
                      </button>
                      <button
                        className="tu-input-toolbar-btn"
                        onClick={handleClearPaste}
                        title="Clear + Paste"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                          <rect x="8" y="2" width="8" height="4" rx="1" />
                          <line x1="9" y1="13" x2="15" y2="13" />
                        </svg>
                        <span>Clear+Paste</span>
                      </button>
                      <div className="tu-input-toolbar-sep" />
                      <button
                        className="tu-input-toolbar-btn tu-input-toolbar-btn--danger"
                        onClick={handleClear}
                        title="Clear"
                        disabled={!text}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                        </svg>
                        <span>Clear</span>
                      </button>
                      <div className="tu-input-toolbar-sep" />
                      <button
                        className={`tu-input-toolbar-btn${
                          speech.listening ? ' tu-input-toolbar-btn--active' : ''
                        }`}
                        onClick={speech.handleTts}
                        title="Read Aloud"
                        disabled={!text}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                        </svg>
                        <span>Read Aloud</span>
                      </button>
                      <button
                        className={`tu-input-toolbar-btn${
                          speech.listening ? ' tu-input-toolbar-btn--active' : ''
                        }`}
                        onClick={speech.handleSpeechToText}
                        title="Speech to Text"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                          <line x1="12" y1="19" x2="12" y2="23" />
                          <line x1="8" y1="23" x2="16" y2="23" />
                        </svg>
                        <span>Speech</span>
                      </button>
                      <div className="tu-input-toolbar-sep" />
                      <button
                        className={`tu-input-toolbar-btn${
                          dyslexiaMode ? ' tu-input-toolbar-btn--active' : ''
                        }`}
                        onClick={handleDyslexiaMode}
                        title="Dyslexia-friendly font"
                      >
                        <span className="tu-input-toolbar-icon-text">Aa</span>
                        <span>Dyslexia</span>
                      </button>
                    </div>
                    {/* Find & Replace bar — shown inline below toolbar */}
                    {workspaceTabs.find((t) => t.id === activeWorkspaceId)?.panelId === 'find' && (
                      <LazyDrawer>
                        <FindReplaceDrawer
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          {...(findReplace as any)}
                          disabled={disabled}
                          text={text}
                        />
                      </LazyDrawer>
                    )}
                    <LazyDrawer>
                      {(() => {
                        const panelId = workspaceTabs.find(
                          (t) => t.id === activeWorkspaceId
                        )?.panelId;
                        const onPreview = (result: { label: string; result: string } | null) => {
                          if (result) {
                            ai.setAiResult(result);
                            setPreviewMode('result');
                          } else {
                            ai.setAiResult(null);
                            setPreviewMode(null);
                          }
                        };
                        switch (panelId) {
                          case 'wraplines':
                            return (
                              <WrapLinesDrawer
                                disabled={disabled}
                                text={text}
                                onPreview={onPreview}
                                onApply={({ prefix, suffix }) =>
                                  callApiWithParams(
                                    ENDPOINTS.WRAP_LINES,
                                    'Lines wrapped',
                                    { prefix, suffix },
                                    { toolId: 'wrap_lines', toolType: 'drawer' }
                                  )
                                }
                              />
                            );
                          case 'filterlines':
                            return (
                              <FilterLinesDrawer
                                disabled={disabled}
                                mode="keep"
                                text={text}
                                onPreview={onPreview}
                                onApply={({ pattern, case_sensitive, use_regex }) =>
                                  callApiWithParams(
                                    ENDPOINTS.FILTER_LINES,
                                    'Lines filtered (keep)',
                                    { pattern, case_sensitive, use_regex },
                                    { toolId: 'filter_lines_contain', toolType: 'drawer' }
                                  )
                                }
                              />
                            );
                          case 'droplines':
                            return (
                              <FilterLinesDrawer
                                disabled={disabled}
                                mode="drop"
                                text={text}
                                onPreview={onPreview}
                                onApply={({ pattern, case_sensitive, use_regex }) =>
                                  callApiWithParams(
                                    ENDPOINTS.REMOVE_LINES,
                                    'Lines filtered (drop)',
                                    { pattern, case_sensitive, use_regex },
                                    { toolId: 'remove_lines_contain', toolType: 'drawer' }
                                  )
                                }
                              />
                            );
                          case 'truncatelines':
                            return (
                              <TruncateLinesDrawer
                                disabled={disabled}
                                text={text}
                                onPreview={onPreview}
                                onApply={({ max_length }) =>
                                  callApiWithParams(
                                    ENDPOINTS.TRUNCATE_LINES,
                                    'Lines truncated',
                                    { max_length },
                                    { toolId: 'truncate_lines', toolType: 'drawer' }
                                  )
                                }
                              />
                            );
                          case 'nthlines':
                            return (
                              <NthLineDrawer
                                disabled={disabled}
                                text={text}
                                onPreview={onPreview}
                                onApply={({ n, offset }) =>
                                  callApiWithParams(
                                    ENDPOINTS.EXTRACT_NTH_LINES,
                                    `Every ${n} lines extracted`,
                                    { n, offset },
                                    { toolId: 'extract_nth_lines', toolType: 'drawer' }
                                  )
                                }
                              />
                            );
                          case 'cipherdrawer':
                            return (
                              <CipherDrawer
                                activeTool={
                                  workspaceTabs.find((t) => t.id === activeWorkspaceId)?.tool
                                }
                                text={text}
                                onResult={(label, result) => {
                                  ai.setAiResult({ label, result });
                                  setPreviewMode('result');
                                }}
                                showAlert={showAlert}
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                transformText={transformText as any}
                              />
                            );
                          case 'diffdrawer':
                            return (
                              <DiffDrawer
                                activeTool={
                                  workspaceTabs.find((t) => t.id === activeWorkspaceId)?.tool
                                }
                                text={text}
                                onResult={(label, result) => {
                                  ai.setAiResult({ label, result });
                                  setPreviewMode('result');
                                }}
                                showAlert={showAlert}
                              />
                            );
                          case 'jsonpath':
                            return (
                              <JsonPathDrawer
                                text={text}
                                onResult={(label, result) => {
                                  ai.setAiResult({ label, result });
                                  setPreviewMode('result');
                                }}
                                showAlert={showAlert}
                              />
                            );
                          case 'mdpreview':
                            return <MarkdownPreviewDrawer text={text} />;
                          case 'password': {
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            const PwdDrawer = PasswordDrawer as any;
                            return (
                              <PwdDrawer
                                {...generators}
                                showAlert={showAlert}
                                onResult={(pwd: string) => {
                                  aiResultSourceRef.current = 'password';
                                  ai.setAiResult({ label: 'Password', result: pwd });
                                  setPreviewMode('result');
                                }}
                              />
                            );
                          }
                          case 'randtext':
                            return (
                              <RandomTextDrawer
                                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                {...(generators as any)}
                                onResult={(txt) => {
                                  aiResultSourceRef.current = 'randtext';
                                  ai.setAiResult({ label: 'Random Text', result: txt });
                                  setPreviewMode('result');
                                }}
                              />
                            );
                          case 'fakedata':
                            return (
                              <FakeDataDrawer
                                activeTool={
                                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                  workspaceTabs.find((t) => t.id === activeWorkspaceId)?.tool as any
                                }
                                onResult={(label, result) => {
                                  ai.setAiResult({ label, result });
                                  setPreviewMode('result');
                                }}
                                showAlert={showAlert}
                              />
                            );
                          case 'loremipsum':
                            return (
                              <LoremIpsumDrawer
                                onResult={(label, result) => {
                                  ai.setAiResult({ label, result });
                                  setPreviewMode('result');
                                }}
                                showAlert={showAlert}
                              />
                            );
                          case 'samplejson':
                            return (
                              <SampleJsonDrawer
                                onResult={(label, result) => {
                                  ai.setAiResult({ label, result });
                                  setPreviewMode('result');
                                }}
                                showAlert={showAlert}
                              />
                            );
                          default:
                            return null;
                        }
                      })()}
                    </LazyDrawer>
                    {/* Formatter config bar — shown inline for formatter tools */}
                    {(() => {
                      const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
                      const fmtToolId =
                        ws?.type === 'tool' &&
                        ws.tool &&
                        ['js_fmt', 'ts_fmt', 'css_fmt', 'html_fmt'].includes(ws.tool.id)
                          ? ws.tool.id
                          : null;
                      return fmtToolId ? (
                        <FmtConfigBar
                          toolId={fmtToolId}
                          fmtCfg={formatter.fmtCfg}
                          setFmtCfg={(updater) => formatter.setFmtCfg(updater(formatter.fmtCfg))}
                        />
                      ) : null;
                    })()}
                    {/* Select tool options bar (Format, Tone, Translate, Translit) */}
                    {(() => {
                      const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
                      if (ws?.type !== 'tool' || ws.tool?.type !== 'select') return null;
                      const tool = ws.tool as ToolDefinition;
                      const currentVal =
                        (tool.selectKey
                          ? (ai as Record<string, unknown>)[tool.selectKey]
                          : undefined) || tool.options?.[0]?.[0];
                      return (
                        <div className="tu-fmtbar">
                          <span className="tu-fmtbar-lang">{tool.label}</span>
                          {tool.id === 'translate' && (
                            <>
                              <button
                                className={`tu-fmtbar-detect${
                                  ai.autoDetectLang ? ' tu-fmtbar-detect--on' : ''
                                }`}
                                onClick={() => {
                                  const next = !ai.autoDetectLang;
                                  ai.setAutoDetectLang(next);
                                  if (next && text) ai.handleDetectLanguage();
                                  else ai.setDetectedLang(null);
                                }}
                                title="Auto-detect input language"
                              >
                                <svg
                                  width="12"
                                  height="12"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <circle cx="11" cy="11" r="8" />
                                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                                </svg>
                                Auto-detect
                              </button>
                              {ai.autoDetectLang && ai.detectedLang && (
                                <span className="tu-fmtbar-detected">{ai.detectedLang}</span>
                              )}
                            </>
                          )}
                          <span className="tu-fmtbar-sep" />
                          {(tool.options || []).map(([val, label]) => (
                            <button
                              key={val}
                              className={`tu-fmtbar-opt${
                                currentVal === val ? ' tu-fmtbar-opt--on' : ''
                              }`}
                              onClick={() => {
                                const setter = tool.setterKey
                                  ? (ai as Record<string, unknown>)[tool.setterKey]
                                  : null;
                                if (typeof setter === 'function') setter(val);
                                selectValueRef.current = val;
                                executeToolAction(tool);
                              }}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      );
                    })()}
                    <div className="tu-editor-body">
                      {(() => {
                        const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
                        const isProse =
                          ws?.type === 'tool' &&
                          !!ws.tool?.group &&
                          PROSE_GROUPS.has(ws.tool.group);
                        if (isProse) {
                          return (
                            <ParagraphGutter
                              textareaRef={textareaRef}
                              text={text}
                              scrollTop={inputScrollTop}
                            />
                          );
                        }
                        return (
                          <div
                            className="tu-line-numbers"
                            ref={gutterRef as unknown as Ref<HTMLDivElement>}
                          >
                            {(text || '\n').split('\n').map((_, i) => (
                              <span key={i}>{i + 1}</span>
                            ))}
                          </div>
                        );
                      })()}
                      <textarea
                        ref={textareaRef}
                        className="tu-textarea"
                        id="text"
                        value={text}
                        onChange={(e) => {
                          setText(e.target.value);
                          if (previewMode === 'result') {
                            ai.handleAiDismiss();
                            setPreviewMode(null);
                          }
                        }}
                        onPaste={() => {
                          // After paste, auto-run the active tool with minimal delay
                          const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
                          if (ws?.type === 'tool' && ws.tool) {
                            setTimeout(() => executeToolAction(ws.tool as ToolDefinition), 150);
                          }
                        }}
                        onScroll={(e) => {
                          const ta = e.target as HTMLTextAreaElement;
                          setInputScrollTop(ta.scrollTop);
                          if (gutterRef.current) gutterRef.current.scrollTop = ta.scrollTop;
                        }}
                        placeholder="// Start typing or paste your text here..."
                        style={{
                          tabSize: formatter.fmtCfg.tabWidth,
                          MozTabSize: formatter.fmtCfg.tabWidth,
                        }}
                      />
                    </div>
                    {loading && (
                      <div className="tu-loading">
                        <div className="tu-spinner" />
                        <span>Processing...</span>
                      </div>
                    )}
                    {/* Compare With input (shown below main input when compare tool is active) */}
                    {workspaceTabs.find((t) => t.id === activeWorkspaceId)?.panelId ===
                      'compare' && (
                      <LazyDrawer>
                        <CompareInput
                          compareText={compare.compareText}
                          setCompareText={compare.setCompareText}
                          setDiffResult={compare.setDiffResult}
                        />
                      </LazyDrawer>
                    )}
                  </>
                </div>

                {/* Split resize handle */}
                <div
                  className="tu-resize-handle tu-resize-handle--split"
                  onMouseDown={splitResize.onMouseDown}
                />

                {/* ─── Right: Output (per-tool or default) ─── */}
                <div className="tu-editor-output">
                  {(() => {
                    const ws = workspaceTabs.find((t) => t.id === activeWorkspaceId);
                    if (ws?.type === 'drawer') {
                      // Compare renders diff output directly
                      if (ws.panelId === 'compare') {
                        return (
                          <LazyDrawer>
                            <CompareOutput
                              diffResult={compare.diffResult}
                              compareText={compare.compareText}
                            />
                          </LazyDrawer>
                        );
                      }
                      // These render inline in input area — fall through to OutputPanel
                      if (
                        [
                          'find',
                          'password',
                          'randtext',
                          'wraplines',
                          'filterlines',
                          'droplines',
                          'truncatelines',
                          'nthlines',
                          'cipherdrawer',
                          'diffdrawer',
                          'jsonpath',
                          'mdpreview',
                          'fakedata',
                          'loremipsum',
                          'samplejson',
                        ].includes(ws.panelId ?? '')
                      ) {
                        // fall through to OutputPanel below
                      } else {
                        const drawerDef = ws.panelId
                          ? DRAWERS[ws.panelId as keyof typeof DRAWERS]
                          : undefined;
                        return ws.panelId && drawerDef ? (
                          <DrawerPanel
                            title={drawerDef.title}
                            color={drawerDef.color}
                            onClose={() => closeWorkspaceTab(activeWorkspaceId!)}
                          >
                            <LazyDrawer>{renderDrawerContent()}</LazyDrawer>
                          </DrawerPanel>
                        ) : null;
                      }
                    }
                    const isNoInputDrawer = [
                      'password',
                      'randtext',
                      'fakedata',
                      'loremipsum',
                      'samplejson',
                    ].includes(ws?.panelId ?? '');
                    // Each tab's result is stored independently by tab ID
                    const tabResult = (
                      activeWorkspaceId ? toolResults[activeWorkspaceId] : null
                    ) as AiResult | null;
                    const displayResult = (tabResult ||
                      (isNoInputDrawer
                        ? ai.aiResult
                        : text
                          ? ai.aiResult
                          : null)) as AiResult | null;
                    return (
                      <OutputPanel
                        aiResult={displayResult || null}
                        hasMarkdown={ai.hasMarkdown}
                        onAiAccept={() => {
                          const r = displayResult;
                          if (r) {
                            if (isNoInputDrawer) {
                              navigator.clipboard.writeText(r.result);
                              showAlert('Copied to clipboard!', 'success');
                            } else {
                              setText(r.result);
                              if (ai.hasMarkdown(r.result)) setMarkdownMode(true);
                            }
                          }
                          setToolResults((prev) => {
                            const next = { ...prev };
                            delete next[activeWorkspaceId];
                            return next;
                          });
                          if (!isNoInputDrawer) {
                            ai.setAiResult(null);
                            setPreviewMode(null);
                          }
                        }}
                        onAiDismiss={() => {
                          setToolResults((prev) => {
                            const next = { ...prev };
                            if (activeWorkspaceId) delete next[activeWorkspaceId];
                            return next;
                          });
                          ai.setAiResult(null);
                          setPreviewMode(null);
                        }}
                        previewMode={displayResult ? 'result' : previewMode}
                        setPreviewMode={setPreviewMode}
                        showAlert={showAlert}
                        text={text}
                        dyslexiaMode={dyslexiaMode}
                        markdownMode={markdownMode}
                        speech={speech}
                        onDyslexiaToggle={handleDyslexiaMode}
                        activeTool={
                          (ws?.type === 'tool'
                            ? ws.tool
                            : ws?.type === 'drawer'
                              ? TOOLS.find((t) => t.panelId === ws.panelId) || null
                              : null) as ToolDefinition | null
                        }
                        loading={loading}
                        exportTools={exportTools}
                        onOutputEdit={(newText) => {
                          const updated = {
                            label: displayResult?.label ?? '',
                            ...displayResult,
                            result: newText,
                          };
                          if (activeWorkspaceId)
                            setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: updated }));
                          ai.setAiResult(updated);
                        }}
                      />
                    );
                  })()}
                </div>
              </div>

              {/* Bottom panel resize handle */}
              <div
                className="tu-resize-handle tu-resize-handle--bottom"
                onMouseDown={bottomResize.onMouseDown}
              />

              {/* Bottom panel: tabbed */}
              <BottomPanel
                pipeline={pipeline}
                history={history}
                text={text}
                style={isMobile ? undefined : { height: bottomResize.size }}
              />

              {/* Smart Suggestions — below bottom panel */}
              {suggestions.suggestions.length > 0 && (
                <SmartSuggestions
                  suggestions={suggestions.suggestions}
                  onToolClick={handleToolClick}
                  onDismiss={suggestions.dismiss}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Mobile: the sidebar is a bottom sheet — this FAB is its always-visible
          entry point (the activity bar that opens it on desktop is hidden) */}
      {isMobile && (
        <>
          {sidebarOpen && (
            <div
              className="tu-sheet-backdrop"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}
          <button
            className="tu-tools-fab"
            onClick={() => {
              if (!sidebarOpen && !activeTab) setActiveTab('all');
              setSidebarOpen((o) => !o);
            }}
            aria-expanded={sidebarOpen}
            aria-label={sidebarOpen ? 'Close tool browser' : 'Browse tools'}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            Tools
          </button>
        </>
      )}

      {/* Settings menu (rendered outside .tu-forge to escape overflow:hidden) */}
      {settingsOpen && (
        <>
          <div className="tu-settings-backdrop" onClick={() => setSettingsOpen(false)} />
          <div className="tu-settings-menu">
            {/* User info */}
            <div className="tu-settings-user">
              <div className="tu-settings-user-avatar">
                {props.user?.display_name?.charAt(0)?.toUpperCase() || 'G'}
              </div>
              <div className="tu-settings-user-info">
                <span className="tu-settings-user-name">{props.user?.display_name || 'Guest'}</span>
                <span className="tu-settings-user-email">
                  {props.user?.email || 'Not signed in'}
                </span>
              </div>
            </div>
            <div className="tu-settings-divider" />

            {/* Theme toggle */}
            <button
              className="tu-settings-item"
              onClick={() => {
                props.setMode?.(props.mode === 'dark' ? 'light' : 'dark');
                setSettingsOpen(false);
              }}
            >
              <span className="tu-settings-item-icon">
                {props.mode === 'dark' ? <SunIcon size={15} /> : <MoonIcon size={15} />}
              </span>
              <span className="tu-settings-item-label">
                {props.mode === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </span>
              <span className="tu-settings-item-hint">
                {props.mode === 'dark' ? 'Switch to light' : 'Switch to dark'}
              </span>
            </button>

            {/* Command palette */}
            <button
              className="tu-settings-item"
              onClick={() => {
                search.open();
                setSettingsOpen(false);
              }}
            >
              <span className="tu-settings-item-icon">
                <KeyboardIcon size={15} />
              </span>
              <span className="tu-settings-item-label">Command Palette</span>
              <kbd className="tu-settings-item-kbd">Ctrl+K</kbd>
            </button>

            {/* Dashboard */}
            <button
              className="tu-settings-item"
              onClick={() => {
                setSettingsOpen(false);
                navigate('/dashboard');
              }}
            >
              <span className="tu-settings-item-icon">
                <BarChart3Icon size={15} />
              </span>
              <span className="tu-settings-item-label">Dashboard</span>
              <span className="tu-settings-item-hint">Stats & settings</span>
            </button>

            {/* Upgrade to Pro — shown for authenticated free-tier users */}
            {props.isAuthenticated && subscription && !subscription.isPro && (
              <button
                className="tu-settings-item tu-settings-item--accent"
                onClick={() => {
                  setSettingsOpen(false);
                  navigate('/pricing');
                }}
              >
                <span className="tu-settings-item-icon">
                  <ZapIcon size={15} />
                </span>
                <span className="tu-settings-item-label">Upgrade to Pro</span>
                <span className="tu-settings-item-hint">View plans & pricing</span>
              </button>
            )}

            {/* Keyboard shortcuts info */}
            <button
              className="tu-settings-item"
              onClick={() => {
                setShortcutsOpen(true);
                setSettingsOpen(false);
              }}
            >
              <span className="tu-settings-item-icon">
                <CommandIcon size={15} />
              </span>
              <span className="tu-settings-item-label">Keyboard Shortcuts</span>
              <kbd className="tu-settings-item-kbd">Ctrl+/</kbd>
            </button>

            {/* Auth */}
            <div className="tu-settings-divider" />
            {props.isAuthenticated ? (
              <button
                className="tu-settings-item tu-settings-item--danger"
                onClick={() => {
                  setSettingsOpen(false);
                  handleLogout();
                }}
              >
                <span className="tu-settings-item-icon">
                  <LogOutIcon size={15} />
                </span>
                <span className="tu-settings-item-label">Sign Out</span>
              </button>
            ) : (
              <button
                className="tu-settings-item"
                onClick={() => {
                  setSettingsOpen(false);
                  navigate(ROUTES.LOGIN);
                }}
              >
                <span className="tu-settings-item-icon">
                  <LogInIcon size={15} />
                </span>
                <span className="tu-settings-item-label">Sign In</span>
                <span className="tu-settings-item-hint">Unlock AI tools</span>
              </button>
            )}

            {/* About */}
            <div className="tu-settings-footer">FixMyText v1.0 — {TOOLS.length} tools</div>
          </div>
        </>
      )}

      {/* Save to Template modal */}
      {saveModal &&
        (() => {
          const SaveModal = () => {
            const [name, setName] = useState(saveModal.defaultName);
            const inputRef = useRef<HTMLInputElement | null>(null);
            useEffect(() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }, []);
            const handleSave = () => {
              if (!name.trim()) return;
              const ws = workspaceTabs.find((t) => t.id === saveModal.tabId);
              const toolId = ws?.type === 'tool' ? (ws.tool?.id ?? null) : null;
              templates.saveDirectly(name.trim(), toolTexts[saveModal.tabId] || '', toolId);
              setSavedTabs((prev) => ({ ...prev, [saveModal.tabId]: true }));
              // Rename the tab to the template name
              setWorkspaceTabs((tabs) =>
                tabs.map((t) => (t.id === saveModal.tabId ? { ...t, label: name.trim() } : t))
              );
              setActiveTab('_templates');
              setSidebarOpen(true);
              setSaveModal(null);
            };
            return (
              <>
                <div className="tu-modal-backdrop" onClick={() => setSaveModal(null)} />
                <div className="tu-modal">
                  <div className="tu-modal-header">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    <span>Save to Templates</span>
                  </div>
                  <div className="tu-modal-body">
                    <label className="tu-modal-label">Template name</label>
                    <input
                      ref={inputRef}
                      className="tu-modal-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSave();
                        if (e.key === 'Escape') setSaveModal(null);
                      }}
                      placeholder="Enter a name..."
                    />
                  </div>
                  <div className="tu-modal-footer">
                    <button
                      className="tu-modal-btn tu-modal-btn--secondary"
                      onClick={() => setSaveModal(null)}
                    >
                      Cancel
                    </button>
                    <button
                      className="tu-modal-btn tu-modal-btn--primary"
                      onClick={handleSave}
                      disabled={!name.trim()}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </>
            );
          };
          return <SaveModal />;
        })()}

      <CommandPalette search={search} onToolClick={handleToolClick} />
      <KeyboardShortcuts
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
        groups={shortcutGroups}
        overrides={shortcutOverrides}
        updateBinding={updateBinding}
        resetAll={resetAllBindings}
        resetOne={resetOneBinding}
        isCustomized={isBindingCustomized}
      />

      {/* Sign-in gate modal */}
      {trial.showSignInGate && (
        <>
          <div className="tu-modal-backdrop" onClick={trial.dismissGate} />
          <div className="tu-modal">
            <div className="tu-modal-header">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <span>Free trial ended</span>
            </div>
            <div className="tu-modal-body">
              <p style={{ margin: '0 0 8px', fontSize: '0.85rem', color: 'var(--text-2)' }}>
                You&apos;ve used your <b>3 free tool runs</b>. Sign in to unlock unlimited access to
                all {TOOLS.length}+ tools.
              </p>
            </div>
            <div className="tu-modal-footer">
              <button className="tu-modal-btn tu-modal-btn--secondary" onClick={trial.dismissGate}>
                Maybe later
              </button>
              <button
                className="tu-modal-btn tu-modal-btn--primary"
                onClick={() => {
                  trial.dismissGate();
                  navigate(ROUTES.LOGIN);
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
