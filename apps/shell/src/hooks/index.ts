export { useAlert } from './useAlert';
export type { AlertType, AlertItem, ShowAlertOptions, AlertContextValue } from './useAlert';

export { useTheme } from './useTheme';

// Editor-surface hooks live in apps/editor-remote/src/hooks/ after the Ph3 split.
// Shared data hooks live in @velobits/app-core/hooks/.

export { initVisitorId, getVisitorId } from '@velobits/app-core/hooks/useFingerprint';
export { default as useGamification } from '@velobits/app-core/hooks/useGamification';
export { default as useHistory } from '@velobits/app-core/hooks/useHistory';
export type { HistoryEntry, ToolMeta, HistoryValue } from '@velobits/app-core/hooks/useHistory';
export { default as usePasses } from '@velobits/app-core/hooks/usePasses';
export { default as useSubscription } from '@velobits/app-core/hooks/useSubscription';
export { default as useTrialLimit } from '@velobits/app-core/hooks/useTrialLimit';
