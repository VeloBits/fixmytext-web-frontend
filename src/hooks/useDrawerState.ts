/**
 * useDrawerState — manages which drawer panel is currently open.
 *
 * Extracted from TextForm.jsx to reduce component complexity.
 */
import { useState, useCallback } from 'react';

export default function useDrawerState() {
  const [activePanel, setActivePanel] = useState(null);

  const togglePanel = useCallback(
    (panel) => setActivePanel((prev) => (prev === panel ? null : panel)),
    []
  );

  const closePanel = useCallback(() => setActivePanel(null), []);

  return { activePanel, setActivePanel, togglePanel, closePanel };
}
