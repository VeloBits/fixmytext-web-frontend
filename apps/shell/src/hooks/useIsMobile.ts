import { useState, useEffect } from 'react';

/**
 * Tracks whether the viewport is at or below a mobile breakpoint.
 *
 * Behaviour-only helper: use this where the editor must change *behaviour*
 * on mobile (e.g. defaulting the sidebar/bottom-panel closed). Pure layout
 * changes should stay in CSS media queries — see the `@media (max-width:768px)`
 * rules in editor.css / dashboard.css.
 *
 * Defensive against environments where `matchMedia` is unavailable (jsdom in
 * the Vitest suite does not implement it and `src/test/setup.ts` does not mock
 * it). In that case the hook reports `false` so existing tests render the
 * desktop layout unchanged.
 *
 * @param breakpointPx Max viewport width (inclusive) considered "mobile". Keep
 *   in sync with the 768px primary breakpoint used across the CSS.
 */
export default function useIsMobile(breakpointPx = 768): boolean {
  const query = `(max-width: ${breakpointPx}px)`;

  const getMatch = (): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [isMobile, setIsMobile] = useState<boolean>(getMatch);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent): void => setIsMobile(e.matches);

    // Sync in case the viewport changed between render and effect.
    setIsMobile(mql.matches);
    mql.addEventListener('change', onChange);

    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isMobile;
}
