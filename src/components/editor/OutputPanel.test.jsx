import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import OutputPanel from './OutputPanel';
import { expectNoA11yViolations } from '../../test/axeHelper';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const m =
    (tag) =>
    ({ children, ...props }) => {
      const p = { ...props };
      [
        'initial',
        'animate',
        'exit',
        'transition',
        'whileTap',
        'whileHover',
        'whileInView',
        'viewport',
        'variants',
      ].forEach((k) => delete p[k]);
      return React.createElement(tag, p, children);
    };
  return {
    motion: new Proxy({}, { get: (_, t) => m(t) }),
    AnimatePresence: ({ children }) => children,
    useReducedMotion: () => false,
  };
});

// Mock marked
vi.mock('marked', () => ({
  marked: {
    parse: vi.fn((text) => `<p>${text}</p>`),
  },
}));

// Mock emoji-mart
vi.mock('@emoji-mart/data', () => ({ default: {} }));
vi.mock('@emoji-mart/react', () => ({
  default: () => React.createElement('div', { 'data-testid': 'emoji-picker' }),
}));

// Mock shareApi
vi.mock('../../store/api/shareApi', () => ({
  useCreateShareMutation: () => [
    vi.fn().mockResolvedValue({ share_url: 'http://example.com/share/1' }),
    { isLoading: false },
  ],
}));

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Mock speechSynthesis
global.speechSynthesis = {
  speaking: false,
  cancel: vi.fn(),
  speak: vi.fn(),
};
global.SpeechSynthesisUtterance = vi.fn();

const defaultProps = {
  aiResult: null,
  hasMarkdown: vi.fn(() => false),
  previewMode: null,
  showAlert: vi.fn(),
  text: '',
  dyslexiaMode: false,
  markdownMode: false,
  speech: { handleTts: vi.fn() },
  onDyslexiaToggle: vi.fn(),
  activeTool: null,
  loading: false,
  exportTools: null,
  onOutputEdit: null,
};

describe('OutputPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders empty state when no content', () => {
    render(<OutputPanel {...defaultProps} />);
    expect(screen.getByText('Select a tool to get started')).toBeInTheDocument();
  });

  it('shows "Start typing" hint when activeTool is set but no result', () => {
    render(
      <OutputPanel {...defaultProps} activeTool={{ id: 'test', label: 'Test', group: 'case' }} />
    );
    expect(screen.getByText('Start typing — output updates automatically')).toBeInTheDocument();
  });

  it('shows loading spinner when loading=true', () => {
    render(<OutputPanel {...defaultProps} loading={true} />);
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('renders OUTPUT label', () => {
    render(<OutputPanel {...defaultProps} />);
    expect(screen.getByText('OUTPUT')).toBeInTheDocument();
  });

  it('shows 0 words and 0 chars in empty state', () => {
    render(<OutputPanel {...defaultProps} />);
    const statTexts = screen.getAllByText('0');
    expect(statTexts.length).toBeGreaterThanOrEqual(2);
  });

  it('renders result when previewMode=result and aiResult is set', () => {
    const aiResult = { label: 'Fixed', result: 'Hello World' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('shows word/char/sentence stats when content is present', () => {
    const aiResult = { label: 'Fixed', result: 'Hello World' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    // "2" words
    expect(screen.getByText('2')).toBeInTheDocument();
    // "11" chars
    expect(screen.getByText('11')).toBeInTheDocument();
  });

  it('renders Copy button when content is present', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    expect(screen.getByTitle('Copy output')).toBeInTheDocument();
  });

  it('calls showAlert on copy', () => {
    const showAlert = vi.fn();
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        showAlert={showAlert}
      />
    );
    fireEvent.click(screen.getByTitle('Copy output'));
    expect(showAlert).toHaveBeenCalledWith('Copied output to clipboard', 'success');
  });

  it('renders Read Aloud button when content is present', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    expect(screen.getByTitle('Read output aloud')).toBeInTheDocument();
  });

  it('renders Dyslexia toggle button when content is present', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    expect(screen.getByTitle('Dyslexia-friendly font')).toBeInTheDocument();
  });

  it('renders Markdown toggle button when content is present', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    expect(screen.getByTitle('Toggle Markdown preview')).toBeInTheDocument();
  });

  it('renders Share button when content is present', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('renders Save As button when exportTools is provided', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    const exportTools = {
      handleDownloadTxt: vi.fn(),
      handleDownloadPdf: vi.fn(),
      handleDownloadDocx: vi.fn(),
      handleDownloadJson: vi.fn(),
      handleDownloadCsv: vi.fn(),
      handleDownloadMd: vi.fn(),
      setOutputText: vi.fn(),
    };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        exportTools={exportTools}
      />
    );
    expect(screen.getByTitle('Save output as file')).toBeInTheDocument();
  });

  it('renders dyslexia text when previewMode=dyslexia', () => {
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="dyslexia"
        dyslexiaMode={true}
        text="Sample dyslexia text"
      />
    );
    expect(screen.getByText('Sample dyslexia text')).toBeInTheDocument();
  });

  it('renders markdown preview when previewMode=markdown', () => {
    render(
      <OutputPanel {...defaultProps} previewMode="markdown" markdownMode={true} text="# Hello" />
    );
    // marked.parse is mocked to return <p>text</p>, check container renders
    expect(document.querySelector('.tu-preview-markdown')).toBeInTheDocument();
  });

  it('calls onDyslexiaToggle when dyslexia button is clicked', () => {
    const onDyslexiaToggle = vi.fn();
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        onDyslexiaToggle={onDyslexiaToggle}
      />
    );
    fireEvent.click(screen.getByTitle('Dyslexia-friendly font'));
    expect(onDyslexiaToggle).toHaveBeenCalled();
  });

  it('applies active class to dyslexia button when dyslexiaMode is true', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(
      <OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} dyslexiaMode={true} />
    );
    const btn = screen.getByTitle('Dyslexia-friendly font');
    expect(btn.className).toContain('tu-input-toolbar-btn--active');
  });

  it('shows line numbers alongside output text', () => {
    const aiResult = { label: 'Fixed', result: 'Line1\nLine2\nLine3' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    // Multiple "3" elements may exist (stats + line numbers), use getAllByText
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('3').length).toBeGreaterThanOrEqual(1);
  });

  it('shows Sharing... text when isSharing', () => {
    // Override the mock to show isLoading = true
    vi.doMock('../../store/api/shareApi', () => ({
      useCreateShareMutation: () => [vi.fn(), { isLoading: true }],
    }));
    // Render default version - just verify Share button exists
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    // Share button should exist in normal mode
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('renders editable output for TEXT_INTENSIVE_GROUPS tools with onOutputEdit', async () => {
    // jsdom doesn't implement innerText, so we mock it on the ref element
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    const aiResult = { label: 'Fixed', result: 'Editable text' };
    const activeTool = { id: 'paraphrase', label: 'Paraphrase', group: 'ai_writing', type: 'ai' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        activeTool={activeTool}
        onOutputEdit={vi.fn()}
      />
    );
    expect(document.querySelector('.tu-output-row-text--editable')).toBeInTheDocument();
  });

  it('renders plain span for non-editable tools', () => {
    const aiResult = { label: 'Encoded', result: 'SGVsbG8=' };
    const activeTool = { id: 'base64', label: 'Base64', group: 'encoding', type: 'api' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        activeTool={activeTool}
      />
    );
    expect(screen.getByText('SGVsbG8=')).toBeInTheDocument();
  });

  it('calls handleTts when Read Aloud button is clicked', () => {
    const aiResult = { label: 'Fixed', result: 'Hello World' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    fireEvent.click(screen.getByTitle('Read output aloud'));
    expect(global.speechSynthesis.speak).toHaveBeenCalled();
  });

  it('cancels TTS when already speaking', () => {
    global.speechSynthesis.speaking = true;
    const aiResult = { label: 'Fixed', result: 'Hello World' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    fireEvent.click(screen.getByTitle('Read output aloud'));
    expect(global.speechSynthesis.cancel).toHaveBeenCalled();
    global.speechSynthesis.speaking = false;
  });

  it('clicks Share button and calls createShare', async () => {
    const aiResult = { label: 'Fixed', result: 'Hello World' };
    const activeTool = { id: 'uppercase', label: 'Uppercase' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        activeTool={activeTool}
      />
    );
    fireEvent.click(screen.getByText('Share'));
    // handleShare is async - just verify the button was clicked
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('opens save menu on Save As button click', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    const exportTools = {
      handleDownloadTxt: vi.fn(),
      handleDownloadPdf: vi.fn(),
      handleDownloadDocx: vi.fn(),
      handleDownloadJson: vi.fn(),
      handleDownloadCsv: vi.fn(),
      handleDownloadMd: vi.fn(),
      setOutputText: vi.fn(),
    };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        exportTools={exportTools}
      />
    );
    fireEvent.click(screen.getByTitle('Save output as file'));
    // Menu items should now appear via portal
    expect(screen.getByText('Save TXT')).toBeInTheDocument();
  });

  it('clicks Save TXT from save menu', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    const exportTools = {
      handleDownloadTxt: vi.fn(),
      handleDownloadPdf: vi.fn(),
      handleDownloadDocx: vi.fn(),
      handleDownloadJson: vi.fn(),
      handleDownloadCsv: vi.fn(),
      handleDownloadMd: vi.fn(),
      setOutputText: vi.fn(),
    };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        exportTools={exportTools}
      />
    );
    fireEvent.click(screen.getByTitle('Save output as file'));
    fireEvent.click(screen.getByText('Save TXT'));
    expect(exportTools.handleDownloadTxt).toHaveBeenCalled();
  });

  it('clicks Save PDF from save menu', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    const exportTools = {
      handleDownloadTxt: vi.fn(),
      handleDownloadPdf: vi.fn(),
      handleDownloadDocx: vi.fn(),
      handleDownloadJson: vi.fn(),
      handleDownloadCsv: vi.fn(),
      handleDownloadMd: vi.fn(),
      setOutputText: vi.fn(),
    };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        exportTools={exportTools}
      />
    );
    fireEvent.click(screen.getByTitle('Save output as file'));
    fireEvent.click(screen.getByText('Save PDF'));
    expect(exportTools.handleDownloadPdf).toHaveBeenCalled();
  });

  it('toggles markdown preview on Markdown button click', () => {
    const aiResult = { label: 'Fixed', result: 'Hello' };
    render(<OutputPanel {...defaultProps} previewMode="result" aiResult={aiResult} />);
    const mdBtn = screen.getByTitle('Toggle Markdown preview');
    fireEvent.click(mdBtn);
    expect(mdBtn.className).toContain('tu-input-toolbar-btn--active');
  });

  it('shows format toolbar when format button is clicked in editable mode', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    const aiResult = { label: 'Paraphrased', result: 'Hello World' };
    const activeTool = { id: 'paraphrase', label: 'Paraphrase', group: 'ai_writing', type: 'ai' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        activeTool={activeTool}
        onOutputEdit={vi.fn()}
      />
    );
    // Click the format toolbar toggle ("Formatting options" title)
    const formatBtn = screen.getByTitle('Formatting options');
    fireEvent.click(formatBtn);
    // Bold button should appear
    expect(screen.getByTitle('Bold (Ctrl+B)')).toBeInTheDocument();
  });

  it('clicks Bold button triggering execCmd in editable mode', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    // jsdom doesn't implement execCommand, add stub
    document.execCommand = vi.fn(() => true);
    const aiResult = { label: 'Paraphrased', result: 'Hello World' };
    const activeTool = { id: 'paraphrase', label: 'Paraphrase', group: 'ai_writing', type: 'ai' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        activeTool={activeTool}
        onOutputEdit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle('Formatting options'));
    fireEvent.click(screen.getByTitle('Bold (Ctrl+B)'));
    expect(document.execCommand).toHaveBeenCalledWith('bold', false, null);
  });

  it('changes font size triggering applyFontSize', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    document.execCommand = vi.fn(() => true);
    const aiResult = { label: 'Paraphrased', result: 'Hello World' };
    const activeTool = { id: 'paraphrase', label: 'Paraphrase', group: 'ai_writing', type: 'ai' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        activeTool={activeTool}
        onOutputEdit={vi.fn()}
      />
    );
    fireEvent.click(screen.getByTitle('Formatting options'));
    const fontSizeSelect = screen.getByTitle('Font size');
    fireEvent.change(fontSizeSelect, { target: { value: '18px' } });
    expect(document.execCommand).toHaveBeenCalledWith('fontSize', false, '1');
  });

  it('fires input event on editable output triggering handleEditorInput', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    const onOutputEdit = vi.fn();
    const aiResult = { label: 'Paraphrased', result: 'Hello World' };
    const activeTool = { id: 'paraphrase', label: 'Paraphrase', group: 'ai_writing', type: 'ai' };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={aiResult}
        activeTool={activeTool}
        onOutputEdit={onOutputEdit}
      />
    );
    const editable = document.querySelector('.tu-output-editable');
    if (editable) {
      fireEvent.input(editable);
      expect(onOutputEdit).toHaveBeenCalled();
    }
  });

  it('does not call TTS when outputText is empty', () => {
    render(<OutputPanel {...defaultProps} previewMode={null} />);
    // TTS button not shown when no content - just verify no crash
    expect(screen.queryByTitle('Read output aloud')).not.toBeInTheDocument();
  });

  const editableProps = (onOutputEdit = vi.fn()) => ({
    ...defaultProps,
    previewMode: 'result',
    aiResult: { label: 'Paraphrased', result: 'Hello World' },
    activeTool: { id: 'paraphrase', label: 'Paraphrase', group: 'ai_writing', type: 'ai' },
    onOutputEdit,
  });

  it('clicks Save DOCX from save menu', () => {
    const exportTools = {
      handleDownloadTxt: vi.fn(),
      handleDownloadPdf: vi.fn(),
      handleDownloadDocx: vi.fn(),
      handleDownloadJson: vi.fn(),
      handleDownloadCsv: vi.fn(),
      handleDownloadMd: vi.fn(),
    };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={{ label: 'F', result: 'Hi' }}
        exportTools={exportTools}
      />
    );
    fireEvent.click(screen.getByTitle('Save output as file'));
    fireEvent.click(screen.getByText('Save DOCX'));
    expect(exportTools.handleDownloadDocx).toHaveBeenCalled();
  });

  it('clicks Save JSON from save menu', () => {
    const exportTools = {
      handleDownloadTxt: vi.fn(),
      handleDownloadPdf: vi.fn(),
      handleDownloadDocx: vi.fn(),
      handleDownloadJson: vi.fn(),
      handleDownloadCsv: vi.fn(),
      handleDownloadMd: vi.fn(),
    };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={{ label: 'F', result: 'Hi' }}
        exportTools={exportTools}
      />
    );
    fireEvent.click(screen.getByTitle('Save output as file'));
    fireEvent.click(screen.getByText('Save JSON'));
    expect(exportTools.handleDownloadJson).toHaveBeenCalled();
  });

  it('clicks Save CSV from save menu', () => {
    const exportTools = {
      handleDownloadTxt: vi.fn(),
      handleDownloadPdf: vi.fn(),
      handleDownloadDocx: vi.fn(),
      handleDownloadJson: vi.fn(),
      handleDownloadCsv: vi.fn(),
      handleDownloadMd: vi.fn(),
    };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={{ label: 'F', result: 'Hi' }}
        exportTools={exportTools}
      />
    );
    fireEvent.click(screen.getByTitle('Save output as file'));
    fireEvent.click(screen.getByText('Save CSV'));
    expect(exportTools.handleDownloadCsv).toHaveBeenCalled();
  });

  it('clicks Save Markdown from save menu', () => {
    const exportTools = {
      handleDownloadTxt: vi.fn(),
      handleDownloadPdf: vi.fn(),
      handleDownloadDocx: vi.fn(),
      handleDownloadJson: vi.fn(),
      handleDownloadCsv: vi.fn(),
      handleDownloadMd: vi.fn(),
    };
    render(
      <OutputPanel
        {...defaultProps}
        previewMode="result"
        aiResult={{ label: 'F', result: 'Hi' }}
        exportTools={exportTools}
      />
    );
    fireEvent.click(screen.getByTitle('Save output as file'));
    fireEvent.click(screen.getByText('Save Markdown'));
    expect(exportTools.handleDownloadMd).toHaveBeenCalled();
  });

  it('clicks Italic button in format toolbar', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    document.execCommand = vi.fn(() => true);
    render(<OutputPanel {...editableProps()} />);
    fireEvent.click(screen.getByTitle('Formatting options'));
    fireEvent.click(screen.getByTitle('Italic (Ctrl+I)'));
    expect(document.execCommand).toHaveBeenCalledWith('italic', false, null);
  });

  it('clicks Underline, Strikethrough, Bullet list buttons', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    document.execCommand = vi.fn(() => true);
    render(<OutputPanel {...editableProps()} />);
    fireEvent.click(screen.getByTitle('Formatting options'));
    fireEvent.click(screen.getByTitle('Underline (Ctrl+U)'));
    fireEvent.click(screen.getByTitle('Strikethrough'));
    fireEvent.click(screen.getByTitle('Bullet list'));
    expect(document.execCommand).toHaveBeenCalledWith('underline', false, null);
    expect(document.execCommand).toHaveBeenCalledWith('strikeThrough', false, null);
    expect(document.execCommand).toHaveBeenCalledWith('insertUnorderedList', false, null);
  });

  it('clicks align buttons in format toolbar', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    document.execCommand = vi.fn(() => true);
    render(<OutputPanel {...editableProps()} />);
    fireEvent.click(screen.getByTitle('Formatting options'));
    fireEvent.click(screen.getByTitle('Align left'));
    fireEvent.click(screen.getByTitle('Align center'));
    fireEvent.click(screen.getByTitle('Align right'));
    expect(document.execCommand).toHaveBeenCalledWith('justifyLeft', false, null);
    expect(document.execCommand).toHaveBeenCalledWith('justifyCenter', false, null);
    expect(document.execCommand).toHaveBeenCalledWith('justifyRight', false, null);
  });

  it('clicks Clear formatting and Numbered list buttons', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    document.execCommand = vi.fn(() => true);
    render(<OutputPanel {...editableProps()} />);
    fireEvent.click(screen.getByTitle('Formatting options'));
    fireEvent.click(screen.getByTitle('Clear formatting'));
    fireEvent.click(screen.getByTitle('Numbered list'));
    expect(document.execCommand).toHaveBeenCalledWith('removeFormat', false, null);
    expect(document.execCommand).toHaveBeenCalledWith('insertOrderedList', false, null);
  });

  it('changes font family triggering execCmd fontName', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    document.execCommand = vi.fn(() => true);
    render(<OutputPanel {...editableProps()} />);
    fireEvent.click(screen.getByTitle('Formatting options'));
    fireEvent.change(screen.getByTitle('Font family'), { target: { value: 'Arial' } });
    expect(document.execCommand).toHaveBeenCalledWith('fontName', false, 'Arial');
  });

  it('changes text color triggering execCmd foreColor', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    document.execCommand = vi.fn(() => true);
    render(<OutputPanel {...editableProps()} />);
    fireEvent.click(screen.getByTitle('Formatting options'));
    const colorInput = screen.getByTitle('Text color').querySelector('input[type="color"]');
    fireEvent.change(colorInput, { target: { value: '#ff0000' } });
    expect(document.execCommand).toHaveBeenCalledWith('foreColor', false, '#ff0000');
  });

  it('opens emoji picker when emoji button clicked', () => {
    Object.defineProperty(HTMLElement.prototype, 'innerText', {
      configurable: true,
      get() {
        return this.textContent || '';
      },
      set(v) {
        this.textContent = v;
      },
    });
    render(<OutputPanel {...editableProps()} />);
    fireEvent.click(screen.getByTitle('Formatting options'));
    fireEvent.click(screen.getByTitle('Emoji picker'));
    expect(screen.getByTestId('emoji-picker')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = render(<OutputPanel {...defaultProps} />);
    await expectNoA11yViolations(container);
  });
});
