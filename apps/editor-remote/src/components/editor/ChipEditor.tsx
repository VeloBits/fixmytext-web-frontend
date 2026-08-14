import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Reorder } from 'framer-motion';
import { SIDEBAR_VIEWS, TOOL_GROUPS, chipKey } from '@velobits/app-core/constants/tools';
import type { SidebarChip } from '@velobits/app-core/types/tools';
import type {
  SidebarChipsContextValue,
  ToolGroupsContextValue,
} from '@velobits/app-core/types/context';
import type { ShowAlertFn } from '@velobits/app-core/types/alert';
import {
  GripVerticalIcon,
  PlusIcon,
  RotateCcwIcon,
  SearchIcon,
  XIcon,
} from '@velobits/design-system';
import { chipLabel } from './chipUtils';

const EDITOR_WIDTH = 264;
const EDITOR_MAX_HEIGHT = 440;
const GAP = 8;

interface ChipEditorProps {
  /** Rect of the trigger button - the popover opens beside/below it. */
  anchor: DOMRect;
  onClose: () => void;
  sidebarChips: SidebarChipsContextValue;
  toolGroups: ToolGroupsContextValue;
  showAlert: ShowAlertFn;
}

interface AddRow {
  chip: SidebarChip;
  label: string;
}

/**
 * The chip-row editor popover: drag to reorder the current chips, remove with
 * an undo toast, add smart views / your groups / catalog groups (labels match
 * the panel section headers), reset to the default row.
 */
export default function ChipEditor({
  anchor,
  onClose,
  sidebarChips,
  toolGroups,
  showAlert,
}: ChipEditorProps) {
  const { chips } = sidebarChips;
  const [query, setQuery] = useState('');
  // Reorder works on a local draft and commits on drag end - committing every
  // intermediate onReorder frame would spam whole-list PUTs.
  const [draft, setDraft] = useState<SidebarChip[]>(chips);
  useEffect(() => setDraft(chips), [chips]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const present = useMemo(() => new Set(chips.map((c) => chipKey(c))), [chips]);
  const q = query.trim().toLowerCase();

  const addSections = useMemo(() => {
    const match = (label: string) => !q || label.toLowerCase().includes(q);
    const views: AddRow[] = SIDEBAR_VIEWS.filter(
      (v) => !present.has(`view:${v.id}`) && match(v.label)
    ).map((v) => ({ chip: { type: 'view', id: v.id }, label: v.label }));
    const custom: AddRow[] = toolGroups.groups
      .filter((g) => !present.has(`custom_group:${g.id}`) && match(g.name))
      .map((g) => ({ chip: { type: 'custom_group', id: g.id }, label: g.name }));
    const catalog: AddRow[] = TOOL_GROUPS.filter(
      (g) => !present.has(`group:${g.id}`) && match(g.label)
    ).map((g) => ({ chip: { type: 'group', id: g.id }, label: g.label }));
    return [
      { title: 'Views', rows: views },
      { title: 'Your groups', rows: custom },
      { title: 'Catalog', rows: catalog },
    ].filter((s) => s.rows.length > 0);
  }, [present, toolGroups.groups, q]);

  const removeWithUndo = (chip: SidebarChip, label: string) => {
    const prev = [...chips];
    sidebarChips.removeChip(chip);
    showAlert(`Removed "${label}" from your sidebar`, 'info', {
      action: { label: 'Undo', onClick: () => sidebarChips.setChips(prev) },
    });
  };

  const resetWithUndo = () => {
    const prev = [...chips];
    sidebarChips.resetChips();
    showAlert('Sidebar reset to defaults', 'info', {
      action: { label: 'Undo', onClick: () => sidebarChips.setChips(prev) },
    });
    onClose();
  };

  // Clamp to the viewport, preferring the right side of the anchor.
  let left = anchor.right + GAP;
  if (left + EDITOR_WIDTH > window.innerWidth) left = anchor.left - EDITOR_WIDTH - GAP;
  if (left < GAP) left = GAP;
  const top = Math.max(GAP, Math.min(anchor.top, window.innerHeight - EDITOR_MAX_HEIGHT - GAP));

  return createPortal(
    <>
      <div className="tu-group-menu-backdrop" onClick={onClose} />
      <div
        className="tu-chip-editor"
        style={{ top, left, width: EDITOR_WIDTH, maxHeight: EDITOR_MAX_HEIGHT }}
        role="dialog"
        aria-label="Customize sidebar"
      >
        <div className="tu-chip-editor-title">Sidebar</div>

        <Reorder.Group
          axis="y"
          values={draft.map((c) => chipKey(c))}
          onReorder={(keys: string[]) => {
            const byKey = new Map(draft.map((c) => [chipKey(c), c]));
            setDraft(keys.map((k) => byKey.get(k)!).filter(Boolean));
          }}
          className="tu-chip-editor-list"
          as="div"
        >
          {draft.map((chip) => {
            const label = chipLabel(chip, toolGroups.groups);
            if (label === null) return null;
            const isAll = chip.type === 'view' && chip.id === 'all';
            return (
              <Reorder.Item
                key={chipKey(chip)}
                value={chipKey(chip)}
                as="div"
                className="tu-chip-editor-item"
                onDragEnd={() => sidebarChips.setChips(draft)}
              >
                <span className="tu-chip-editor-grip" aria-hidden="true">
                  <GripVerticalIcon size={12} />
                </span>
                <span className="tu-chip-editor-name">{label}</span>
                {!isAll && (
                  <button
                    className="tu-chip-editor-remove"
                    onClick={() => removeWithUndo(chip, label)}
                    aria-label={`Remove ${label} from sidebar`}
                    title="Remove from sidebar"
                  >
                    <XIcon size={12} />
                  </button>
                )}
              </Reorder.Item>
            );
          })}
        </Reorder.Group>

        <div className="tu-chip-editor-search">
          <SearchIcon size={12} />
          <input
            value={query}
            placeholder="Find a group…"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Filter addable chips"
          />
        </div>

        <div className="tu-chip-editor-sections">
          {addSections.map((section) => (
            <div key={section.title}>
              <div className="tu-chip-editor-section">{section.title}</div>
              {section.rows.map((row) => (
                <button
                  key={chipKey(row.chip)}
                  className="tu-chip-editor-add"
                  onClick={() => sidebarChips.addChip(row.chip)}
                >
                  <PlusIcon size={12} />
                  <span className="tu-chip-editor-name">{row.label}</span>
                </button>
              ))}
            </div>
          ))}
          {addSections.length === 0 && (
            <div className="tu-chip-editor-empty">
              {q ? 'No matches' : 'Everything is already on your sidebar'}
            </div>
          )}
        </div>

        {sidebarChips.isCustomized && (
          <button className="tu-chip-editor-reset" onClick={resetWithUndo}>
            <RotateCcwIcon size={12} />
            <span>Reset to defaults</span>
          </button>
        )}
      </div>
    </>,
    document.body
  );
}
