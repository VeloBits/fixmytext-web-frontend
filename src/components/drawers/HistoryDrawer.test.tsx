import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import HistoryDrawer from './HistoryDrawer';

// Mock redux
vi.mock('react-redux', () => ({
  useSelector: vi.fn(() => ({ accessToken: null })),
  useDispatch: () => vi.fn(),
}));

// Mock RTK Query hooks
vi.mock('../../store/api/historyApi', () => ({
  useGetHistoryQuery: vi.fn(() => ({ data: null, isFetching: false })),
  useDeleteHistoryEntryMutation: vi.fn(() => [vi.fn(), {}]),
  useClearHistoryMutation: vi.fn(() => [vi.fn(), {}]),
}));

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
    fireEvent.click(restoreInputBtns[0]);
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
    useSelector.mockReturnValue({ accessToken: 'token123' });
    render(<HistoryDrawer {...baseProps} />);
    expect(screen.getByText('Session')).toBeInTheDocument();
    expect(screen.getByText('All History')).toBeInTheDocument();
  });

  it('switches to All History view when authenticated', async () => {
    const { useSelector } = await import('react-redux');
    useSelector.mockReturnValue({ accessToken: 'token123' });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    expect(screen.getByText(/0 total operations/i)).toBeInTheDocument();
  });

  it('switches back to Session view when Session button clicked', async () => {
    const { useSelector } = await import('react-redux');
    useSelector.mockReturnValue({ accessToken: 'token123' });
    render(<HistoryDrawer {...baseProps} />);
    fireEvent.click(screen.getByText('All History'));
    fireEvent.click(screen.getByText('Session'));
    expect(screen.getByText('0 operations')).toBeInTheDocument();
  });

  it('calls restore result handler when Restore Output clicked', () => {
    const history = [{ operation: 'Test', original: 'in', result: 'out', timestamp: Date.now() }];
    render(<HistoryDrawer {...baseProps} history={history} />);
    const restoreOutputBtns = screen.getAllByText('Restore Output');
    fireEvent.click(restoreOutputBtns[0]);
    expect(baseProps.handleRestoreResult).toHaveBeenCalledWith(0);
  });

  it('shows saved history items and calls setText/showAlert on restore', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery } = await import('../../store/api/historyApi');
    useSelector.mockReturnValue({ accessToken: 'token123' });
    useGetHistoryQuery.mockReturnValue({
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
    fireEvent.click(restoreInputBtns[0]);
    expect(baseProps.setText).toHaveBeenCalledWith('hello');
    expect(baseProps.showAlert).toHaveBeenCalled();
  });

  it('calls delete on saved history item', async () => {
    const { useSelector } = await import('react-redux');
    const { useGetHistoryQuery, useDeleteHistoryEntryMutation } = await import(
      '../../store/api/historyApi'
    );
    const mockDelete = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
    useDeleteHistoryEntryMutation.mockReturnValue([mockDelete, {}]);
    useSelector.mockReturnValue({ accessToken: 'token123' });
    useGetHistoryQuery.mockReturnValue({
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
    const { useGetHistoryQuery, useClearHistoryMutation } = await import(
      '../../store/api/historyApi'
    );
    const mockClear = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
    useClearHistoryMutation.mockReturnValue([mockClear, {}]);
    useSelector.mockReturnValue({ accessToken: 'token123' });
    useGetHistoryQuery.mockReturnValue({
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
});
