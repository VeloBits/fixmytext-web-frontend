import { useEffect, useState } from 'react';

/**
 * useMediaQuery — reactive CSS media query match
 * @param query - media query string, e.g. '(max-width: 768px)'
 * @returns whether the query currently matches (false where matchMedia is unavailable, e.g. jsdom)
 */
export default function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(
    () => typeof window.matchMedia === 'function' && window.matchMedia(query).matches
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined;
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const onChange = (e: MediaQueryListEvent): void => setMatches(e.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}
