import { renderHook, act } from '@testing-library/react';
import useHistory from './useHistory';

// Mock redux and RTK Query
const mockRecordOperation = vi.fn(() => ({ unwrap: () => Promise.resolve() }));
const mockClearHistoryApi = vi.fn(() => ({ unwrap: () => Promise.resolve() }));

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { accessToken: null } })),
}));

vi.mock('@/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

vi.mock('@/store/api/historyApi', () => ({
  useRecordOperationMutation: () => [mockRecordOperation],
  useClearHistoryMutation: () => [mockClearHistoryApi],
}));

import { useOidcAuth } from '@/auth/useOidcAuth';

const mockUseOidcAuth = vi.mocked(useOidcAuth);

describe('useHistory', () => {
  // vi.fn() returns a Mock — cast to target signature for use with useHistory
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setText: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let showAlert: any;

  beforeEach(() => {
    setText = vi.fn();
    showAlert = vi.fn();
    vi.clearAllMocks();
    // Default: not authenticated
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: false,
      isLoading: false,
      accessToken: null,
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('starts with empty history', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    expect(result.current.history).toEqual([]);
  });

  it('pushHistory adds an entry', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Uppercase', 'hello', 'HELLO');
    });
    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0]!.operation).toBe('Uppercase');
    expect(result.current.history[0]!.original).toBe('hello');
    expect(result.current.history[0]!.result).toBe('HELLO');
  });

  it('handleRestoreOriginal sets text to original', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Op', 'orig', 'res');
    });
    act(() => {
      result.current.handleRestoreOriginal(0);
    });
    expect(setText).toHaveBeenCalledWith('orig');
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Restored original'), 'success');
  });

  it('handleRestoreResult sets text to result', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Op', 'orig', 'res');
    });
    act(() => {
      result.current.handleRestoreResult(0);
    });
    expect(setText).toHaveBeenCalledWith('res');
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Restored result'), 'success');
  });

  it('handleUndo restores original of last entry', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Op1', 'a', 'b');
    });
    act(() => {
      result.current.pushHistory('Op2', 'c', 'd');
    });
    act(() => {
      result.current.handleUndo();
    });
    expect(setText).toHaveBeenCalledWith('c');
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Undo'), 'success');
  });

  it('handleUndo does nothing with empty history', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.handleUndo();
    });
    expect(setText).not.toHaveBeenCalled();
  });

  it('handleRedo restores result of next entry', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Op1', 'a', 'b');
    });
    act(() => {
      result.current.pushHistory('Op2', 'c', 'd');
    });
    act(() => {
      result.current.handleUndo();
    }); // undo Op2
    act(() => {
      result.current.handleUndo();
    }); // undo Op1
    act(() => {
      result.current.handleRedo();
    }); // redo Op1
    expect(setText).toHaveBeenLastCalledWith('b');
  });

  it('handleRedo does nothing at end of history', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Op1', 'a', 'b');
    });
    setText.mockClear();
    act(() => {
      result.current.handleRedo();
    });
    expect(setText).not.toHaveBeenCalled();
  });

  it('handleClearHistory empties history', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Op', 'a', 'b');
    });
    act(() => {
      result.current.handleClearHistory();
    });
    expect(result.current.history).toEqual([]);
    expect(showAlert).toHaveBeenCalledWith('History cleared', 'success');
  });

  it('records operation to backend when authenticated', () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'tok123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Op', 'orig', 'res', { toolId: 'test', toolType: 'local' });
    });
    expect(mockRecordOperation).toHaveBeenCalledWith(
      expect.objectContaining({
        tool_id: 'test',
        tool_type: 'local',
        status: 'success',
      })
    );
  });

  it('does not record to backend when unauthenticated', () => {
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.pushHistory('Op', 'orig', 'res');
    });
    expect(mockRecordOperation).not.toHaveBeenCalled();
  });

  it('clears server history when authenticated', () => {
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const { result } = renderHook(() => useHistory(setText, showAlert));
    act(() => {
      result.current.handleClearHistory();
    });
    expect(mockClearHistoryApi).toHaveBeenCalled();
  });
});
