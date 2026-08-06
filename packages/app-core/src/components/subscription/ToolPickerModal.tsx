import { useEffect, useMemo, useRef, useState } from 'react';
import { TOOLS, TOOL_GROUPS } from '../../constants/tools';
import { ALWAYS_FREE_IDS } from '../../constants/pricing';
import type { ToolDefinition } from '../../types/tools';

export interface ToolPickerModalProps {
  open: boolean;
  /** Exact number of tools the pass covers (pass_def.tools > 0). */
  requiredCount: number;
  passName: string;
  /** e.g. "₹25" - shown on the confirm button when provided. */
  priceLabel?: string;
  /** Pre-selected tool ids (e.g. the tool that triggered the upsell). */
  initialSelection?: string[];
  onConfirm: (toolIds: string[]) => void;
  onCancel: () => void;
}

// Only tools that actually consume quota can be covered by a pass: drawers and
// action tools (clipboard/export/toggles) never hit the entitlement gate, and
// always-free tools would be wasted scope.
const BILLABLE_TYPES = new Set(['api', 'ai', 'local', 'select']);

function isBillable(tool: ToolDefinition): boolean {
  return BILLABLE_TYPES.has(tool.type) && !ALWAYS_FREE_IDS.has(tool.id);
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0, 0, 0, 0.55)',
  zIndex: 1100,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1rem',
};

const modalStyle: React.CSSProperties = {
  background: 'var(--bg-secondary, #1e1e1e)',
  color: 'var(--text-primary, #e0e0e0)',
  border: '1px solid var(--border-color, #3c3c3c)',
  borderRadius: 12,
  width: 'min(560px, 100%)',
  maxHeight: 'min(80vh, 640px)',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 12px 48px rgba(0,0,0,0.45)',
};

/**
 * Pre-purchase tool selector for tool-scoped passes. The buyer must pick
 * exactly `requiredCount` tools before checkout opens - the selection becomes
 * the pass's server-validated scope (order notes), so an unscoped purchase
 * can never reach Razorpay.
 */
export default function ToolPickerModal({
  open,
  requiredCount,
  passName,
  priceLabel,
  initialSelection,
  onConfirm,
  onCancel,
}: ToolPickerModalProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  // Re-seed selection each time the picker opens (dedup, billable-only, capped).
  useEffect(() => {
    if (!open) return;
    const seed = [...new Set(initialSelection || [])]
      .filter((id) => {
        const tool = TOOLS.find((t) => t.id === id);
        return tool ? isBillable(tool) : false;
      })
      .slice(0, requiredCount);
    setSelected(seed);
    setQuery('');
    searchRef.current?.focus();
    // Seed only when the picker transitions open; intentionally keyed on `open`.
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onCancel]);

  const groupedTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (t: ToolDefinition): boolean =>
      !q ||
      t.label.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.keywords || []).some((k) => k.toLowerCase().includes(q));
    return TOOL_GROUPS.map((g) => ({
      group: g,
      tools: TOOLS.filter((t) => t.group === g.id && isBillable(t) && matches(t)),
    })).filter((entry) => entry.tools.length > 0);
  }, [query]);

  if (!open) return null;

  const toggle = (id: string): void => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= requiredCount) return prev;
      return [...prev, id];
    });
  };

  const complete = selected.length === requiredCount;

  return (
    <div style={overlayStyle} onClick={onCancel} data-testid="tool-picker-overlay">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Choose ${requiredCount} tool${requiredCount > 1 ? 's' : ''} for ${passName}`}
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '1rem 1.25rem 0.75rem',
            borderBottom: '1px solid var(--border-color, #3c3c3c)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600 }}>
              Choose {requiredCount} tool{requiredCount > 1 ? 's' : ''} for {passName}
            </h3>
            <button
              type="button"
              aria-label="Close"
              onClick={onCancel}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '1.1rem',
                lineHeight: 1,
                padding: 4,
              }}
            >
              ✕
            </button>
          </div>
          <p style={{ margin: '0.35rem 0 0.75rem', opacity: 0.7, fontSize: '0.85rem' }}>
            Your pass only works on the tools you pick - choose the ones you use most.
          </p>
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder="Search tools…"
            aria-label="Search tools"
            onChange={(e) => setQuery(e.target.value)}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              padding: '0.45rem 0.6rem',
              borderRadius: 6,
              border: '1px solid var(--border-color, #3c3c3c)',
              background: 'var(--bg-primary, #121212)',
              color: 'inherit',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1, padding: '0.5rem 1.25rem' }}>
          {groupedTools.length === 0 && (
            <p style={{ opacity: 0.6, fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
              No tools match “{query}”.
            </p>
          )}
          {groupedTools.map(({ group, tools }) => (
            <div key={group.id} style={{ marginBottom: '0.75rem' }}>
              <div
                style={{
                  fontSize: '0.72rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  opacity: 0.55,
                  margin: '0.5rem 0 0.25rem',
                }}
              >
                {group.label}
              </div>
              {tools.map((tool) => {
                const isSelected = selected.includes(tool.id);
                const atCap = !isSelected && selected.length >= requiredCount;
                return (
                  <label
                    key={tool.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.55rem',
                      padding: '0.35rem 0.4rem',
                      borderRadius: 6,
                      cursor: atCap ? 'not-allowed' : 'pointer',
                      opacity: atCap ? 0.45 : 1,
                      background: isSelected ? 'var(--bg-hover, rgba(74,158,255,0.12))' : 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      role="menuitemcheckbox"
                      aria-checked={isSelected}
                      checked={isSelected}
                      disabled={atCap}
                      onChange={() => toggle(tool.id)}
                    />
                    <span style={{ fontSize: '0.9rem' }}>{tool.label}</span>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        opacity: 0.55,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {tool.description}
                    </span>
                  </label>
                );
              })}
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '0.75rem 1.25rem',
            borderTop: '1px solid var(--border-color, #3c3c3c)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <span
            aria-live="polite"
            style={{ fontSize: '0.85rem', opacity: 0.8 }}
            data-testid="tool-picker-counter"
          >
            {selected.length} of {requiredCount} selected
          </span>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 6,
                border: '1px solid var(--border-color, #3c3c3c)',
                background: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '0.9rem',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!complete}
              onClick={() => onConfirm(selected)}
              style={{
                padding: '0.45rem 0.9rem',
                borderRadius: 6,
                border: 'none',
                background: complete ? 'var(--accent-color, #007acc)' : 'var(--bg-hover, #333)',
                color: '#fff',
                cursor: complete ? 'pointer' : 'not-allowed',
                fontSize: '0.9rem',
                fontWeight: 600,
              }}
            >
              {priceLabel ? `Continue to pay - ${priceLabel}` : 'Continue to pay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
