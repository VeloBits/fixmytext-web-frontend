import { render, screen, fireEvent } from '@testing-library/react';

import DiffDrawer from './DiffDrawer';

function renderDiff(props = {}) {
  return render(
    <DiffDrawer
      activeTool={{ id: 'char_diff' }}
      text="Hello"
      onResult={vi.fn()}
      showAlert={vi.fn()}
      {...props}
    />
  );
}

describe('DiffDrawer', () => {
  it('renders the compare button', () => {
    renderDiff({ activeTool: { id: 'char_diff' } });
    expect(screen.getByRole('button', { name: 'Compare' })).toBeInTheDocument();
  });

  it('uses the tool name in the placeholder', () => {
    renderDiff({ activeTool: { id: 'word_diff' } });
    expect(screen.getByPlaceholderText(/Word Diff/)).toBeInTheDocument();
  });

  it('shows warning when text is empty', () => {
    const showAlert = vi.fn();
    renderDiff({ text: '', showAlert });
    fireEvent.click(screen.getByText('Compare'));
    expect(showAlert).toHaveBeenCalledWith('Enter text in both sides', 'warning');
  });

  it('shows warning when textB is empty', () => {
    const showAlert = vi.fn();
    renderDiff({ text: 'Hello', showAlert });
    fireEvent.click(screen.getByText('Compare'));
    expect(showAlert).toHaveBeenCalledWith('Enter text in both sides', 'warning');
  });

  it('performs char_diff comparison', () => {
    const onResult = vi.fn();
    const showAlert = vi.fn();
    renderDiff({ activeTool: { id: 'char_diff' }, text: 'abc', onResult, showAlert });

    fireEvent.change(screen.getByPlaceholderText(/Paste the second text/), {
      target: { value: 'axc' },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(onResult).toHaveBeenCalledWith(
      'Character Diff',
      expect.stringContaining('1 character difference')
    );
    expect(showAlert).toHaveBeenCalledWith('Comparison complete', 'success');
  });

  it('performs word_diff comparison', () => {
    const onResult = vi.fn();
    renderDiff({ activeTool: { id: 'word_diff' }, text: 'hello world', onResult });

    fireEvent.change(screen.getByPlaceholderText(/Paste the second text/), {
      target: { value: 'hello earth' },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(onResult).toHaveBeenCalledWith('Word Diff', expect.stringContaining('hello'));
  });

  it('performs similarity_pct comparison', () => {
    const onResult = vi.fn();
    renderDiff({ activeTool: { id: 'similarity_pct' }, text: 'hello', onResult });

    fireEvent.change(screen.getByPlaceholderText(/Paste the second text/), {
      target: { value: 'hello' },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(onResult).toHaveBeenCalledWith('Similarity Score', expect.stringContaining('100.0%'));
  });

  it('performs json_diff comparison', () => {
    const onResult = vi.fn();
    renderDiff({ activeTool: { id: 'json_diff' }, text: '{"a":1}', onResult });

    fireEvent.change(screen.getByPlaceholderText(/Paste the second text/), {
      target: { value: '{"a":2}' },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(onResult).toHaveBeenCalledWith('JSON Diff', expect.stringContaining('a'));
  });

  it('shows error for invalid JSON in json_diff', () => {
    const showAlert = vi.fn();
    renderDiff({ activeTool: { id: 'json_diff' }, text: 'not json', showAlert });

    fireEvent.change(screen.getByPlaceholderText(/Paste the second text/), {
      target: { value: 'also not json' },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(showAlert).toHaveBeenCalledWith('Both texts must be valid JSON', 'danger');
  });

  it('performs list_diff comparison', () => {
    const onResult = vi.fn();
    renderDiff({ activeTool: { id: 'list_diff' }, text: 'apple\nbanana', onResult });

    fireEvent.change(screen.getByPlaceholderText(/Paste the second text/), {
      target: { value: 'banana\ncherry' },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(onResult).toHaveBeenCalledWith('List Diff', expect.stringContaining('apple'));
  });

  it('performs text_overlap comparison', () => {
    const onResult = vi.fn();
    renderDiff({ activeTool: { id: 'text_overlap' }, text: 'the quick brown fox jumps', onResult });

    fireEvent.change(screen.getByPlaceholderText(/Paste the second text/), {
      target: { value: 'the quick brown dog runs' },
    });
    fireEvent.click(screen.getByText('Compare'));

    expect(onResult).toHaveBeenCalledWith(
      'Text Overlap',
      expect.stringContaining('the quick brown')
    );
  });

  it('shows danger for unknown comparison mode', () => {
    const showAlert = vi.fn();
    renderDiff({ activeTool: { id: 'nonexistent' }, text: 'a', showAlert });

    fireEvent.change(screen.getByPlaceholderText(/Paste the second text/), {
      target: { value: 'b' },
    });
    // 'Compare' appears as both title and button - click the button specifically
    fireEvent.click(screen.getByRole('button', { name: 'Compare' }));

    expect(showAlert).toHaveBeenCalledWith('Unknown comparison mode', 'danger');
  });

  it('renders textarea for text B', () => {
    renderDiff();
    expect(screen.getByPlaceholderText(/Paste the second text/)).toBeInTheDocument();
  });
});
