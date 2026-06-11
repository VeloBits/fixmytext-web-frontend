// Type declarations for Module Federation remote imports (host side).
// These tell TypeScript what each remote exposes so imports type-check cleanly.
// The actual module loading happens at runtime via the MF runtime.
// Prop shapes come from the shared @velobits/app-core contract so the host and
// each remote are typed against a single definition.

declare module 'editor-remote/EditorPage' {
  import type { ComponentType } from 'react';
  import type { EditorPageProps } from '@velobits/app-core/contract';

  const EditorPage: ComponentType<EditorPageProps>;
  export default EditorPage;
}

declare module 'analytics-remote/AnalyticsPage' {
  import type { ComponentType } from 'react';
  import type { AnalyticsPageProps } from '@velobits/app-core/contract';

  const AnalyticsPage: ComponentType<AnalyticsPageProps>;
  export default AnalyticsPage;
}
