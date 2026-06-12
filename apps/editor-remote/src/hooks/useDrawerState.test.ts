import { renderHook, act } from '@testing-library/react';
import useDrawerState from './useDrawerState';

describe('useDrawerState', () => {
  it('initialises with activePanel as null', () => {
    const { result } = renderHook(() => useDrawerState());
    expect(result.current.activePanel).toBeNull();
  });

  it('exposes setActivePanel, togglePanel, closePanel', () => {
    const { result } = renderHook(() => useDrawerState());
    expect(typeof result.current.setActivePanel).toBe('function');
    expect(typeof result.current.togglePanel).toBe('function');
    expect(typeof result.current.closePanel).toBe('function');
  });

  describe('setActivePanel', () => {
    it('sets the active panel to a given string', () => {
      const { result } = renderHook(() => useDrawerState());
      act(() => {
        result.current.setActivePanel('find-replace');
      });
      expect(result.current.activePanel).toBe('find-replace');
    });

    it('sets the active panel back to null', () => {
      const { result } = renderHook(() => useDrawerState());
      act(() => {
        result.current.setActivePanel('compare');
      });
      act(() => {
        result.current.setActivePanel(null);
      });
      expect(result.current.activePanel).toBeNull();
    });
  });

  describe('togglePanel', () => {
    it('opens a closed panel', () => {
      const { result } = renderHook(() => useDrawerState());
      act(() => {
        result.current.togglePanel('history');
      });
      expect(result.current.activePanel).toBe('history');
    });

    it('closes the panel when toggled again with the same name', () => {
      const { result } = renderHook(() => useDrawerState());
      act(() => {
        result.current.togglePanel('history');
      });
      act(() => {
        result.current.togglePanel('history');
      });
      expect(result.current.activePanel).toBeNull();
    });

    it('switches from one panel to another', () => {
      const { result } = renderHook(() => useDrawerState());
      act(() => {
        result.current.togglePanel('diff');
      });
      act(() => {
        result.current.togglePanel('cipher');
      });
      expect(result.current.activePanel).toBe('cipher');
    });
  });

  describe('closePanel', () => {
    it('sets activePanel to null', () => {
      const { result } = renderHook(() => useDrawerState());
      act(() => {
        result.current.setActivePanel('templates');
      });
      act(() => {
        result.current.closePanel();
      });
      expect(result.current.activePanel).toBeNull();
    });

    it('is a no-op when panel is already closed', () => {
      const { result } = renderHook(() => useDrawerState());
      act(() => {
        result.current.closePanel();
      });
      expect(result.current.activePanel).toBeNull();
    });
  });
});
