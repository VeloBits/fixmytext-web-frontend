import { renderHook, act } from '@testing-library/react';
import type React from 'react';
import useResize from './useResize';

// Helper: cast a minimal mouse event object to React.MouseEvent for testing
function mouseEvent(clientX: number, clientY: number): React.MouseEvent {
  return { preventDefault: vi.fn(), clientX, clientY } as unknown as React.MouseEvent;
}

describe('useResize', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial size', () => {
    const { result } = renderHook(() => useResize('horizontal', 300));
    expect(result.current.size).toBe(300);
    expect(typeof result.current.onMouseDown).toBe('function');
  });

  it('reads saved size from localStorage', () => {
    localStorage.setItem('myKey', '500');
    const { result } = renderHook(() => useResize('horizontal', 300, { storageKey: 'myKey' }));
    expect(result.current.size).toBe(500);
  });

  it('clamps saved size to min/max', () => {
    localStorage.setItem('myKey', '50');
    const { result } = renderHook(() =>
      useResize('horizontal', 300, { storageKey: 'myKey', min: 100, max: 800 })
    );
    expect(result.current.size).toBe(100);
  });

  it('clamps saved size to max', () => {
    localStorage.setItem('myKey', '1000');
    const { result } = renderHook(() =>
      useResize('horizontal', 300, { storageKey: 'myKey', min: 100, max: 800 })
    );
    expect(result.current.size).toBe(800);
  });

  it('onMouseDown sets up drag state', () => {
    const { result } = renderHook(() => useResize('horizontal', 300));
    const event = mouseEvent(100, 200);
    act(() => {
      result.current.onMouseDown(event);
    });
    expect(event.preventDefault).toHaveBeenCalled();
    expect(document.body.style.cursor).toBe('col-resize');
    expect(document.body.style.userSelect).toBe('none');
  });

  it('vertical direction sets row-resize cursor', () => {
    const { result } = renderHook(() => useResize('vertical', 300));
    act(() => {
      result.current.onMouseDown(mouseEvent(100, 200));
    });
    expect(document.body.style.cursor).toBe('row-resize');
  });

  it('handles horizontal mouse drag', () => {
    const { result } = renderHook(() => useResize('horizontal', 300, { min: 100, max: 800 }));
    act(() => {
      result.current.onMouseDown(mouseEvent(100, 200));
    });

    // Simulate mousemove
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 200 }));
    });
    expect(result.current.size).toBe(350); // 300 + (150-100)

    // Simulate mouseup
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });
    expect(document.body.style.cursor).toBe('');
  });

  it('handles vertical mouse drag', () => {
    const { result } = renderHook(() => useResize('vertical', 300, { min: 100, max: 800 }));
    act(() => {
      result.current.onMouseDown(mouseEvent(100, 200));
    });

    // Vertical: delta = startPos - current (inverted)
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 100, clientY: 150 }));
    });
    expect(result.current.size).toBe(350); // 300 + (200-150)
  });

  it('clamps drag to min/max', () => {
    const { result } = renderHook(() => useResize('horizontal', 300, { min: 100, max: 400 }));
    act(() => {
      result.current.onMouseDown(mouseEvent(100, 0));
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 0 }));
    });
    expect(result.current.size).toBe(400); // clamped to max
  });

  it('saves to localStorage on mouseup when storageKey is set', () => {
    const { result } = renderHook(() =>
      useResize('horizontal', 300, { storageKey: 'resizeKey', min: 100, max: 800 })
    );
    act(() => {
      result.current.onMouseDown(mouseEvent(100, 0));
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 150, clientY: 0 }));
    });
    act(() => {
      window.dispatchEvent(new MouseEvent('mouseup'));
    });
    expect(localStorage.getItem('resizeKey')).toBeDefined();
  });

  it('does not move when not dragging', () => {
    const { result } = renderHook(() => useResize('horizontal', 300));
    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 500, clientY: 0 }));
    });
    expect(result.current.size).toBe(300); // unchanged
  });

  it('handles percent unit with containerRef', () => {
    // Use unknown cast since test mock doesn't satisfy full HTMLElement interface
    const containerRef = {
      current: {
        getBoundingClientRect: () => ({ left: 0, top: 0, width: 1000, height: 500 }),
      },
    } as unknown as React.MutableRefObject<HTMLElement>;
    const { result } = renderHook(() =>
      useResize('horizontal', 50, { min: 10, max: 90, unit: 'percent', containerRef })
    );
    act(() => {
      result.current.onMouseDown(mouseEvent(500, 0));
    });

    act(() => {
      window.dispatchEvent(new MouseEvent('mousemove', { clientX: 600, clientY: 0 }));
    });
    // 600/1000 * 100 = 60%
    expect(result.current.size).toBe(60);
  });

  it('setSize allows manual size updates', () => {
    const { result } = renderHook(() => useResize('horizontal', 300));
    act(() => {
      result.current.setSize(400);
    });
    expect(result.current.size).toBe(400);
  });

  it('cleans up event listeners on unmount', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = renderHook(() => useResize('horizontal', 300));
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('mousemove', expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith('mouseup', expect.any(Function));
    removeSpy.mockRestore();
  });
});
