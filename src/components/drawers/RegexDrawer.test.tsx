import { render, screen, fireEvent } from '@testing-library/react';

import RegexDrawer from './RegexDrawer';

function renderRegex(props = {}) {
  return render(
    <RegexDrawer
      regexPattern=""
      setRegexPattern={vi.fn()}
      regexFlags="g"
      setRegexFlags={vi.fn()}
      regexResult={null}
      setRegexResult={vi.fn()}
      disabled={false}
      handleRegexTest={vi.fn()}
      {...props}
    />
  );
}

describe('RegexDrawer', () => {
  it('renders pattern input', () => {
    renderRegex();
    expect(screen.getByPlaceholderText(/Regex pattern/)).toBeInTheDocument();
  });

  it('renders flag checkboxes', () => {
    renderRegex();
    expect(screen.getByText('g')).toBeInTheDocument();
    expect(screen.getByText('i')).toBeInTheDocument();
    expect(screen.getByText('m')).toBeInTheDocument();
    expect(screen.getByText('s')).toBeInTheDocument();
  });

  it('calls setRegexPattern on input change', () => {
    const setRegexPattern = vi.fn();
    const setRegexResult = vi.fn();
    renderRegex({ setRegexPattern, setRegexResult });
    fireEvent.change(screen.getByPlaceholderText(/Regex pattern/), { target: { value: '\\d+' } });
    expect(setRegexPattern).toHaveBeenCalledWith('\\d+');
    expect(setRegexResult).toHaveBeenCalledWith(null);
  });

  it('calls handleRegexTest when Test button clicked', () => {
    const handleRegexTest = vi.fn();
    renderRegex({ regexPattern: '\\d+', handleRegexTest });
    fireEvent.click(screen.getByText('Test'));
    expect(handleRegexTest).toHaveBeenCalled();
  });

  it('disables Test button when no pattern', () => {
    renderRegex({ regexPattern: '' });
    expect(screen.getByText('Test')).toBeDisabled();
  });

  it('disables Test button when disabled prop is true', () => {
    renderRegex({ regexPattern: '\\d+', disabled: true });
    expect(screen.getByText('Test')).toBeDisabled();
  });

  it('shows match count when regexResult exists', () => {
    renderRegex({
      regexResult: { total: 3, matches: [{ match: '1', index: 0, groups: [] }] },
    });
    expect(screen.getByText('3 matches')).toBeInTheDocument();
  });

  it('shows singular match text', () => {
    renderRegex({
      regexResult: { total: 1, matches: [{ match: 'a', index: 0, groups: [] }] },
    });
    expect(screen.getByText('1 match')).toBeInTheDocument();
  });

  it('renders match results', () => {
    renderRegex({
      regexResult: {
        total: 2,
        matches: [
          { match: '123', index: 4, groups: [] },
          { match: '456', index: 12, groups: ['4'] },
        ],
      },
    });
    expect(screen.getByText(/\"123\" at index 4/)).toBeInTheDocument();
    expect(screen.getByText(/\"456\" at index 12/)).toBeInTheDocument();
  });

  it('toggles regex flags', () => {
    const setRegexFlags = vi.fn();
    const setRegexResult = vi.fn();
    renderRegex({ regexFlags: 'g', setRegexFlags, setRegexResult });

    // Click on the 'i' flag checkbox
    const checkboxes = screen.getAllByRole('checkbox');
    // g is index 0, i is index 1
    fireEvent.click(checkboxes[1]);
    expect(setRegexFlags).toHaveBeenCalled();
    expect(setRegexResult).toHaveBeenCalledWith(null);
  });

  it('does not render match results when no regexResult', () => {
    renderRegex({ regexResult: null });
    expect(screen.queryByText(/at index/)).not.toBeInTheDocument();
  });
});
