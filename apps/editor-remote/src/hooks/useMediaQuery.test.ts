import { renderHook, act } from '@testing-library/react';
import useMediaQuery from './useMediaQuery';

type ChangeListener = (e: MediaQueryListEvent) => void;

// Helper: install a controllable matchMedia stub (jsdom has none)
function mockMatchMedia(initialMatches: boolean) {
  const listeners = new Set<ChangeListener>();
  const mql = {
    matches: initialMatches,
    addEventListener: vi.fn((_type: string, cb: ChangeListener) => listeners.add(cb)),
    removeEventListener: vi.fn((_type: string, cb: ChangeListener) => listeners.delete(cb)),
  };
  vi.stubGlobal('matchMedia', vi.fn(() => mql));
  return {
    mql,
    fire(matches: boolean) {
      mql.matches = matches;
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
  };
}

describe('useMediaQuery', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when matchMedia is unavailable', () => {
    vi.stubGlobal('matchMedia', undefined);
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('returns the current match state', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query match changes', () => {
    const media = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(false);
    act(() => {
      media.fire(true);
    });
    expect(result.current).toBe(true);
  });

  it('removes the change listener on unmount', () => {
    const media = mockMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    unmount();
    expect(media.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
