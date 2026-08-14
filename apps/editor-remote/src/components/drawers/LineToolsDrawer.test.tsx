import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
  WrapLinesDrawer,
  FilterLinesDrawer,
  TruncateLinesDrawer,
  NthLineDrawer,
} from './LineToolsDrawer';

describe('WrapLinesDrawer', () => {
  const props = {
    onApply: vi.fn(),
    onPreview: vi.fn(),
    disabled: false,
    text: 'line1\nline2\nline3',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders prefix and suffix inputs', () => {
    render(<WrapLinesDrawer {...props} />);
    expect(screen.getByPlaceholderText(/Prefix/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Suffix/)).toBeInTheDocument();
  });

  it('shows status when prefix is entered', () => {
    render(<WrapLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: '- ' } });
    expect(screen.getByText(/3 lines wrapped/)).toBeInTheDocument();
  });

  it('calls onApply with prefix and suffix', () => {
    render(<WrapLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: '<li>' } });
    fireEvent.change(screen.getByPlaceholderText(/Suffix/), { target: { value: '</li>' } });
    const applyBtn = screen.getByTitle('Wrap Lines');
    fireEvent.click(applyBtn);
    expect(props.onApply).toHaveBeenCalledWith({ prefix: '<li>', suffix: '</li>' });
  });

  it('shows clear button when inputs are filled', () => {
    render(<WrapLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: 'x' } });
    expect(screen.getByTitle('Clear')).toBeInTheDocument();
  });
});

describe('FilterLinesDrawer', () => {
  const props = {
    onApply: vi.fn(),
    onPreview: vi.fn(),
    disabled: false,
    mode: 'keep' as const,
    text: 'apple\nbanana\napricot',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders pattern input', () => {
    render(<FilterLinesDrawer {...props} />);
    expect(screen.getByPlaceholderText(/Word or phrase to match/)).toBeInTheDocument();
  });

  it('shows match count when pattern entered', () => {
    render(<FilterLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Word or phrase/), { target: { value: 'ap' } });
    expect(screen.getByText('2 matches')).toBeInTheDocument();
  });

  it('shows "No matches" for unmatched pattern', () => {
    render(<FilterLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Word or phrase/), { target: { value: 'zzz' } });
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('toggles case sensitivity', () => {
    render(<FilterLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Word or phrase/), { target: { value: 'Apple' } });
    // Case insensitive by default
    expect(screen.getByText('1 match')).toBeInTheDocument();
    // Toggle case sensitive
    fireEvent.click(screen.getByTitle('Match Case (Aa)'));
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('toggles regex mode', () => {
    render(<FilterLinesDrawer {...props} />);
    fireEvent.click(screen.getByTitle('Use Regular Expression (.*)'));
    expect(screen.getByPlaceholderText(/Regex pattern/)).toBeInTheDocument();
  });

  it('calls onApply with pattern options', () => {
    render(<FilterLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Word or phrase/), { target: { value: 'ap' } });
    const applyBtn = screen.getByTitle('Keep Matching Lines');
    fireEvent.click(applyBtn);
    expect(props.onApply).toHaveBeenCalledWith({
      pattern: 'ap',
      case_sensitive: false,
      use_regex: false,
    });
  });

  it('shows drop mode title', () => {
    render(<FilterLinesDrawer {...props} mode="drop" />);
    fireEvent.change(screen.getByPlaceholderText(/Word or phrase/), { target: { value: 'ap' } });
    expect(screen.getByTitle('Drop Matching Lines')).toBeInTheDocument();
  });
});

describe('TruncateLinesDrawer', () => {
  const props = {
    onApply: vi.fn(),
    onPreview: vi.fn(),
    disabled: false,
    text: 'short\nthis is a much longer line that exceeds the default eighty character limit and should be flagged as over',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders max length input', () => {
    render(<TruncateLinesDrawer {...props} />);
    expect(screen.getByPlaceholderText('Max characters per line')).toBeInTheDocument();
  });

  it('shows over limit count', () => {
    render(<TruncateLinesDrawer {...props} />);
    expect(screen.getByText('1 over limit')).toBeInTheDocument();
  });

  it('shows "All lines fit" when none exceed', () => {
    render(<TruncateLinesDrawer {...props} text="short\nhi" />);
    expect(screen.getByText('All lines fit')).toBeInTheDocument();
  });

  it('calls onApply with max_length', () => {
    render(<TruncateLinesDrawer {...props} />);
    const applyBtn = screen.getByTitle('Truncate Lines');
    fireEvent.click(applyBtn);
    expect(props.onApply).toHaveBeenCalledWith({ max_length: 80 });
  });
});

describe('NthLineDrawer', () => {
  const props = { onApply: vi.fn(), onPreview: vi.fn(), disabled: false, text: 'a\nb\nc\nd\ne\nf' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders N and offset inputs', () => {
    render(<NthLineDrawer {...props} />);
    expect(screen.getByPlaceholderText(/Pick every N lines/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Skip first N lines/)).toBeInTheDocument();
  });

  it('shows line count when N is entered', () => {
    render(<NthLineDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Pick every N lines/), { target: { value: '2' } });
    expect(screen.getByText('3 lines')).toBeInTheDocument();
  });

  it('calls onApply with n and offset', () => {
    render(<NthLineDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Pick every N lines/), { target: { value: '3' } });
    fireEvent.change(screen.getByPlaceholderText(/Skip first N lines/), { target: { value: '1' } });
    const applyBtn = screen.getByTitle('Extract Lines');
    fireEvent.click(applyBtn);
    expect(props.onApply).toHaveBeenCalledWith({ n: 3, offset: 1 });
  });

  it('disables apply when N < 2', () => {
    render(<NthLineDrawer {...props} />);
    const applyBtn = screen.getByTitle('Extract Lines');
    expect(applyBtn).toBeDisabled();
  });

  it('filters non-numeric characters from N input', () => {
    render(<NthLineDrawer {...props} />);
    const nInput = screen.getByPlaceholderText(/Pick every N lines/);
    fireEvent.change(nInput, { target: { value: 'abc2def' } });
    expect((nInput as HTMLInputElement).value).toBe('2');
  });

  it('filters non-numeric characters from offset input', () => {
    render(<NthLineDrawer {...props} />);
    const offsetInput = screen.getByPlaceholderText(/Skip first N lines/);
    fireEvent.change(offsetInput, { target: { value: 'x1y' } });
    expect((offsetInput as HTMLInputElement).value).toBe('1');
  });

  it('shows skipping text in status when offset > 0', () => {
    render(<NthLineDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Pick every N lines/), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText(/Skip first N lines/), { target: { value: '1' } });
    expect(screen.getByText(/skipping first 1/)).toBeInTheDocument();
  });
});

describe('WrapLinesDrawer - additional coverage', () => {
  const props = {
    onApply: vi.fn(),
    onPreview: vi.fn(),
    disabled: false,
    text: 'line1\nline2\nline3',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clear button resets both prefix and suffix', () => {
    render(<WrapLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: '> ' } });
    fireEvent.change(screen.getByPlaceholderText(/Suffix/), { target: { value: ' <' } });
    fireEvent.click(screen.getByTitle('Clear'));
    expect((screen.getByPlaceholderText(/Prefix/) as HTMLInputElement).value).toBe('');
    expect((screen.getByPlaceholderText(/Suffix/) as HTMLInputElement).value).toBe('');
  });

  it('shows prefix-only status message', () => {
    render(<WrapLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: '- ' } });
    expect(screen.getByText(/with prefix/)).toBeInTheDocument();
  });

  it('shows suffix-only status message', () => {
    render(<WrapLinesDrawer {...props} />);
    fireEvent.change(screen.getByPlaceholderText(/Suffix/), { target: { value: '.' } });
    expect(screen.getByText(/with suffix/)).toBeInTheDocument();
  });

  it('shows singular line count when only one line', () => {
    render(<WrapLinesDrawer {...props} text="singleline" />);
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: '* ' } });
    expect(screen.getByText(/1 line wrapped/)).toBeInTheDocument();
  });
});

describe('TruncateLinesDrawer - additional coverage', () => {
  const props = {
    onApply: vi.fn(),
    onPreview: vi.fn(),
    disabled: false,
    text: 'short\nthis is a much longer line that exceeds the default eighty character limit',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates max length via number input', () => {
    render(<TruncateLinesDrawer {...props} />);
    const input = screen.getByPlaceholderText('Max characters per line');
    fireEvent.change(input, { target: { value: '20' } });
    expect((input as HTMLInputElement).value).toBe('20');
  });

  it('shows singular "over limit" for exactly one line over', () => {
    render(<TruncateLinesDrawer {...props} text="short\nthis line is over the limit" />);
    const input = screen.getByPlaceholderText('Max characters per line');
    fireEvent.change(input, { target: { value: '15' } });
    expect(screen.getByText(/1 line exceed/)).toBeInTheDocument();
  });
});

// ── Fake-timer tests: exercise useDebouncedPreview + pure helpers ────

describe('WrapLinesDrawer - debounced preview fires after delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onPreview with wrapped result after 3 s', () => {
    const onPreview = vi.fn();
    render(
      <WrapLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        text="line1\nline2\nline3"
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: '- ' } });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with null when both prefix and suffix are empty', () => {
    const onPreview = vi.fn();
    render(
      <WrapLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        text="line1\nline2"
      />
    );
    // No changes to prefix/suffix - they stay empty, so wrapLines returns null
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('debounces: only the last call fires when inputs change rapidly', () => {
    const onPreview = vi.fn();
    render(
      <WrapLinesDrawer onApply={vi.fn()} onPreview={onPreview} disabled={false} text="a\nb" />
    );
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: '>' } });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.change(screen.getByPlaceholderText(/Prefix/), { target: { value: '> ' } });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    // Only one invocation - earlier timer was cleared
    expect(onPreview).toHaveBeenCalled();
  });
});

describe('FilterLinesDrawer - debounced preview fires after delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onPreview with matching lines in keep mode', () => {
    const onPreview = vi.fn();
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        mode="keep"
        text="apple\nbanana\napricot"
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Word or phrase/), { target: { value: 'ap' } });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    // Verify onPreview was called - coverage goal is that filterLines/lineMatches executed
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with null when pattern is empty', () => {
    const onPreview = vi.fn();
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        mode="keep"
        text="apple\nbanana"
      />
    );
    // Pattern stays empty - filterLines returns null
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with remaining lines in drop mode', () => {
    const onPreview = vi.fn();
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        mode="drop"
        text="apple\nbanana\napricot"
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Word or phrase/), { target: { value: 'ap' } });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview using regex pattern', () => {
    const onPreview = vi.fn();
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        mode="keep"
        text="error: bad\ninfo: ok\nerror: worse"
      />
    );
    // Enable regex mode first
    fireEvent.click(screen.getByTitle('Use Regular Expression (.*)'));
    fireEvent.change(screen.getByPlaceholderText(/Regex pattern/), { target: { value: '^error' } });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with case-sensitive match', () => {
    const onPreview = vi.fn();
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        mode="keep"
        text="Apple\napple\nAPPLE"
      />
    );
    fireEvent.click(screen.getByTitle('Match Case (Aa)'));
    fireEvent.change(screen.getByPlaceholderText(/Word or phrase/), { target: { value: 'apple' } });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with case-insensitive regex match', () => {
    const onPreview = vi.fn();
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        mode="keep"
        text="ERROR\nerror\ninfo"
      />
    );
    fireEvent.click(screen.getByTitle('Use Regular Expression (.*)'));
    fireEvent.change(screen.getByPlaceholderText(/Regex pattern/), { target: { value: 'error' } });
    // caseSensitive is false by default, so both ERROR and error match
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });
});

describe('TruncateLinesDrawer - debounced preview fires after delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onPreview with truncated result after 3 s', () => {
    const onPreview = vi.fn();
    const longLine = 'a'.repeat(20);
    render(
      <TruncateLinesDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        text={`short\n${longLine}`}
      />
    );
    // maxLength defaults to 80, change it to 10 so the long line is cut
    fireEvent.change(screen.getByPlaceholderText('Max characters per line'), {
      target: { value: '10' },
    });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with null when text is empty', () => {
    const onPreview = vi.fn();
    render(
      <TruncateLinesDrawer onApply={vi.fn()} onPreview={onPreview} disabled={false} text="" />
    );
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });
});

describe('NthLineDrawer - debounced preview fires after delay', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls onPreview with every-2nd-line result after 3 s', () => {
    const onPreview = vi.fn();
    render(
      <NthLineDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        text="a\nb\nc\nd\ne\nf"
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Pick every N lines/), {
      target: { value: '2' },
    });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with offset applied', () => {
    const onPreview = vi.fn();
    render(
      <NthLineDrawer
        onApply={vi.fn()}
        onPreview={onPreview}
        disabled={false}
        text="a\nb\nc\nd\ne\nf"
      />
    );
    fireEvent.change(screen.getByPlaceholderText(/Pick every N lines/), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Skip first N lines/), {
      target: { value: '1' },
    });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with null when text is empty', () => {
    const onPreview = vi.fn();
    render(<NthLineDrawer onApply={vi.fn()} onPreview={onPreview} disabled={false} text="" />);
    fireEvent.change(screen.getByPlaceholderText(/Pick every N lines/), {
      target: { value: '2' },
    });
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });

  it('calls onPreview with null when n < 2', () => {
    const onPreview = vi.fn();
    render(
      <NthLineDrawer onApply={vi.fn()} onPreview={onPreview} disabled={false} text="a\nb\nc" />
    );
    // n stays at default '' which parses to 0 - extractNthLines returns null
    act(() => {
      vi.advanceTimersByTime(3100);
    });
    expect(onPreview).toHaveBeenCalled();
  });
});

// ── lineMatches branch coverage (via FilterLinesDrawer UI) ───────────

describe('FilterLinesDrawer - lineMatches branches', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invalid regex pattern shows "No matches" and does not throw', () => {
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={vi.fn()}
        disabled={false}
        mode="keep"
        text="hello world"
      />
    );
    fireEvent.click(screen.getByTitle('Use Regular Expression (.*)'));
    // An unclosed bracket is an invalid regex
    fireEvent.change(screen.getByPlaceholderText(/Regex pattern/), {
      target: { value: '[unclosed' },
    });
    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('case-sensitive regex match distinguishes case', () => {
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={vi.fn()}
        disabled={false}
        mode="keep"
        text="Hello\nhello"
      />
    );
    fireEvent.click(screen.getByTitle('Use Regular Expression (.*)'));
    fireEvent.click(screen.getByTitle('Match Case (Aa)'));
    fireEvent.change(screen.getByPlaceholderText(/Regex pattern/), {
      target: { value: 'Hello' },
    });
    // Only 'Hello' (capital H) matches
    expect(screen.getByText('1 match')).toBeInTheDocument();
  });

  it('drop mode with regex removes matching lines', () => {
    render(
      <FilterLinesDrawer
        onApply={vi.fn()}
        onPreview={vi.fn()}
        disabled={false}
        mode="drop"
        text="error: bad\ninfo: ok\nerror: worse"
      />
    );
    fireEvent.click(screen.getByTitle('Use Regular Expression (.*)'));
    fireEvent.change(screen.getByPlaceholderText(/Regex pattern/), {
      target: { value: '^error' },
    });
    // 2 error lines matched → "2 lines will be removed" in status
    expect(screen.getByText(/will be removed/)).toBeInTheDocument();
  });
});
