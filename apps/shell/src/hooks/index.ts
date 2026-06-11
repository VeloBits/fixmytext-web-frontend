export { default as useAiTools } from './useAiTools';
export type { AiResult } from './useAiTools';

export { useAlert } from './useAlert';
export type { AlertType, AlertItem, ShowAlertOptions, AlertContextValue } from './useAlert';

// useAuth removed — use useOidcAuth from @/auth/useOidcAuth directly.

export { default as useClientTools } from './useClientTools';

export { default as useDrawerState } from './useDrawerState';
export type { DrawerStateValue } from './useDrawerState';

export { default as useExport } from './useExport';
export type { ExportValue } from './useExport';

export { default as useFindReplace } from './useFindReplace';
export type { FindReplaceValue } from './useFindReplace';

export { initVisitorId, getVisitorId } from '@velobits/app-core/hooks/useFingerprint';

export { default as useFormatter } from './useFormatter';
export type { FormatterConfig, FormatterValue } from './useFormatter';

export { default as useGamification } from '@velobits/app-core/hooks/useGamification';

export { default as useGenerators } from './useGenerators';
export type { PasswordOptions, GeneratorsValue } from './useGenerators';

export { default as useHashTools } from './useHashTools';

export { default as useHistory } from '@velobits/app-core/hooks/useHistory';
export type { HistoryEntry, ToolMeta, HistoryValue } from '@velobits/app-core/hooks/useHistory';

export { default as useKeyboardShortcuts } from './useKeyboardShortcuts';
export type {
  ShortcutDef,
  ShortcutGroup,
  ShortcutBinding,
  KeybindingOverrides,
  KeyboardActions,
} from './useKeyboardShortcuts';

export { default as usePasses } from '@velobits/app-core/hooks/usePasses';

export { default as usePipeline } from './usePipeline';

export { default as useRegexTester } from './useRegexTester';

export { default as useResize } from './useResize';

export { default as useSmartSuggestions } from './useSmartSuggestions';

export { default as useSpeech } from './useSpeech';

export { default as useSubscription } from '@velobits/app-core/hooks/useSubscription';

export { default as useTemplates } from './useTemplates';

export { default as useTextCompare } from './useTextCompare';

export { useTheme } from './useTheme';

export { default as useToolSearch } from './useToolSearch';

export { default as useTrialLimit } from '@velobits/app-core/hooks/useTrialLimit';

export { default as useWordFrequency } from './useWordFrequency';
