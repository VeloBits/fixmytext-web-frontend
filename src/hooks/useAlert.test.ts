import { renderHook, act } from '@testing-library/react';
import { useAlert } from './useAlert';

describe('useAlert', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with empty alerts', () => {
    const { result } = renderHook(() => useAlert());
    expect(result.current.alerts).toEqual([]);
    expect(result.current.alert).toBeNull();
  });

  it('showAlert adds an alert and returns its id', () => {
    const { result } = renderHook(() => useAlert());
    let id;
    act(() => {
      id = result.current.showAlert('hello', 'info');
    });
    expect(id).toBeGreaterThan(0);
    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].msg).toBe('hello');
    expect(result.current.alerts[0].type).toBe('info');
    expect(result.current.alert).toBe(result.current.alerts[0]);
  });

  it('dismissAlert removes the alert', () => {
    const { result } = renderHook(() => useAlert());
    let id;
    act(() => {
      id = result.current.showAlert('bye', 'warning');
    });
    expect(result.current.alerts).toHaveLength(1);
    act(() => {
      result.current.dismissAlert(id);
    });
    expect(result.current.alerts).toHaveLength(0);
  });

  it('auto-dismisses info alerts after 2500ms', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      result.current.showAlert('auto', 'info');
    });
    expect(result.current.alerts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(result.current.alerts).toHaveLength(0);
  });

  it('auto-dismisses danger alerts after 5000ms', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      result.current.showAlert('err', 'danger');
    });
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    expect(result.current.alerts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.alerts).toHaveLength(0);
  });

  it('auto-dismisses warning alerts after 4000ms', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      result.current.showAlert('warn', 'warning');
    });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.alerts).toHaveLength(0);
  });

  it('deduplicates identical message+type', () => {
    const { result } = renderHook(() => useAlert());
    let id1, id2;
    act(() => {
      id1 = result.current.showAlert('dup', 'info');
    });
    act(() => {
      id2 = result.current.showAlert('dup', 'info');
    });
    expect(id2).toBe(-1);
    expect(result.current.alerts).toHaveLength(1);
  });

  it('caps at 5 visible toasts', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      for (let i = 0; i < 7; i++) {
        result.current.showAlert(`msg${i}`, 'info', { duration: 0 });
      }
    });
    expect(result.current.alerts.length).toBeLessThanOrEqual(5);
  });

  it('supports custom duration via options', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      result.current.showAlert('custom', 'info', { duration: 1000 });
    });
    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(result.current.alerts).toHaveLength(1);
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.alerts).toHaveLength(0);
  });

  it('does not auto-dismiss when duration is 0', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      result.current.showAlert('sticky', 'info', { duration: 0 });
    });
    act(() => {
      vi.advanceTimersByTime(10000);
    });
    expect(result.current.alerts).toHaveLength(1);
  });

  it('default type is info', () => {
    const { result } = renderHook(() => useAlert());
    act(() => {
      result.current.showAlert('test');
    });
    expect(result.current.alerts[0].type).toBe('info');
  });
});
