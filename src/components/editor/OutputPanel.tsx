import { memo, useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import data from '@emoji-mart/data';
import Picker from '@emoji-mart/react';
import { useCreateShareMutation } from '../../store/api/shareApi';
import type { ToolDefinition } from '../../types/tools';

interface AiResult {
  label: string;
  result: string;
}

interface SpeechHook {
  handleTts?: () => void;
}

interface ExportTools {
  handleDownloadTxt: () => void;
  handleDownloadPdf: () => void;
  handleDownloadDocx: () => void;
  handleDownloadJson: () => void;
  handleDownloadCsv: () => void;
  handleDownloadMd: () => void;
  setOutputText?: (text: string) => void;
}

interface EmojiData {
  native: string;
}

interface OutputPanelProps {
  aiResult: AiResult | null;
  hasMarkdown: (text: string) => boolean;
  previewMode: string | null;
  setPreviewMode?: (mode: string | null) => void;
  showAlert: (msg: string, type: string) => void;
  text: string;
  dyslexiaMode: boolean;
  markdownMode: boolean;
  speech: SpeechHook;
  onDyslexiaToggle: () => void;
  activeTool: ToolDefinition | null;
  loading: boolean;
  exportTools: ExportTools | null;
  onOutputEdit: ((text: string) => void) | null;
  onAiAccept?: () => void;
  onAiDismiss?: () => void;
}

const TEXT_INTENSIVE_GROUPS = ['ai_writing', 'ai_content', 'language', 'cleanup', 'case', 'lines'];
const HTML_OUTPUT_TOOLS = new Set(['strikethrough']);

const FONTS = [
  'Default',
  'Arial',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Palatino',
  'Garamond',
  'Comic Sans MS',
];
const SIZES = [
  { label: '12', px: '12px' },
  { label: '14', px: '14px' },
  { label: '16', px: '16px' },
  { label: '18', px: '18px' },
  { label: '20', px: '20px' },
  { label: '24', px: '24px' },
  { label: '28', px: '28px' },
  { label: '32', px: '32px' },
  { label: '40', px: '40px' },
];

/**
 * Output panel that displays AI results, markdown previews, and dyslexia-friendly text.
 * Supports rich text editing, markdown rendering with DOMPurify sanitization,
 * text-to-speech, sharing, and file export.
 *
 * @param {object} props
 * @param {object|null} props.aiResult - The AI-generated result object with `label` and `result` fields.
 * @param {function} props.hasMarkdown - Function to detect if a string contains markdown.
 * @param {string|null} props.previewMode - Current preview mode: 'result', 'dyslexia', 'markdown', or null.
 * @param {function} props.showAlert - Callback to display an alert notification.
 * @param {string} props.text - The current input text.
 * @param {boolean} props.dyslexiaMode - Whether dyslexia-friendly font is active.
 * @param {boolean} props.markdownMode - Whether markdown preview mode is active.
 * @param {object} props.speech - Speech hook instance for text-to-speech.
 * @param {function} props.onDyslexiaToggle - Callback to toggle dyslexia mode.
 * @param {object|null} props.activeTool - The currently selected tool definition.
 * @param {boolean} props.loading - Whether a tool operation is in progress.
 * @param {object} props.exportTools - Export utility hooks for saving output.
 * @param {function} props.onOutputEdit - Callback when user edits the output inline.
 */
export default memo(function OutputPanel({
  aiResult,
  hasMarkdown,
  previewMode,
  showAlert,
  text,
  dyslexiaMode,
  markdownMode,
  speech,
  onDyslexiaToggle,
  activeTool,
  loading,
  exportTools,
  onOutputEdit,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAiAccept: _onAiAccept,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAiDismiss: _onAiDismiss,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  setPreviewMode: _setPreviewMode,
}: OutputPanelProps) {
  const [createShare, { isLoading: isSharing }] = useCreateShareMutation();
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [mdPreview, setMdPreview] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const saveBtnRef = useRef<HTMLButtonElement | null>(null);
  const saveMenuRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const paragraphRefs = useRef<Array<HTMLSpanElement | null>>([]);
  const emojiPickerRef = useRef<HTMLDivElement | null>(null);
  const showResult = previewMode === 'result' && aiResult;
  const showDyslexia = previewMode === 'dyslexia' && dyslexiaMode && text;
  const showMarkdown = previewMode === 'markdown' && markdownMode && text;

  const isEditable = activeTool && TEXT_INTENSIVE_GROUPS.includes(activeTool.group) && onOutputEdit;

  const outputText = showResult ? aiResult.result : showDyslexia || showMarkdown ? text : '';
  const hasContent = showResult || showDyslexia || showMarkdown;

  useEffect(() => {
    if (exportTools?.setOutputText) exportTools.setOutputText(outputText);
  }, [outputText, exportTools]);

  const { words, chars, sentences } = useMemo(
    () => ({
      words: outputText ? outputText.split(/\s+/).filter(Boolean).length : 0,
      chars: outputText ? outputText.length : 0,
      sentences: outputText
        ? outputText.split(/[.?]\s*(?=\S|$)|\n/).filter((s) => s.trim()).length
        : 0,
    }),
    [outputText]
  );

  useEffect(() => {
    if (!saveMenuOpen) return;
    const handleClick = (e) => {
      if (saveMenuRef.current?.contains(e.target)) return;
      if (saveBtnRef.current?.contains(e.target)) return;
      setSaveMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [saveMenuOpen]);

  const toggleSaveMenu = useCallback(() => {
    setSaveMenuOpen((prev) => {
      if (!prev && saveBtnRef.current) {
        const rect = saveBtnRef.current.getBoundingClientRect();
        setMenuPos({ top: rect.bottom + 4, left: rect.right });
      }
      return !prev;
    });
  }, []);

  const handleCopy = () => {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText);
    showAlert('Copied output to clipboard', 'success');
  };

  const handleTts = () => {
    if (!outputText || !speech?.handleTts) return;
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      return;
    }
    const utterance = new SpeechSynthesisUtterance(outputText);
    window.speechSynthesis.speak(utterance);
    showAlert('Reading output aloud...', 'info');
  };

  const handleShare = async () => {
    if (!outputText || isSharing) return;
    try {
      const result = await createShare({
        tool_id: activeTool?.id || 'unknown',
        tool_label: activeTool?.label || aiResult?.label || 'Text Transform',
        output_text: outputText,
      }).unwrap();
      await navigator.clipboard.writeText(result.share_url);
      showAlert('Share link copied to clipboard!', 'success');
    } catch {
      showAlert('Failed to create share link', 'danger');
    }
  };

  // ── Rich text commands (contentEditable) ──
  const execCmd = useCallback((cmd: string, value: string | null = null) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value ?? undefined);
  }, []);

  // fontSize via execCommand only supports 1-7, so we use a workaround:
  // apply fontSize 1 as a marker, then find the generated <font size="1"> and replace with inline style
  const applyFontSize = useCallback((px) => {
    editorRef.current?.focus();
    document.execCommand('fontSize', false, '1');
    const el = editorRef.current;
    if (!el) return;
    const fonts = el.querySelectorAll<HTMLElement>('font[size="1"]');
    fonts.forEach((f) => {
      f.removeAttribute('size');
      f.style.fontSize = px;
    });
  }, []);

  const insertEmoji = useCallback((emojiData: EmojiData) => {
    editorRef.current?.focus();
    document.execCommand('insertText', false, emojiData.native);
    setEmojiPickerOpen(false);
  }, []);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerOpen) return;
    const handleClick = (e) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target)) {
        setEmojiPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [emojiPickerOpen]);

  const isHtmlOutput = activeTool && HTML_OUTPUT_TOOLS.has(activeTool.id);

  // Set initial content when result changes
  useEffect(() => {
    if (editorRef.current && isEditable && aiResult?.result) {
      if (isHtmlOutput) {
        if (editorRef.current.innerHTML !== aiResult.result) {
          editorRef.current.innerHTML = aiResult.result;
        }
      } else if (editorRef.current.innerText.trim() !== aiResult.result.trim()) {
        editorRef.current.innerText = aiResult.result;
      }
    }
  }, [aiResult?.result, isEditable, isHtmlOutput]);

  const saveMenu =
    saveMenuOpen &&
    createPortal(
      <div
        className="tu-save-menu"
        ref={saveMenuRef}
        style={{ top: menuPos.top, left: menuPos.left }}
      >
        <button
          className="tu-save-menu-item"
          onClick={() => {
            exportTools!.handleDownloadTxt();
            setSaveMenuOpen(false);
          }}
        >
          <span className="tu-save-menu-icon">.txt</span>
          <span>Save TXT</span>
        </button>
        <button
          className="tu-save-menu-item"
          onClick={() => {
            exportTools!.handleDownloadPdf();
            setSaveMenuOpen(false);
          }}
        >
          <span className="tu-save-menu-icon">.pdf</span>
          <span>Save PDF</span>
        </button>
        <button
          className="tu-save-menu-item"
          onClick={() => {
            exportTools!.handleDownloadDocx();
            setSaveMenuOpen(false);
          }}
        >
          <span className="tu-save-menu-icon">.doc</span>
          <span>Save DOCX</span>
        </button>
        <button
          className="tu-save-menu-item"
          onClick={() => {
            exportTools!.handleDownloadJson();
            setSaveMenuOpen(false);
          }}
        >
          <span className="tu-save-menu-icon">{'{}'}</span>
          <span>Save JSON</span>
        </button>
        <button
          className="tu-save-menu-item"
          onClick={() => {
            exportTools!.handleDownloadCsv();
            setSaveMenuOpen(false);
          }}
        >
          <span className="tu-save-menu-icon">.csv</span>
          <span>Save CSV</span>
        </button>
        <button
          className="tu-save-menu-item"
          onClick={() => {
            exportTools!.handleDownloadMd();
            setSaveMenuOpen(false);
          }}
        >
          <span className="tu-save-menu-icon">.md</span>
          <span>Save Markdown</span>
        </button>
      </div>,
      document.body
    );

  if (!hasContent) {
    return (
      <div className="tu-output">
        <div className="tu-editor-topbar">
          <span className="tu-editor-label" title="~/FixMyText/workspace/output.txt">
            OUTPUT
          </span>
          <div className="tu-topbar-stats">
            <span className="tu-topbar-stat">
              <b>0</b> words
            </span>
            <span className="tu-topbar-stat">
              <b>0</b> chars
            </span>
          </div>
        </div>
        <div className="tu-output-empty">
          {loading ? (
            <>
              <div className="tu-spinner" style={{ width: 24, height: 24 }} />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <span className="tu-output-empty-icon">⚡</span>
              <span>
                {activeTool
                  ? 'Start typing — output updates automatically'
                  : 'Select a tool to get started'}
              </span>
              <span className="tu-output-empty-hint">Results will appear here</span>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="tu-output">
      <div className="tu-editor-topbar">
        <span className="tu-editor-label" title="~/FixMyText/workspace/output.txt">
          OUTPUT
        </span>
        <div className="tu-topbar-stats">
          <span className="tu-topbar-stat">
            <b>{words}</b> words
          </span>
          <span className="tu-topbar-stat">
            <b>{chars}</b> chars
          </span>
          <span className="tu-topbar-stat">
            <b>{sentences}</b> sentences
          </span>
        </div>
      </div>
      <div className="tu-input-toolbar">
        <button
          className="tu-input-toolbar-btn"
          onClick={handleCopy}
          title="Copy output"
          aria-label="Copy to clipboard"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          <span>Copy</span>
        </button>
        {isEditable && showResult && !mdPreview && (
          <>
            <div className="tu-input-toolbar-sep" />
            <button
              className={`tu-input-toolbar-btn${formatOpen ? ' tu-input-toolbar-btn--active' : ''}`}
              onClick={() => setFormatOpen((p) => !p)}
              title="Formatting options"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              <span>Format</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points={formatOpen ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
              </svg>
            </button>
          </>
        )}
        <div className="tu-input-toolbar-sep" />
        <button className="tu-input-toolbar-btn" onClick={handleTts} title="Read output aloud">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          </svg>
          <span>Read Aloud</span>
        </button>
        <div className="tu-input-toolbar-sep" />
        <button
          className={`tu-input-toolbar-btn${dyslexiaMode ? ' tu-input-toolbar-btn--active' : ''}`}
          onClick={onDyslexiaToggle}
          title="Dyslexia-friendly font"
        >
          <span className="tu-input-toolbar-icon-text">Aa</span>
          <span>Dyslexia</span>
        </button>
        <button
          className={`tu-input-toolbar-btn${mdPreview ? ' tu-input-toolbar-btn--active' : ''}`}
          onClick={() => setMdPreview((p) => !p)}
          title="Toggle Markdown preview"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M7 8v8l2.5-3 2.5 3V8" />
            <path d="M17 12l-2-2v8" />
          </svg>
          <span>Markdown</span>
        </button>
        {exportTools && (
          <>
            <div className="tu-input-toolbar-sep" />
            <button
              ref={saveBtnRef}
              className={`tu-input-toolbar-btn${
                saveMenuOpen ? ' tu-input-toolbar-btn--active' : ''
              }`}
              onClick={toggleSaveMenu}
              title="Save output as file"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              <span>Save As</span>
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </>
        )}
        <div className="tu-input-toolbar-sep" />
        <button
          className="tu-input-toolbar-btn"
          onClick={handleShare}
          disabled={isSharing}
          title="Generate shareable link"
          aria-label="Share result"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          <span>{isSharing ? 'Sharing...' : 'Share'}</span>
        </button>
      </div>

      {/* ── Format Panel (collapsible) ── */}
      {formatOpen && isEditable && (
        <div className="tu-fmt-panel">
          {/* Row 1: Text style buttons */}
          <div className="tu-fmt-panel-row">
            <button
              className="tu-fmt-btn tu-fmt-btn--bold"
              onClick={() => execCmd('bold')}
              title="Bold (Ctrl+B)"
            >
              B
            </button>
            <button
              className="tu-fmt-btn tu-fmt-btn--italic"
              onClick={() => execCmd('italic')}
              title="Italic (Ctrl+I)"
            >
              I
            </button>
            <button
              className="tu-fmt-btn tu-fmt-btn--underline"
              onClick={() => execCmd('underline')}
              title="Underline (Ctrl+U)"
            >
              U
            </button>
            <button
              className="tu-fmt-btn tu-fmt-btn--strike"
              onClick={() => execCmd('strikeThrough')}
              title="Strikethrough"
            >
              S
            </button>
            <span className="tu-fmt-panel-sep" />
            <button
              className="tu-fmt-btn"
              onClick={() => execCmd('insertUnorderedList')}
              title="Bullet list"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
            <button
              className="tu-fmt-btn"
              onClick={() => execCmd('insertOrderedList')}
              title="Numbered list"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="10" y1="6" x2="21" y2="6" />
                <line x1="10" y1="12" x2="21" y2="12" />
                <line x1="10" y1="18" x2="21" y2="18" />
                <path d="M4 6h1v4" />
                <path d="M4 10h2" />
                <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1" />
              </svg>
            </button>
            <span className="tu-fmt-panel-sep" />
            <button
              className="tu-fmt-btn"
              onClick={() => execCmd('justifyLeft')}
              title="Align left"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="17" y1="10" x2="3" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="17" y1="18" x2="3" y2="18" />
              </svg>
            </button>
            <button
              className="tu-fmt-btn"
              onClick={() => execCmd('justifyCenter')}
              title="Align center"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="10" x2="6" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="18" y1="18" x2="6" y2="18" />
              </svg>
            </button>
            <button
              className="tu-fmt-btn"
              onClick={() => execCmd('justifyRight')}
              title="Align right"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="21" y1="10" x2="7" y2="10" />
                <line x1="21" y1="6" x2="3" y2="6" />
                <line x1="21" y1="14" x2="3" y2="14" />
                <line x1="21" y1="18" x2="7" y2="18" />
              </svg>
            </button>
            <span className="tu-fmt-panel-sep" />
            <button
              className="tu-fmt-btn"
              onClick={() => execCmd('removeFormat')}
              title="Clear formatting"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 7V4h16v3" />
                <path d="M9 20h6" />
                <path d="M12 4v16" />
                <line x1="3" y1="21" x2="21" y2="3" />
              </svg>
            </button>
          </div>
          {/* Row 2: Font, Size, Color, Emoji */}
          <div className="tu-fmt-panel-row">
            <select
              className="tu-fmt-select"
              defaultValue="Default"
              onChange={(e) => {
                const val = e.target.value === 'Default' ? '' : e.target.value;
                execCmd('fontName', val);
              }}
              title="Font family"
            >
              {FONTS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
            <select
              className="tu-fmt-select tu-fmt-select--sm"
              defaultValue="16px"
              onChange={(e) => applyFontSize(e.target.value)}
              title="Font size"
            >
              {SIZES.map((s) => (
                <option key={s.px} value={s.px}>
                  {s.label}px
                </option>
              ))}
            </select>
            <span className="tu-fmt-panel-sep" />
            <label className="tu-fmt-color" title="Text color">
              <span className="tu-fmt-color-label">A</span>
              <input
                type="color"
                defaultValue="#D4D4D4"
                onChange={(e) => execCmd('foreColor', e.target.value)}
              />
            </label>
            <label className="tu-fmt-color tu-fmt-color--bg" title="Highlight color">
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              <input
                type="color"
                defaultValue="#264F78"
                onChange={(e) => execCmd('hiliteColor', e.target.value)}
              />
            </label>
            <span className="tu-fmt-panel-sep" />
            <div className="tu-fmt-emoji-wrap" ref={emojiPickerRef}>
              <button
                className="tu-fmt-emoji"
                onClick={() => setEmojiPickerOpen((prev) => !prev)}
                title="Emoji picker"
              >
                😀
              </button>
              {emojiPickerOpen && (
                <div className="tu-fmt-emoji-picker">
                  <Picker
                    data={data}
                    onEmojiSelect={insertEmoji}
                    theme="dark"
                    previewPosition="none"
                    skinTonePosition="search"
                    maxFrequentRows={1}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {saveMenu}
      <div className="tu-output-body">
        <div className="tu-output-text">
          {showResult ? (
            mdPreview || (activeTool?.type === 'ai' && hasMarkdown(aiResult.result)) ? (
              <>
                <div className="tu-line-numbers">
                  <span>1</span>
                </div>
                {/* Sanitized to prevent XSS from AI-generated content */}
                <div
                  className="tu-preview-markdown"
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(marked.parse(aiResult.result) as string),
                  }}
                />
              </>
            ) : isEditable ? (
              // Render each `\n`-line as its own row with one number; blank
              // lines render with no number so paragraph breaks stay visible
              // but don't get counted. Each row hosts an independent
              // contentEditable; edits are reassembled with `\n` separators.
              (() => {
                const lines = (aiResult.result || '').split('\n');
                const rebuild = () => {
                  const next = paragraphRefs.current
                    .map((el) => (el ? el.innerText : ''))
                    .join('\n');
                  if (onOutputEdit) onOutputEdit(next);
                };
                let counter = 0;
                return lines.map((line, i) => {
                  const number = line.trim() ? ++counter : null;
                  return (
                    <div className="tu-output-row" key={i}>
                      <span className="tu-output-row-num">{number ?? ''}</span>
                      <span
                        className="tu-output-row-text tu-output-row-text--editable"
                        contentEditable
                        suppressContentEditableWarning
                        ref={(el) => {
                          paragraphRefs.current[i] = el;
                          if (el && el.innerText !== line) el.innerText = line;
                        }}
                        onInput={rebuild}
                        spellCheck={false}
                      />
                    </div>
                  );
                });
              })()
            ) : isHtmlOutput ? (
              <>
                <div className="tu-line-numbers">
                  <span>1</span>
                </div>
                {/* Sanitized to prevent XSS from AI-generated content */}
                <span
                  style={{ whiteSpace: 'pre-wrap' }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(aiResult.result) }}
                />
              </>
            ) : (
              (aiResult.result || '').split('\n').map((line, i) => (
                <div className="tu-output-row" key={i}>
                  <span className="tu-output-row-num">{i + 1}</span>
                  <span className="tu-output-row-text">{line || '​'}</span>
                </div>
              ))
            )
          ) : showDyslexia ? (
            (text || '').split('\n').map((line, i) => (
              <div className="tu-output-row" key={i}>
                <span className="tu-output-row-num">{i + 1}</span>
                <span className="tu-output-row-text tu-dyslexia">{line || '​'}</span>
              </div>
            ))
          ) : showMarkdown ? (
            <>
              <div className="tu-line-numbers">
                <span>1</span>
              </div>
              {/* Sanitized to prevent XSS from AI-generated content */}
              <div
                className="tu-preview-markdown"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(text) as string) }}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
});
