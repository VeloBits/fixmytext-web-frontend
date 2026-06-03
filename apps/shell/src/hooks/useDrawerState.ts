/**
 * useDrawerState — manages which drawer panel is currently open.
 *
 * Extracted from TextForm.jsx to reduce component complexity.
 */
import { useState, useCallback } from 'react';

export interface DrawerStateValue {
  activePanel: string | null;
  setActivePanel: (panel: string | null) => void;
  togglePanel: (panel: string) => void;
  closePanel: () => void;
}

export default function useDrawerState(): DrawerStateValue {
  const [activePanel, setActivePanel] = useState<string | null>(null);

  const togglePanel = useCallback(
    (panel: string): void => setActivePanel((prev) => (prev === panel ? null : panel)),
    []
  );

  const closePanel = useCallback((): void => setActivePanel(null), []);

  return { activePanel, setActivePanel, togglePanel, closePanel };
}
