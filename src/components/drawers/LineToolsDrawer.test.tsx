import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
    mode: 'keep',
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
});
