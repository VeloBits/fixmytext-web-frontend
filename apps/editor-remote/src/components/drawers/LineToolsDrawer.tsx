import { useEffect, useMemo, useRef, useState, type DependencyList } from 'react';

const PREVIEW_DELAY = 3000;

interface PreviewResult {
  label: string;
  result: string;
}

// ── Debounced preview hook — fires after 3s of inactivity ───────────

function useDebouncedPreview(
  onPreview: ((result: PreviewResult | null) => void) | undefined,
  deps: DependencyList,
  computeFn: () => PreviewResult | null
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onPreview?.(computeFn());
    }, PREVIEW_DELAY);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- deps is intentionally caller-supplied; onPreview/computeFn are fresh closures whose inputs are covered by deps
  }, deps);
}

// ── Match helper (shared by JS preview + badge count) ───────────────

function lineMatches(
  line: string,
  pattern: string,
  caseSensitive: boolean,
  useRegex: boolean
): boolean {
  if (!pattern.trim()) return false;
  if (useRegex) {
    try {
      const flags = caseSensitive ? '' : 'i';
      // eslint-disable-next-line security/detect-non-literal-regexp -- intentional: user-provided regex pattern in a line-filter tool
      return new RegExp(pattern, flags).test(line);
    } catch {
      return false;
    }
  }
  if (caseSensitive) return line.includes(pattern);
  return line.toLowerCase().includes(pattern.toLowerCase());
}

// ── Local preview helpers (mirror backend logic in JS) ──────────────

function filterLines(
  text: string,
  pattern: string,
  mode: 'keep' | 'drop',
  caseSensitive: boolean,
  useRegex: boolean
): string | null {
  if (!text || !pattern.trim()) return null;
  const lines = text.split('\n');
  const result =
    mode === 'keep'
      ? lines.filter((l) => lineMatches(l, pattern, caseSensitive, useRegex))
      : lines.filter((l) => !lineMatches(l, pattern, caseSensitive, useRegex));
  return result.join('\n');
}

function wrapLines(text: string, prefix: string, suffix: string): string | null {
  if (!text || (!prefix && !suffix)) return null;
  return text
    .split('\n')
    .map((l) => `${prefix}${l}${suffix}`)
    .join('\n');
}

function truncateLines(text: string, maxLen: number): string | null {
  if (!text || maxLen < 5) return null;
  return text
    .split('\n')
    .map((l) => (l.length > maxLen ? l.slice(0, maxLen - 1) + '\u2026' : l))
    .join('\n');
}

function extractNthLines(text: string, n: number, offset: number): string | null {
  if (!text || n < 2) return null;
  const lines = text.split('\n');
  const result: string[] = [];
  for (let i = offset; i < lines.length; i += n) result.push(lines[i]!);
  return result.join('\n');
}

// ── Shared icon components ──────────────────────────────────────────

const ApplyIcon = () => (
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
    <path d="M3 6h13M3 12h9M3 18h13" />
    <path d="M19 6v12" />
    <path d="M16 15l3 3 3-3" />
  </svg>
);

const ClearIcon = () => (
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
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const CheckIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const CaseSensitiveIcon = () => (
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
    <path d="M3 18l5-14h1l5 14" />
    <path d="M5.5 12h7" />
    <path d="M17 8v10" />
    <path d="M15 8h4" />
  </svg>
);

const RegexIcon = () => (
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
    <circle cx="6" cy="18" r="3" />
    <path d="M14 4l-2 4 2 4" />
    <path d="M18 4l2 4-2 4" />
    <circle cx="18" cy="18" r="1" fill="currentColor" stroke="none" />
  </svg>
);

// ── Wrap Lines ──────────────────────────────────────────────────────

interface WrapApplyArg {
  prefix: string;
  suffix: string;
}
interface WrapLinesDrawerProps {
  onApply: (arg: WrapApplyArg) => void;
  onPreview?: (result: PreviewResult | null) => void;
  disabled: boolean;
  text?: string;
}
export function WrapLinesDrawer({ onApply, onPreview, disabled, text = '' }: WrapLinesDrawerProps) {
  const [prefix, setPrefix] = useState('');
  const [suffix, setSuffix] = useState('');
  const lineCount = text ? text.split('\n').length : 0;
  const hasInput = prefix.length > 0 || suffix.length > 0;

  useDebouncedPreview(onPreview, [text, prefix, suffix], () => {
    if (!text) return null;
    const result = wrapLines(text, prefix, suffix);
    return result ? { label: 'Wrap Lines', result } : null;
  });

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field">
          <input
            className="tu-fr-input"
            placeholder='Prefix (e.g. -  , <li>, " )'
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            spellCheck={false}
            autoFocus
          />
        </div>
        {hasInput && (
          <div className="tu-fr-actions">
            <button
              className="tu-fr-action"
              onClick={() => {
                setPrefix('');
                setSuffix('');
              }}
              title="Clear"
            >
              <ClearIcon />
            </button>
          </div>
        )}
      </div>
      <div className="tu-fr-row">
        <div className="tu-fr-field">
          <input
            className="tu-fr-input"
            placeholder='Suffix (e.g. </li>, " )'
            value={suffix}
            onChange={(e) => setSuffix(e.target.value)}
            spellCheck={false}
          />
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action"
            disabled={disabled || !hasInput}
            onClick={() => onApply({ prefix, suffix })}
            title="Wrap Lines"
          >
            <ApplyIcon />
          </button>
        </div>
      </div>
      {hasInput && (
        <div className="tu-fr-status">
          <CheckIcon />
          {lineCount} line{lineCount !== 1 ? 's' : ''} wrapped
          {prefix && suffix
            ? ` with "${prefix}" … "${suffix}"`
            : prefix
              ? ` with prefix "${prefix}"`
              : ` with suffix "${suffix}"`}
        </div>
      )}
    </div>
  );
}

// ── Filter / Drop Lines (with case-sensitive + regex toggles) ───────

interface FilterApplyArg {
  pattern: string;
  case_sensitive: boolean;
  use_regex: boolean;
}
interface FilterLinesDrawerProps {
  onApply: (arg: FilterApplyArg) => void;
  onPreview?: (result: PreviewResult | null) => void;
  disabled: boolean;
  mode?: 'keep' | 'drop';
  text?: string;
}
export function FilterLinesDrawer({
  onApply,
  onPreview,
  disabled,
  mode = 'keep',
  text = '',
}: FilterLinesDrawerProps) {
  const [pattern, setPattern] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [useRegex, setUseRegex] = useState(false);

  const matchCount = useMemo(() => {
    if (!text || !pattern.trim()) return 0;
    return text.split('\n').filter((l) => lineMatches(l, pattern, caseSensitive, useRegex)).length;
  }, [text, pattern, caseSensitive, useRegex]);
  const hasPattern = pattern.trim().length > 0;
  const matchLabel = matchCount === 1 ? '1 match' : `${matchCount} matches`;

  useDebouncedPreview(onPreview, [text, pattern, mode, caseSensitive, useRegex], () => {
    if (!text) return null;
    const result = filterLines(text, pattern, mode, caseSensitive, useRegex);
    const label = mode === 'keep' ? 'Keep Lines' : 'Drop Lines';
    return result !== null ? { label, result } : null;
  });

  return (
    <div className="tu-fr">
      {/* Find row — input + toggles inside field (VS Code pattern) */}
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--has-toggles">
          <input
            className="tu-fr-input"
            placeholder={useRegex ? 'Regex pattern (e.g. \\d+, ^error)' : 'Word or phrase to match'}
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            spellCheck={false}
            autoFocus
          />
          {hasPattern && (
            <span className={`tu-fr-badge${matchCount === 0 ? ' tu-fr-badge--none' : ''}`}>
              {matchCount === 0 ? 'No matches' : matchLabel}
            </span>
          )}
          <div className="tu-fr-toggles">
            <button
              className={`tu-fr-toggle${caseSensitive ? ' tu-fr-toggle--active' : ''}`}
              onClick={() => setCaseSensitive((v) => !v)}
              title="Match Case (Aa)"
            >
              <CaseSensitiveIcon />
            </button>
            <button
              className={`tu-fr-toggle${useRegex ? ' tu-fr-toggle--active' : ''}`}
              onClick={() => setUseRegex((v) => !v)}
              title="Use Regular Expression (.*)"
            >
              <RegexIcon />
            </button>
          </div>
        </div>
        <div className="tu-fr-actions">
          {hasPattern && (
            <button className="tu-fr-action" onClick={() => setPattern('')} title="Clear">
              <ClearIcon />
            </button>
          )}
          <button
            className="tu-fr-action"
            disabled={disabled || !hasPattern || matchCount === 0}
            onClick={() => onApply({ pattern, case_sensitive: caseSensitive, use_regex: useRegex })}
            title={mode === 'keep' ? 'Keep Matching Lines' : 'Drop Matching Lines'}
          >
            <ApplyIcon />
          </button>
        </div>
      </div>

      {/* Status bar */}
      {hasPattern && matchCount > 0 && (
        <div className="tu-fr-status">
          <CheckIcon />
          {matchLabel} —{' '}
          {mode === 'keep'
            ? `${matchCount} line${matchCount !== 1 ? 's' : ''} will be kept`
            : `${matchCount} line${matchCount !== 1 ? 's' : ''} will be removed`}
        </div>
      )}
    </div>
  );
}

// ── Truncate Lines ──────────────────────────────────────────────────

interface TruncateApplyArg {
  max_length: number;
}
interface TruncateLinesDrawerProps {
  onApply: (arg: TruncateApplyArg) => void;
  onPreview?: (result: PreviewResult | null) => void;
  disabled: boolean;
  text?: string;
}
export function TruncateLinesDrawer({
  onApply,
  onPreview,
  disabled,
  text = '',
}: TruncateLinesDrawerProps) {
  const [maxLength, setMaxLength] = useState(80);
  const overCount = useMemo(() => {
    if (!text) return 0;
    return text.split('\n').filter((l) => l.length > maxLength).length;
  }, [text, maxLength]);
  const hasInput = maxLength >= 5;

  useDebouncedPreview(onPreview, [text, maxLength], () => {
    if (!text) return null;
    const result = truncateLines(text, maxLength);
    return result ? { label: 'Truncate Lines', result } : null;
  });

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field">
          <input
            className="tu-fr-input"
            type="number"
            min="5"
            max="1000"
            placeholder="Max characters per line"
            value={maxLength}
            onChange={(e) => setMaxLength(Number(e.target.value))}
            autoFocus
          />
          {hasInput && (
            <span className={`tu-fr-badge${overCount === 0 ? ' tu-fr-badge--none' : ''}`}>
              {overCount === 0 ? 'All lines fit' : `${overCount} over limit`}
            </span>
          )}
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action"
            disabled={disabled || !hasInput || overCount === 0}
            onClick={() => onApply({ max_length: maxLength })}
            title="Truncate Lines"
          >
            <ApplyIcon />
          </button>
        </div>
      </div>
      {hasInput && overCount > 0 && (
        <div className="tu-fr-status">
          {overCount} line{overCount !== 1 ? 's' : ''} exceed {maxLength} chars — will be cut with …
        </div>
      )}
    </div>
  );
}

// ── Every Nth Line ──────────────────────────────────────────────────

interface NthApplyArg {
  n: number;
  offset: number;
}
interface NthLineDrawerProps {
  onApply: (arg: NthApplyArg) => void;
  onPreview?: (result: PreviewResult | null) => void;
  disabled: boolean;
  text?: string;
}
export function NthLineDrawer({ onApply, onPreview, disabled, text = '' }: NthLineDrawerProps) {
  const [n, setN] = useState('');
  const [offset, setOffset] = useState('');
  const nVal = parseInt(n, 10) || 0;
  const offVal = parseInt(offset, 10) || 0;
  const resultCount = useMemo(() => {
    if (!text || nVal < 2) return 0;
    const lines = text.split('\n');
    let count = 0;
    for (let i = offVal; i < lines.length; i += nVal) count++;
    return count;
  }, [text, nVal, offVal]);
  const hasInput = nVal >= 2;

  useDebouncedPreview(onPreview, [text, nVal, offVal], () => {
    if (!text) return null;
    const result = extractNthLines(text, nVal, offVal);
    return result !== null ? { label: 'Every Nth Line', result } : null;
  });

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field">
          <input
            className="tu-fr-input"
            placeholder="Pick every N lines (e.g. 2, 3, 5)"
            value={n}
            onChange={(e) => setN(e.target.value.replace(/[^0-9]/g, ''))}
            spellCheck={false}
            autoFocus
          />
          {hasInput && text && (
            <span className="tu-fr-badge">
              {resultCount} line{resultCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <div className="tu-fr-row">
        <div className="tu-fr-field">
          <input
            className="tu-fr-input"
            placeholder="Skip first N lines (default 0)"
            value={offset}
            onChange={(e) => setOffset(e.target.value.replace(/[^0-9]/g, ''))}
            spellCheck={false}
          />
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action"
            disabled={disabled || !hasInput || resultCount === 0}
            onClick={() => onApply({ n: nVal, offset: offVal })}
            title="Extract Lines"
          >
            <ApplyIcon />
          </button>
        </div>
      </div>
      {hasInput && resultCount > 0 && (
        <div className="tu-fr-status">
          <CheckIcon />
          Every {nVal} lines{offVal > 0 ? `, skipping first ${offVal}` : ''} — {resultCount} line
          {resultCount !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  );
}
