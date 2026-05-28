import { renderHook, act } from '@testing-library/react';
import useDrawerState from './useDrawerState';

describe('useDrawerState', () => {
  it('starts with no panel open', () => {
    const { result } = renderHook(() => useDrawerState());
    expect(result.current.activePanel).toBeNull();
  });

  it('setActivePanel opens a specific panel', () => {
    const { result } = renderHook(() => useDrawerState());
    act(() => {
      result.current.setActivePanel('history');
    });
    expect(result.current.activePanel).toBe('history');
  });

  it('setActivePanel can be set to null to close the panel', () => {
    const { result } = renderHook(() => useDrawerState());
    act(() => {
      result.current.setActivePanel('history');
    });
    act(() => {
      result.current.setActivePanel(null);
    });
    expect(result.current.activePanel).toBeNull();
  });

  it('togglePanel opens a closed panel (branch: prev !== panel)', () => {
    const { result } = renderHook(() => useDrawerState());
    act(() => {
      result.current.togglePanel('settings');
    });
    expect(result.current.activePanel).toBe('settings');
  });

  it('togglePanel closes an already-open panel (branch: prev === panel)', () => {
    const { result } = renderHook(() => useDrawerState());
    act(() => {
      result.current.togglePanel('settings');
    });
    act(() => {
      result.current.togglePanel('settings');
    });
    expect(result.current.activePanel).toBeNull();
  });

  it('togglePanel switches from one panel to another', () => {
    const { result } = renderHook(() => useDrawerState());
    act(() => {
      result.current.togglePanel('history');
    });
    act(() => {
      result.current.togglePanel('settings');
    });
    expect(result.current.activePanel).toBe('settings');
  });

  it('closePanel closes any open panel', () => {
    const { result } = renderHook(() => useDrawerState());
    act(() => {
      result.current.setActivePanel('templates');
    });
    act(() => {
      result.current.closePanel();
    });
    expect(result.current.activePanel).toBeNull();
  });

  it('closePanel is a no-op when already closed', () => {
    const { result } = renderHook(() => useDrawerState());
    act(() => {
      result.current.closePanel();
    });
    expect(result.current.activePanel).toBeNull();
  });
});
