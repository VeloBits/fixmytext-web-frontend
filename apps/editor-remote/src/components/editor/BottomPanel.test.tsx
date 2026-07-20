import React from 'react';
import type { ReactNode } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BottomPanel from './BottomPanel';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const m =
    (tag: string) =>
    ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) =>
      React.createElement(tag || 'div', props as Record<string, unknown>, children);
  return {
    motion: new Proxy({}, { get: (_, tag: string) => m(tag) }),
    AnimatePresence: ({ children }: { children?: ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

// Mock PipelineStrip
vi.mock('./PipelineStrip', () => ({
  default: ({ steps, onClear }: { steps: Array<{ label: string }>; onClear: () => void }) => (
    <div data-testid="pipeline-strip">
      {steps.map((s, i) => (
        <span key={i}>{s.label}</span>
      ))}
      <button onClick={onClear}>Clear</button>
    </div>
  ),
}));

describe('BottomPanel', () => {
  const baseProps = {
    pipeline: { steps: [], clearPipeline: vi.fn() },
    history: {
      history: [],
      handleRestoreOriginal: vi.fn(),
      handleRestoreResult: vi.fn(),
      handleClearHistory: vi.fn(),
    },
    text: 'Hello world. This is a test.',
    style: {},
  };

  it('renders tab buttons', () => {
    render(<BottomPanel {...baseProps} />);
    expect(screen.getByText('Stats Dashboard')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  it('shows stats by default', () => {
    render(<BottomPanel {...baseProps} />);
    expect(screen.getByText('Words')).toBeInTheDocument();
    expect(screen.getByText('Characters')).toBeInTheDocument();
    expect(screen.getByText('Lines')).toBeInTheDocument();
  });

  it('calculates stats correctly', () => {
    render(<BottomPanel {...baseProps} text="Hello world" />);
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 words
    expect(screen.getByText('11')).toBeInTheDocument(); // 11 chars
  });

  it('shows empty state when text is empty', () => {
    render(<BottomPanel {...baseProps} text="" />);
    expect(screen.getByText('Enter some text to see statistics.')).toBeInTheDocument();
  });

  it('switches to history tab', () => {
    render(<BottomPanel {...baseProps} />);
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText(/No operations yet/)).toBeInTheDocument();
  });

  it('switches to pipeline tab', () => {
    render(<BottomPanel {...baseProps} />);
    fireEvent.click(screen.getByText('Pipeline'));
    expect(screen.getByText(/No pipeline steps yet/)).toBeInTheDocument();
  });

  it('shows pipeline steps when present', () => {
    render(
      <BottomPanel
        {...baseProps}
        pipeline={{ steps: [{ label: 'Uppercase', timestamp: 1 }], clearPipeline: vi.fn() }}
      />
    );
    fireEvent.click(screen.getByText('Pipeline'));
    expect(screen.getByTestId('pipeline-strip')).toBeInTheDocument();
  });

  it('shows history entries when present', () => {
    const history = {
      history: [{ operation: 'Test', original: 'in', result: 'out', timestamp: Date.now() }],
      handleRestoreOriginal: vi.fn(),
      handleRestoreResult: vi.fn(),
      handleClearHistory: vi.fn(),
    };
    render(<BottomPanel {...baseProps} history={history} />);
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('1 operation')).toBeInTheDocument();
  });

  it('collapses and expands panel', () => {
    render(<BottomPanel {...baseProps} />);
    const toggle = screen.getByTitle('Collapse panel');
    fireEvent.click(toggle);
    expect(screen.queryByText('Words')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Expand panel'));
    expect(screen.getByText('Words')).toBeInTheDocument();
  });

  it('collapses when clicking active tab', () => {
    render(<BottomPanel {...baseProps} />);
    // Stats is already active, clicking it again collapses
    fireEvent.click(screen.getByText('Stats Dashboard'));
    expect(screen.queryByText('Words')).not.toBeInTheDocument();
  });

  it('shows pipeline badge when steps exist', () => {
    render(
      <BottomPanel
        {...baseProps}
        pipeline={{ steps: [{ label: 'A' }, { label: 'B' }], clearPipeline: vi.fn() }}
      />
    );
    // Badge "2" appears on the Pipeline tab button; may also appear in stats
    expect(screen.getAllByText('2').length).toBeGreaterThan(0);
  });

  it('calls handleRestoreOriginal when restore input button clicked', () => {
    const history = {
      history: [{ operation: 'Upper', original: 'hello', result: 'HELLO', timestamp: Date.now() }],
      handleRestoreOriginal: vi.fn(),
      handleRestoreResult: vi.fn(),
      handleClearHistory: vi.fn(),
    };
    render(<BottomPanel {...baseProps} history={history} />);
    fireEvent.click(screen.getByText('History'));
    fireEvent.click(screen.getByTitle('Restore input'));
    expect(history.handleRestoreOriginal).toHaveBeenCalledWith(0);
  });

  it('calls handleRestoreResult when restore output button clicked', () => {
    const history = {
      history: [{ operation: 'Upper', original: 'hello', result: 'HELLO', timestamp: Date.now() }],
      handleRestoreOriginal: vi.fn(),
      handleRestoreResult: vi.fn(),
      handleClearHistory: vi.fn(),
    };
    render(<BottomPanel {...baseProps} history={history} />);
    fireEvent.click(screen.getByText('History'));
    fireEvent.click(screen.getByTitle('Restore output'));
    expect(history.handleRestoreResult).toHaveBeenCalledWith(0);
  });

  it('calls handleClearHistory when clear button clicked', () => {
    const history = {
      history: [{ operation: 'Test', original: 'a', result: 'b', timestamp: Date.now() }],
      handleRestoreOriginal: vi.fn(),
      handleRestoreResult: vi.fn(),
      handleClearHistory: vi.fn(),
    };
    render(<BottomPanel {...baseProps} history={history} />);
    fireEvent.click(screen.getByText('History'));
    fireEvent.click(screen.getByText('Clear'));
    expect(history.handleClearHistory).toHaveBeenCalled();
  });

  it('shows time formatting for older entries', () => {
    const history = {
      history: [{ operation: 'Old', original: 'a', result: 'b', timestamp: Date.now() - 3600000 }],
      handleRestoreOriginal: vi.fn(),
      handleRestoreResult: vi.fn(),
      handleClearHistory: vi.fn(),
    };
    render(<BottomPanel {...baseProps} history={history} />);
    fireEvent.click(screen.getByText('History'));
    expect(screen.getByText('1h ago')).toBeInTheDocument();
  });
});
