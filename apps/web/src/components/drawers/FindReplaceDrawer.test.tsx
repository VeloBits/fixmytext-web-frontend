import { render, screen, fireEvent } from '@testing-library/react';

import FindReplaceDrawer from './FindReplaceDrawer';

function renderFR(props = {}) {
  return render(
    <FindReplaceDrawer
      findText=""
      setFindText={vi.fn()}
      replaceText=""
      setReplaceText={vi.fn()}
      findCaseSensitive={false}
      setFindCaseSensitive={vi.fn()}
      findUseRegex={false}
      setFindUseRegex={vi.fn()}
      replaceCount={null}
      setReplaceCount={vi.fn()}
      disabled={false}
      handleReplaceAll={vi.fn()}
      text="Hello World"
      {...props}
    />
  );
}

describe('FindReplaceDrawer', () => {
  it('renders find and replace inputs', () => {
    renderFR();
    expect(screen.getByPlaceholderText('Find')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Replace')).toBeInTheDocument();
  });

  it('calls setFindText on find input change', () => {
    const setFindText = vi.fn();
    const setReplaceCount = vi.fn();
    renderFR({ setFindText, setReplaceCount });
    fireEvent.change(screen.getByPlaceholderText('Find'), { target: { value: 'Hello' } });
    expect(setFindText).toHaveBeenCalledWith('Hello');
    expect(setReplaceCount).toHaveBeenCalledWith(null);
  });

  it('calls setReplaceText on replace input change', () => {
    const setReplaceText = vi.fn();
    renderFR({ setReplaceText });
    fireEvent.change(screen.getByPlaceholderText('Replace'), { target: { value: 'Hi' } });
    expect(setReplaceText).toHaveBeenCalledWith('Hi');
  });

  it('shows match count when findText has matches', () => {
    renderFR({ findText: 'Hello', text: 'Hello Hello Hello' });
    expect(screen.getByText('3 found')).toBeInTheDocument();
  });

  it('shows "No results" when findText has no matches', () => {
    renderFR({ findText: 'xyz', text: 'Hello World' });
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('does not show badge when findText is empty', () => {
    renderFR({ findText: '' });
    expect(screen.queryByText(/found/)).not.toBeInTheDocument();
    expect(screen.queryByText('No results')).not.toBeInTheDocument();
  });

  it('toggles case sensitivity', () => {
    const setFindCaseSensitive = vi.fn();
    renderFR({ setFindCaseSensitive });
    fireEvent.click(screen.getByTitle('Match Case (Aa)'));
    expect(setFindCaseSensitive).toHaveBeenCalled();
  });

  it('toggles regex mode', () => {
    const setFindUseRegex = vi.fn();
    renderFR({ setFindUseRegex });
    fireEvent.click(screen.getByTitle('Use Regular Expression (.*)'));
    expect(setFindUseRegex).toHaveBeenCalled();
  });

  it('disables replace button when findText is empty', () => {
    renderFR({ findText: '' });
    const replaceBtn = screen.getByTitle('Replace All');
    expect(replaceBtn).toBeDisabled();
  });

  it('disables replace button when no matches', () => {
    renderFR({ findText: 'xyz', text: 'Hello' });
    const replaceBtn = screen.getByTitle('Replace All');
    expect(replaceBtn).toBeDisabled();
  });

  it('calls handleReplaceAll when button clicked', () => {
    const handleReplaceAll = vi.fn();
    renderFR({ findText: 'Hello', text: 'Hello World', handleReplaceAll });
    fireEvent.click(screen.getByTitle('Replace All'));
    expect(handleReplaceAll).toHaveBeenCalled();
  });

  it('shows replacement status when replaceCount is set', () => {
    renderFR({ replaceCount: 3 });
    expect(screen.getByText('3 replacements made')).toBeInTheDocument();
  });

  it('shows singular replacement text', () => {
    renderFR({ replaceCount: 1 });
    expect(screen.getByText('1 replacement made')).toBeInTheDocument();
  });

  it('does not show status when replaceCount is null', () => {
    renderFR({ replaceCount: null });
    expect(screen.queryByText(/replacement/)).not.toBeInTheDocument();
  });

  it('respects case sensitivity in match count', () => {
    renderFR({ findText: 'hello', text: 'Hello hello HELLO', findCaseSensitive: true });
    expect(screen.getByText('1 found')).toBeInTheDocument();
  });

  it('respects regex mode in match count', () => {
    renderFR({ findText: '\\d+', text: 'abc 123 def 456', findUseRegex: true });
    expect(screen.getByText('2 found')).toBeInTheDocument();
  });

  it('handles invalid regex gracefully', () => {
    renderFR({ findText: '[invalid', text: 'abc', findUseRegex: true });
    expect(screen.getByText('No results')).toBeInTheDocument();
  });
});
