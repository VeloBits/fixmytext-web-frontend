import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HistoryDrawer from './HistoryDrawer';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyMock = any;

// Mock redux
vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => ({ accessToken: null })),
  useDispatch: () => vi.fn(),
}));

// Mock useOidcAuth - HistoryDrawer uses this for isAuthenticated
vi.mock('@velobits/app-core/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    wasAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

// Mock RTK Query hooks
vi.mock('@velobits/app-core/store/api/historyApi', () => ({
  useGetHistoryQuery: vi.fn(() => ({ data: null, isFetching: false })),
  useDeleteHistoryEntryMutation: vi.fn(() => [vi.fn(), {}]),
  useClearHistoryMutation: vi.fn(() => [vi.fn(), {}]),
}));

import { useOidcAuth } from '@velobits/app-core/auth/useOidcAuth';
const mockUseOidcAuth = vi.mocked(useOidcAuth);

describe('HistoryDrawer', () => {
  const baseProps = {
    history: [],
    handleRestoreOriginal: vi.fn(),
    handleRestoreResult: vi.fn(),
    handleClearHistory: vi.fn(),
    setText: vi.fn(),
    showAlert: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: not authenticated
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: false,
      wasAuthenticated: false,
      isLoading: false,
      accessToken: null,
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
  });

  it('renders header', () => {
    render(<HistoryDrawer {...baseProps} />);
    expect(screen.getByText('Operation History')).toBeInTheDocument();
  });

  it('shows empty state when no history', () => {
    render(<HistoryDrawer {...baseProps} />);
    expect(screen.getByText('0 operations')).toBeInTheDocument();
    expect(screen.getByText(/No operations yet/)).toBeInTheDocument();
  });

  it('renders history items', () => {
    const history = [
      { operation: 'Uppercase', original: 'hello', result: 'HELLO', timestamp: Date.now() - 5000 },
      { operation: 'Reverse', original: 'abc', result: 'cba', timestamp: Date.now() - 10000 },
    ];
    render(<HistoryDrawer {...baseProps} history={history} />);
    expect(screen.getByText('2 operations')).toBeInTheDocument();
    expect(screen.getByText('Uppercase')).toBeInTheDocument();
    expect(screen.getByText('Reverse')).toBeInTheDocument();
  });

  it('calls restore handlers', () => {
    const history = [{ operation: 'Test', original: 'in', result: 'out', timestamp: Date.now() }];
    render(<HistoryDrawer {...baseProps} history={history} />);
    const restoreInputBtns = screen.getAllByText('Restore Input');
    fireEvent.click(restoreInputBtns[0]!);
    expect(baseProps.handleRestoreOriginal).toHaveBeenCalledWith(0);
  });

  it('calls clear history handler', () => {
    const history = [{ operation: 'Test', original: 'in', result: 'out', timestamp: Date.now() }];
    render(<HistoryDrawer {...baseProps} history={history} />);
    fireEvent.click(screen.getByText('Clear'));
    expect(baseProps.handleClearHistory).toHaveBeenCalled();
  });

  it('disables clear button when history is empty', () => {
    render(<HistoryDrawer {...baseProps} />);
    const clearBtn = screen.getByText('Clear');
    expect(clearBtn).toBeDisabled();
  });

  it('shows session/saved tabs when authenticated', async () => {
    const { useSelector } = await import('react-redux');
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'token123' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<HistoryDrawer {...baseProps} />);
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('All History')).toBeInTheDocument();
  });

  it('switches to All History view when authenticated', async () => {
    const { useSelector } = await import('react-redux');
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'token123' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    expect(screen.getByText(/0 total operations/i)).toBeInTheDocument();
  });

  it('switches back to Session view when Session button clicked', async () => {
    const { useSelector } = await import('react-redux');
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'token123' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    fireEvent.click(screen.getByText('Session'));
    expect(screen.getByText('0 operations')).toBeInTheDocument();
  });

  it('calls restore result handler when Restore Output clicked', () => {
    const history = [{ operation: 'Test', original: 'in', result: 'out', timestamp: Date.now() }];
    render(<HistoryDrawer {...baseProps} history={history} />);
    const restoreOutputBtns = screen.getAllByText('Restore Output');
    fireEvent.click(restoreOutputBtns[0]!);
    expect(baseProps.handleRestoreResult).toHaveBeenCalledWith(0);
  });

  it('shows saved history items and calls setText/showAlert on restore', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery } = await import('@velobits/app-core/store/api/historyApi');
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'token123' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    (vi.mocked(useGetHistoryQuery) as AnyMock).mockReturnValue({
      data: {
        total: 1,
        items: [
          {
            id: 42,
            tool_label: 'Uppercase',
            tool_type: 'api',
            created_at: new Date().toISOString(),
            input_preview: 'hello',
            output_preview: 'HELLO',
            input_length: 5,
            output_length: 5,
          },
        ],
        has_more: false,
      },
      isFetching: false,
    });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    expect(screen.getByText('Uppercase')).toBeInTheDocument();
    const restoreInputBtns = screen.getAllByText('Restore Input');
    fireEvent.click(restoreInputBtns[0]!);
    expect(baseProps.setText).toHaveBeenCalledWith('hello');
    expect(baseProps.showAlert).toHaveBeenCalled();
  });

  it('calls delete on saved history item', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery, useDeleteHistoryEntryMutation } =
      await import('@velobits/app-core/store/api/historyApi');
    const mockDelete = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
    (vi.mocked(useDeleteHistoryEntryMutation) as AnyMock).mockReturnValue([mockDelete, {}]);
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'token123' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    (vi.mocked(useGetHistoryQuery) as AnyMock).mockReturnValue({
      data: {
        total: 1,
        items: [
          {
            id: 99,
            tool_label: 'Lowercase',
            tool_type: 'api',
            created_at: new Date().toISOString(),
            input_preview: 'HELLO',
            output_preview: 'hello',
            input_length: 5,
            output_length: 5,
          },
        ],
        has_more: false,
      },
      isFetching: false,
    });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    fireEvent.click(screen.getByText('Delete'));
    expect(mockDelete).toHaveBeenCalledWith(99);
  });

  it('clicks Clear All button in server history view', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery, useClearHistoryMutation } =
      await import('@velobits/app-core/store/api/historyApi');
    const mockClear = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
    (vi.mocked(useClearHistoryMutation) as AnyMock).mockReturnValue([mockClear, {}]);
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'token123' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    (vi.mocked(useGetHistoryQuery) as AnyMock).mockReturnValue({
      data: {
        total: 1,
        items: [
          {
            id: 1,
            tool_label: 'Test',
            tool_type: 'api',
            created_at: new Date().toISOString(),
            input_preview: 'a',
            output_preview: 'b',
            input_length: 1,
            output_length: 1,
          },
        ],
        has_more: false,
      },
      isFetching: false,
    });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    fireEvent.click(screen.getByText('Clear All'));
    expect(mockClear).toHaveBeenCalled();
  });

  // ── timeAgo branch coverage ────────────────────────────────────────

  it('shows seconds-ago for very recent history items', () => {
    const history = [
      { operation: 'Test', original: 'a', result: 'b', timestamp: Date.now() - 30000 }, // 30s ago
    ];
    render(<HistoryDrawer {...baseProps} history={history} />);
    expect(screen.getByText(/\ds ago/)).toBeInTheDocument();
  });

  it('shows minutes-ago for history items 2-59 minutes old', () => {
    const history = [
      { operation: 'Test', original: 'a', result: 'b', timestamp: Date.now() - 5 * 60 * 1000 }, // 5m ago
    ];
    render(<HistoryDrawer {...baseProps} history={history} />);
    expect(screen.getByText(/\dm ago/)).toBeInTheDocument();
  });

  it('shows hours-ago for history items over an hour old', () => {
    const history = [
      { operation: 'Test', original: 'a', result: 'b', timestamp: Date.now() - 2 * 60 * 60 * 1000 }, // 2h ago
    ];
    render(<HistoryDrawer {...baseProps} history={history} />);
    expect(screen.getByText(/\dh ago/)).toBeInTheDocument();
  });

  // ── truncate function branch ───────────────────────────────────────

  it('truncates long input/output text in session history', () => {
    const longText = 'A'.repeat(80); // > 60 chars, should be truncated
    const history = [{ operation: 'Test', original: longText, result: 'b', timestamp: Date.now() }];
    render(<HistoryDrawer {...baseProps} history={history} />);
    // truncate(str, 60) produces str.slice(0,60) + '…'
    expect(screen.getByText(new RegExp('A{60}…'))).toBeInTheDocument();
  });

  // ── Saved view Restore Output ──────────────────────────────────────

  it('calls setText/showAlert on Restore Output in saved view', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery } = await import('@velobits/app-core/store/api/historyApi');
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'tok' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    (vi.mocked(useGetHistoryQuery) as AnyMock).mockReturnValue({
      data: {
        total: 1,
        items: [
          {
            id: 7,
            tool_label: 'Uppercase',
            tool_type: 'api',
            created_at: new Date().toISOString(),
            input_preview: 'hello',
            output_preview: 'HELLO',
            input_length: 5,
            output_length: 5,
          },
        ],
        has_more: false,
      },
      isFetching: false,
    });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    const restoreOutputBtns = screen.getAllByText('Restore Output');
    fireEvent.click(restoreOutputBtns[0]!);
    expect(baseProps.setText).toHaveBeenCalledWith('HELLO');
    expect(baseProps.showAlert).toHaveBeenCalled();
  });

  // ── Pagination: Prev and Next buttons ────────────────────────────

  it('renders Prev and Next pagination buttons when total > 25', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery } = await import('@velobits/app-core/store/api/historyApi');
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'tok' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const items = Array.from({ length: 26 }, (_, i) => ({
      id: i + 1,
      tool_label: `Op${i}`,
      tool_type: 'api',
      created_at: new Date().toISOString(),
      input_preview: 'x',
      output_preview: 'y',
      input_length: 1,
      output_length: 1,
    }));
    (vi.mocked(useGetHistoryQuery) as AnyMock).mockReturnValue({
      data: { total: 26, items, has_more: true },
      isFetching: false,
    });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    expect(screen.getByText('Prev')).toBeInTheDocument();
    expect(screen.getByText('Next')).toBeInTheDocument();
    expect(screen.getByText('Prev')).toBeDisabled();
    expect(screen.getByText('Next')).not.toBeDisabled();
  });

  it('clicks Next to advance page and Prev to go back', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery } = await import('@velobits/app-core/store/api/historyApi');
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'tok' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'tok',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    const items = Array.from({ length: 1 }, (_, i) => ({
      id: i + 1,
      tool_label: `Op${i}`,
      tool_type: 'api',
      created_at: new Date().toISOString(),
      input_preview: 'x',
      output_preview: 'y',
      input_length: 1,
      output_length: 1,
    }));
    (vi.mocked(useGetHistoryQuery) as AnyMock).mockReturnValue({
      data: { total: 26, items, has_more: true },
      isFetching: false,
    });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    // Advance to page 2
    fireEvent.click(screen.getByText('Next'));
    expect(screen.getByText(/Page 2/)).toBeInTheDocument();
    // Go back to page 1
    fireEvent.click(screen.getByText('Prev'));
    expect(screen.getByText(/Page 1/)).toBeInTheDocument();
  });

  // ── isFetching: true branch (line 189) ────────────────────────────────

  it('shows loading state in saved view when isFetching is true', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery } = await import('@velobits/app-core/store/api/historyApi');
    vi.mocked(useSelector).mockReturnValue({ accessToken: 'token123' });
    mockUseOidcAuth.mockReturnValue({
      isAuthenticated: true,
      wasAuthenticated: true,
      isLoading: false,
      accessToken: 'token123',
      oidcUser: null,
      login: vi.fn(),
      logout: vi.fn(),
    });
    (vi.mocked(useGetHistoryQuery) as AnyMock).mockReturnValue({
      data: null,
      isFetching: true,
    });
    render(<HistoryDrawer {...baseProps} />);
    // Switch to the saved (All History) view
    fireEvent.click(screen.getByText('All History'));
    // When isFetching is true the loading indicator branch is taken instead of the list
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });
});
