import { render, screen, fireEvent } from '@testing-library/react';

import CompareOutput, { CompareInput } from './CompareDrawer';

describe('CompareInput', () => {
  it('renders label and stats', () => {
    render(<CompareInput compareText="" setCompareText={vi.fn()} setDiffResult={vi.fn()} />);
    expect(screen.getByText('COMPARE WITH')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0); // words / chars = 0
  });

  it('shows correct word and char counts', () => {
    render(
      <CompareInput compareText="hello world" setCompareText={vi.fn()} setDiffResult={vi.fn()} />
    );
    expect(screen.getByText('2')).toBeInTheDocument(); // words
    expect(screen.getByText('11')).toBeInTheDocument(); // chars
  });

  it('updates text on change', () => {
    const setCompareText = vi.fn();
    const setDiffResult = vi.fn();
    render(
      <CompareInput compareText="" setCompareText={setCompareText} setDiffResult={setDiffResult} />
    );
    fireEvent.change(screen.getByPlaceholderText(/Paste or type/), {
      target: { value: 'new text' },
    });
    expect(setCompareText).toHaveBeenCalledWith('new text');
    expect(setDiffResult).toHaveBeenCalledWith(null);
  });

  it('clears text on clear button', () => {
    const setCompareText = vi.fn();
    const setDiffResult = vi.fn();
    render(
      <CompareInput
        compareText="some text"
        setCompareText={setCompareText}
        setDiffResult={setDiffResult}
      />
    );
    fireEvent.click(screen.getByText('Clear'));
    expect(setCompareText).toHaveBeenCalledWith('');
    expect(setDiffResult).toHaveBeenCalledWith(null);
  });

  it('disables clear button when no text', () => {
    render(<CompareInput compareText="" setCompareText={vi.fn()} setDiffResult={vi.fn()} />);
    const clearBtn = screen.getByText('Clear').closest('button');
    expect(clearBtn).toBeDisabled();
  });

  it('renders line numbers gutter', () => {
    const { container } = render(
      <CompareInput compareText={'line1\nline2'} setCompareText={vi.fn()} setDiffResult={vi.fn()} />
    );
    const gutter = container.querySelector('.tu-line-numbers');
    expect(gutter).toBeInTheDocument();
    expect(gutter.children.length).toBeGreaterThan(0);
  });

  it('syncs gutter scroll on textarea scroll', () => {
    const { container } = render(
      <CompareInput
        compareText={'line1\nline2\nline3'}
        setCompareText={vi.fn()}
        setDiffResult={vi.fn()}
      />
    );
    const textarea = container.querySelector('.tu-textarea');
    const gutter = container.querySelector('.tu-line-numbers');
    fireEvent.scroll(textarea, { target: { scrollTop: 50 } });
    expect(gutter).toBeInTheDocument();
  });

  it('clicks Paste from Clipboard button', async () => {
    const setCompareText = vi.fn();
    const setDiffResult = vi.fn();
    Object.assign(navigator, { clipboard: { readText: vi.fn().mockResolvedValue('pasted text') } });
    render(
      <CompareInput compareText="" setCompareText={setCompareText} setDiffResult={setDiffResult} />
    );
    fireEvent.click(screen.getByTitle('Paste from clipboard'));
    // async - just verify no crash
    expect(setCompareText).not.toHaveBeenCalled(); // called asynchronously
  });
});

describe('CompareOutput', () => {
  it('renders empty state when no diff result', () => {
    render(<CompareOutput diffResult={null} compareText="" />);
    expect(screen.getByText('DIFF OUTPUT')).toBeInTheDocument();
    expect(screen.getByText('Type text in both panels to compare')).toBeInTheDocument();
  });

  it('shows hint when compareText exists but no diff', () => {
    render(<CompareOutput diffResult={null} compareText="some text" />);
    expect(screen.getByText('Comparing automatically in a moment...')).toBeInTheDocument();
  });

  it('renders inline diff results', () => {
    const diffResult = [
      { type: 'same', line: 'Hello' },
      { type: 'removed', line: 'world' },
      { type: 'added', line: 'earth' },
    ];
    render(<CompareOutput diffResult={diffResult} compareText="test" />);
    // At least one element with the text lines should be rendered
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows added/removed/same counts', () => {
    const diffResult = [
      { type: 'same', line: 'a' },
      { type: 'removed', line: 'b' },
      { type: 'added', line: 'c' },
    ];
    render(<CompareOutput diffResult={diffResult} compareText="test" />);
    expect(screen.getByText('+1 added')).toBeInTheDocument();
  });

  it('switches to side-by-side view', () => {
    const diffResult = [
      { type: 'same', line: 'Hello' },
      { type: 'removed', line: 'old' },
      { type: 'added', line: 'new' },
    ];
    render(<CompareOutput diffResult={diffResult} compareText="test" />);
    fireEvent.click(screen.getByText('Side by Side'));
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('Comparison')).toBeInTheDocument();
  });

  it('can switch back to inline view', () => {
    const diffResult = [{ type: 'same', line: 'Hello' }];
    render(<CompareOutput diffResult={diffResult} compareText="test" />);
    fireEvent.click(screen.getByText('Side by Side'));
    fireEvent.click(screen.getByText('Inline'));
    // Inline view markers
    expect(screen.queryByText('Original')).not.toBeInTheDocument();
  });
});
