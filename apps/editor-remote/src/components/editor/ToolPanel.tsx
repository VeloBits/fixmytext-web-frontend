import { useState, useRef, useCallback, useEffect, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TOOL_GROUPS, chipKey, parseChipKey } from '@velobits/app-core/constants/tools';
import {
  MAX_TOOL_GROUPS,
  MAX_TOOLS_PER_GROUP,
} from '@velobits/app-core/hooks/useToolGroups';
import ToolIcon from '@velobits/app-core/components/editor/ToolIcon';
import type { SidebarChip, ToolDefinition } from '@velobits/app-core/types/tools';
import type {
  SidebarChipsContextValue,
  ToolGroupsContextValue,
  ToolGroupView,
} from '@velobits/app-core/types/context';
import type { ShowAlertFn } from '@velobits/app-core/types/alert';
import {
  CheckIcon,
  EllipsisIcon,
  GripVerticalIcon,
  HeartIcon,
  MinusIcon,
  PenLineIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from '@velobits/design-system';
import ChipEditor from './ChipEditor';
import { chipLabel } from './chipUtils';

/** Mobile chip row: chips visible before the ⋯ +N overflow menu. */
const MOBILE_MAX_VISIBLE_CHIPS = 8;

interface TooltipState {
  text: string;
  top: number;
  left: number;
}

interface GroupMenuState {
  toolId: string;
  top: number;
  left: number;
}

interface FavoritesState {
  favorites: string[];
  toggleFavorite: (id: string) => void;
}

/* ── Drag-and-drop identity ──────────────────────────────────────────────────
 * Sortable/draggable ids must be unique across the whole DndContext, and the
 * same tool can appear in several sections (pinned, a custom group, its
 * catalog group) — so every id is prefixed with its section. The `data`
 * payload carries the semantic identity; ids are never parsed. */

type ToolDragData =
  | { kind: 'group-tool'; groupId: string; toolId: string; tool: ToolDefinition }
  | { kind: 'catalog-tool'; toolId: string; tool: ToolDefinition };

type DragData = ToolDragData | { kind: 'group'; groupId: string; label: string };

type DropData =
  | { kind: 'group-tool'; groupId: string; toolId: string }
  | { kind: 'group-drop'; groupId: string }
  | { kind: 'group'; groupId: string };

/** dnd wiring injected into a tool row / card by its sortable or draggable
 * wrapper. `rowProps` makes the whole row a pointer drag source; `handleProps`
 * (custom-group items only) makes the grip button the keyboard-accessible
 * activator. */
interface ToolItemDnd {
  setNodeRef: (el: HTMLElement | null) => void;
  style?: React.CSSProperties;
  isDragging: boolean;
  rowProps?: Record<string, unknown>;
  handleProps?: Record<string, unknown>;
}

interface ToolItemProps {
  tool: ToolDefinition;
  disabled: boolean;
  onClick: () => void;
  isFavorite: boolean | undefined;
  onToggleFavorite?: (id: string) => void;
  isActive: boolean;
  isSuggested: boolean;
  onHover: (text: string, rect: DOMRect) => void;
  onLeave: () => void;
  /** Set when the item renders inside a custom group section — swaps the
   * add-to-group button for a remove-from-this-group one. */
  customGroupId?: string;
  onRemoveFromGroup?: (groupId: string, toolId: string) => void;
  onOpenGroupMenu?: (toolId: string, anchor: DOMRect) => void;
  dnd?: ToolItemDnd;
}

interface GroupHeaderProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  pinned: boolean;
}

interface CustomGroupHeaderProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onAddTools: () => void;
  dragHandleProps: Record<string, unknown>;
}

interface ToolPanelProps {
  tools: ToolDefinition[];
  /** Serialized active chip ('view:all', 'group:hashing', 'custom_group:<id>'). */
  activeChipKey: string;
  onChipChange: (key: string) => void;
  onToolClick: (tool: ToolDefinition) => void;
  disabled: boolean;
  favorites: FavoritesState;
  toolGroups: ToolGroupsContextValue;
  sidebarChips: SidebarChipsContextValue;
  recentToolIds: string[];
  showAlert: ShowAlertFn;
  activeToolId?: string | null;
  /** Desktop hides the in-panel chip row — the activity bar renders the chips. */
  hideChips?: boolean;
  viewMode?: string;
  suggestedToolIds?: string[];
}

/** Shared add-to-group / remove-from-group affordance next to the heart. */
function GroupActionButton({
  tool,
  customGroupId,
  onRemoveFromGroup,
  onOpenGroupMenu,
  anchorRef,
  extraClass = '',
}: Pick<ToolItemProps, 'tool' | 'customGroupId' | 'onRemoveFromGroup' | 'onOpenGroupMenu'> & {
  anchorRef: React.RefObject<HTMLDivElement | null>;
  extraClass?: string;
}) {
  if (customGroupId) {
    return (
      <button
        className={`tu-titem-group${extraClass}`}
        onClick={(e) => {
          e.stopPropagation();
          onRemoveFromGroup?.(customGroupId, tool.id);
        }}
        aria-label={`Remove ${tool.label} from this group`}
        title="Remove from this group"
      >
        <MinusIcon size={13} />
      </button>
    );
  }
  return (
    <button
      className={`tu-titem-group${extraClass}`}
      onClick={(e) => {
        e.stopPropagation();
        const rect = anchorRef.current?.getBoundingClientRect();
        if (rect) onOpenGroupMenu?.(tool.id, rect);
      }}
      aria-label={`Add ${tool.label} to a group`}
      title="Add to group"
    >
      <PlusIcon size={13} />
    </button>
  );
}

/** Grip rendered inside custom-group items: the keyboard activator for
 * reordering (focus, Space/Enter to lift, arrows to move, Space to drop). */
function DragGrip({
  label,
  handleProps,
  extraClass = '',
}: {
  label: string;
  handleProps: Record<string, unknown>;
  extraClass?: string;
}) {
  return (
    <button
      className={`tu-titem-grip${extraClass}`}
      {...handleProps}
      onClick={(e) => e.stopPropagation()}
      aria-label={`Reorder ${label}`}
      title="Drag to reorder"
    >
      <GripVerticalIcon size={12} />
    </button>
  );
}

function ToolPanelItem(props: ToolItemProps) {
  const {
    tool,
    disabled,
    onClick,
    isFavorite,
    onToggleFavorite,
    isActive,
    isSuggested,
    onHover,
    onLeave,
    dnd,
  } = props;
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled && tool.type !== 'drawer' && (tool.type as string) !== 'action';
  const itemRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      itemRef.current = el;
      dnd?.setNodeRef(el);
    },
    [dnd]
  );

  const handleClick = () => {
    if (isDisabled) return;
    onClick();
  };

  const handleMouseEnter = () => {
    setHovered(true);
    if (tool.description && itemRef.current) {
      const rect = itemRef.current.getBoundingClientRect();
      onHover(tool.description, rect);
    }
  };

  const handleMouseLeave = () => {
    setHovered(false);
    onLeave();
  };

  return (
    <div
      ref={setRefs}
      style={dnd?.style}
      className={`tu-titem-wrap${hovered ? ' tu-titem-wrap--hover' : ''}${
        dnd?.isDragging ? ' tu-dnd-dragging' : ''
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`tu-titem${isActive ? ' tu-titem--active' : ''}${
          isDisabled ? ' tu-titem--disabled' : ''
        }`}
        onClick={handleClick}
        {...(dnd?.rowProps ?? {})}
      >
        {dnd?.handleProps && <DragGrip label={tool.label} handleProps={dnd.handleProps} />}
        <ToolIcon icon={tool.icon} color={tool.color} toolId={tool.id} />
        <span className="tu-titem-name">{tool.label}</span>
        {isSuggested && <span className="tu-titem-suggested">suggested</span>}
        <GroupActionButton
          tool={tool}
          customGroupId={props.customGroupId}
          onRemoveFromGroup={props.onRemoveFromGroup}
          onOpenGroupMenu={props.onOpenGroupMenu}
          anchorRef={itemRef}
        />
        <button
          className={`tu-titem-fav${isFavorite ? ' tu-titem-fav--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(tool.id);
          }}
          aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
          aria-pressed={isFavorite}
        >
          <HeartIcon size={13} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>
      </div>
    </div>
  );
}

/* ── Collapsible group header (VSCode Source Control style) ── */
function GroupHeader({ label, count, collapsed, onToggle, pinned }: GroupHeaderProps) {
  return (
    <button
      className={`tu-group-header${collapsed ? ' tu-group-header--collapsed' : ''}${
        pinned ? ' tu-group-header--pinned' : ''
      }`}
      onClick={onToggle}
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label} group`}
    >
      <svg
        className="tu-group-chevron"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
      {pinned && (
        <svg
          className="tu-group-pin"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 17v5" />
          <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16h14v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1h1V4H7v2h1a1 1 0 0 1 1 1z" />
        </svg>
      )}
      <span className="tu-group-label">{label}</span>
      <span className="tu-group-count">{count}</span>
    </button>
  );
}

/* ── Custom (user-created) group header: drag grip, add tools, rename,
 *    delete on hover ── */
function CustomGroupHeader({
  label,
  count,
  collapsed,
  onToggle,
  onRename,
  onDelete,
  onAddTools,
  dragHandleProps,
}: CustomGroupHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const commitRename = () => {
    setEditing(false);
    const name = draft.trim();
    if (name && name !== label) onRename(name);
    else setDraft(label);
  };

  return (
    <div
      className={`tu-group-header tu-group-header--pinned tu-group-header--custom${
        collapsed ? ' tu-group-header--collapsed' : ''
      }`}
      role="button"
      tabIndex={0}
      onClick={() => {
        if (!editing) onToggle();
      }}
      onKeyDown={(e) => {
        if (!editing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onToggle();
        }
      }}
      onMouseLeave={() => setConfirmingDelete(false)}
      aria-expanded={!collapsed}
      aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label} group`}
    >
      <button
        className="tu-group-grip"
        {...dragHandleProps}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Reorder ${label} group`}
        title="Drag to reorder groups"
      >
        <GripVerticalIcon size={12} />
      </button>
      <svg
        className="tu-group-chevron"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
      {editing ? (
        <input
          className="tu-group-rename-input"
          value={draft}
          autoFocus
          maxLength={100}
          onChange={(e) => setDraft(e.target.value)}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Enter') commitRename();
            if (e.key === 'Escape') {
              setDraft(label);
              setEditing(false);
            }
          }}
          onBlur={commitRename}
          aria-label="Group name"
        />
      ) : (
        <span className="tu-group-label">{label}</span>
      )}
      <span className="tu-group-count">{count}</span>
      <span className="tu-group-actions">
        <button
          className="tu-group-action"
          onClick={(e) => {
            e.stopPropagation();
            onAddTools();
          }}
          aria-label={`Add tools to ${label} group`}
          title="Add tools"
        >
          <PlusIcon size={12} />
        </button>
        <button
          className="tu-group-action"
          onClick={(e) => {
            e.stopPropagation();
            setDraft(label);
            setEditing(true);
          }}
          aria-label={`Rename ${label} group`}
          title="Rename group"
        >
          <PenLineIcon size={12} />
        </button>
        <button
          className={`tu-group-action${confirmingDelete ? ' tu-group-action--danger' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            if (confirmingDelete) onDelete();
            else setConfirmingDelete(true);
          }}
          aria-label={confirmingDelete ? `Confirm delete ${label} group` : `Delete ${label} group`}
          title={confirmingDelete ? 'Click again to delete' : 'Delete group'}
        >
          {confirmingDelete ? <CheckIcon size={12} /> : <Trash2Icon size={12} />}
        </button>
      </span>
    </div>
  );
}

/* ── Grid view tool card ───────────────────────────── */
function ToolGridCard(props: ToolItemProps) {
  const {
    tool,
    disabled,
    onClick,
    isFavorite,
    onToggleFavorite,
    isActive,
    isSuggested,
    onHover,
    onLeave,
    dnd,
  } = props;
  const isDisabled = disabled && tool.type !== 'drawer' && (tool.type as string) !== 'action';
  const cardRef = useRef<HTMLDivElement | null>(null);

  const setRefs = useCallback(
    (el: HTMLDivElement | null) => {
      cardRef.current = el;
      dnd?.setNodeRef(el);
    },
    [dnd]
  );

  const handleClick = () => {
    if (isDisabled) return;
    onClick();
  };

  const handleMouseEnter = () => {
    if (tool.description && cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      onHover(tool.description, rect);
    }
  };

  return (
    <div
      ref={setRefs}
      style={dnd?.style}
      className={`tu-tgrid-card${isActive ? ' tu-tgrid-card--active' : ''}${
        isDisabled ? ' tu-tgrid-card--disabled' : ''
      }${dnd?.isDragging ? ' tu-dnd-dragging' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
      {...(dnd?.rowProps ?? {})}
    >
      {dnd?.handleProps && (
        <DragGrip
          label={tool.label}
          handleProps={dnd.handleProps}
          extraClass=" tu-tgrid-card-grip"
        />
      )}
      <div className="tu-tgrid-card-icon">
        <ToolIcon icon={tool.icon} color={tool.color} toolId={tool.id} />
      </div>
      <span className="tu-tgrid-card-name">{tool.label}</span>
      {isSuggested && <span className="tu-tgrid-card-badge">suggested</span>}
      <GroupActionButton
        tool={tool}
        customGroupId={props.customGroupId}
        onRemoveFromGroup={props.onRemoveFromGroup}
        onOpenGroupMenu={props.onOpenGroupMenu}
        anchorRef={cardRef}
        extraClass=" tu-tgrid-card-group"
      />
      <button
        className={`tu-titem-fav tu-tgrid-card-fav${isFavorite ? ' tu-titem-fav--active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite?.(tool.id);
        }}
        aria-label={isFavorite ? 'Remove from favourites' : 'Add to favourites'}
        aria-pressed={isFavorite}
      >
        <HeartIcon size={13} fill={isFavorite ? 'currentColor' : 'none'} />
      </button>
    </div>
  );
}

/** Sortable wrapper for a tool inside a custom group: whole row drags with
 * the pointer, the grip is the keyboard activator. */
function SortableGroupTool({
  groupId,
  viewMode,
  ...itemProps
}: ToolItemProps & { groupId: string; viewMode: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `grouptool:${groupId}:${itemProps.tool.id}`,
    data: {
      kind: 'group-tool',
      groupId,
      toolId: itemProps.tool.id,
      tool: itemProps.tool,
    } satisfies ToolDragData,
  });
  const dnd: ToolItemDnd = {
    setNodeRef,
    style: { transform: CSS.Transform.toString(transform), transition },
    isDragging,
    rowProps: listeners ?? {},
    handleProps: { ...attributes, ...(listeners ?? {}) },
  };
  return viewMode === 'grid' ? (
    <ToolGridCard {...itemProps} dnd={dnd} />
  ) : (
    <ToolPanelItem {...itemProps} dnd={dnd} />
  );
}

/** Draggable wrapper for pinned/catalog tools: drag one onto a custom group
 * to add it there. Not sortable — catalog order is fixed. Keyboard users add
 * via the + menu instead, so no grip is rendered. */
function DraggableCatalogTool({
  sectionId,
  viewMode,
  ...itemProps
}: ToolItemProps & { sectionId: string; viewMode: string }) {
  const { listeners, setNodeRef, isDragging } = useDraggable({
    id: `catalogtool:${sectionId}:${itemProps.tool.id}`,
    data: { kind: 'catalog-tool', toolId: itemProps.tool.id, tool: itemProps.tool } satisfies ToolDragData,
  });
  const dnd: ToolItemDnd = {
    setNodeRef,
    isDragging,
    rowProps: listeners ?? {},
  };
  return viewMode === 'grid' ? (
    <ToolGridCard {...itemProps} dnd={dnd} />
  ) : (
    <ToolPanelItem {...itemProps} dnd={dnd} />
  );
}

/** Sortable block wrapper for a custom group: the whole section moves when
 * the header grip drags, and the inner div is the drop target for tools. */
function SortableCustomGroup({
  groupId,
  label,
  highlight,
  children,
}: {
  groupId: string;
  label: string;
  highlight: boolean;
  children: (dragHandleProps: Record<string, unknown>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `groupblock:${groupId}`,
    data: { kind: 'group', groupId, label } satisfies DragData,
  });
  const { setNodeRef: setDropRef } = useDroppable({
    id: `groupdrop:${groupId}`,
    data: { kind: 'group-drop', groupId } satisfies DropData,
  });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`tu-group${isDragging ? ' tu-dnd-dragging' : ''}${
        highlight ? ' tu-group--drop-target' : ''
      }`}
    >
      <div ref={setDropRef}>{children({ ...attributes, ...(listeners ?? {}) })}</div>
    </div>
  );
}

interface PanelGroup {
  id: string;
  label: string;
  tools: ToolDefinition[];
  /** Present on user-created groups (the raw group id, without the section prefix). */
  customGroupId?: string;
}

interface SnackbarState {
  message: string;
  undo?: () => void;
}

interface PickerState {
  groupId: string;
  query: string;
  selected: Set<string>;
}

export default memo(function ToolPanel({
  tools,
  activeChipKey,
  onChipChange,
  onToolClick,
  disabled,
  favorites,
  toolGroups,
  sidebarChips,
  recentToolIds,
  showAlert,
  activeToolId,
  hideChips,
  viewMode = 'list',
  suggestedToolIds = [],
}: ToolPanelProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [groupMenu, setGroupMenu] = useState<GroupMenuState | null>(null);
  // null = the "New group…" row is a button; a string = its inline input value
  const [menuNewName, setMenuNewName] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [chipEditorAnchor, setChipEditorAnchor] = useState<DOMRect | null>(null);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowBtnRef = useRef<HTMLButtonElement | null>(null);
  const [activeDrag, setActiveDrag] = useState<DragData | null>(null);
  const [dropGroupId, setDropGroupId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<SnackbarState | null>(null);
  const [picker, setPicker] = useState<PickerState | null>(null);
  const snackbarTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (snackbarTimer.current) window.clearTimeout(snackbarTimer.current);
    },
    []
  );

  const toggleGroup = useCallback((groupId: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  }, []);

  const handleHover = useCallback((text: string, rect: DOMRect) => {
    const tooltipWidth = 280;
    const tooltipHeight = 40;
    const gap = 8;

    let left = rect.right + gap;
    if (left + tooltipWidth > window.innerWidth) {
      left = rect.left - tooltipWidth - gap;
    }

    let top = rect.top + rect.height / 2;
    top = Math.max(tooltipHeight / 2 + 4, top);
    top = Math.min(window.innerHeight - tooltipHeight / 2 - 4, top);

    setTooltip({ text, top, left });
  }, []);

  const handleLeave = useCallback(() => setTooltip(null), []);

  const openGroupMenu = useCallback((toolId: string, rect: DOMRect) => {
    const menuWidth = 220;
    const menuMaxHeight = 320;
    const gap = 8;
    let left = rect.right + gap;
    if (left + menuWidth > window.innerWidth) {
      left = rect.left - menuWidth - gap;
    }
    const top = Math.max(4, Math.min(rect.top, window.innerHeight - menuMaxHeight - 4));
    setMenuNewName(null);
    setGroupMenu({ toolId, top, left });
  }, []);

  /** Transient bottom-of-panel notice; pass `undo` to render an Undo action. */
  const flash = useCallback((message: string, undo?: () => void) => {
    if (snackbarTimer.current) window.clearTimeout(snackbarTimer.current);
    setSnackbar({ message, undo });
    snackbarTimer.current = window.setTimeout(() => setSnackbar(null), 6000);
  }, []);

  const dismissSnackbar = useCallback(() => {
    if (snackbarTimer.current) window.clearTimeout(snackbarTimer.current);
    setSnackbar(null);
  }, []);

  /** Removal with undo: capture the group's exact order first, so undo puts
   * the tool back at its old position (setGroupTools replays the full list). */
  const handleRemoveFromGroup = useCallback(
    (groupId: string, toolId: string) => {
      const group = toolGroups.groups.find((g) => g.id === groupId);
      if (!group) return;
      const prevToolIds = group.toolIds;
      const label = tools.find((t) => t.id === toolId)?.label ?? toolId;
      toolGroups.removeToolFromGroup(groupId, toolId);
      flash(`Removed ${label} from ${group.name}`, () =>
        toolGroups.setGroupTools(groupId, prevToolIds)
      );
    },
    [toolGroups, tools, flash]
  );

  const activeChip = useMemo<SidebarChip>(
    () => parseChipKey(activeChipKey) ?? { type: 'view', id: 'all' },
    [activeChipKey]
  );

  const favoriteIds = useMemo(() => favorites.favorites || [], [favorites]);
  const customGroups = toolGroups.groups;

  // Count per chip (shown on the mobile row and in tooltips)
  const chipCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const chip of sidebarChips.chips) {
      const key = chipKey(chip);
      if (chip.type === 'view') {
        counts[key] =
          chip.id === 'all'
            ? tools.length
            : chip.id === 'pinned'
              ? favoriteIds.length
              : chip.id === 'recent'
                ? recentToolIds.length
                : suggestedToolIds.length;
      } else if (chip.type === 'group') {
        counts[key] = tools.filter((t) => t.group === chip.id).length;
      } else {
        counts[key] = customGroups.find((g) => g.id === chip.id)?.toolIds.length ?? 0;
      }
    }
    return counts;
  }, [sidebarChips.chips, tools, favoriteIds, recentToolIds, suggestedToolIds, customGroups]);

  // The search box filters the whole catalog regardless of the active chip
  // (VSCode Explorer-filter style); clearing it returns to the chip's view.
  const query = filterQuery.trim().toLowerCase();

  const { topGroups, catalogGroups } = useMemo(() => {
    const alpha = (a: ToolDefinition, b: ToolDefinition) => a.label.localeCompare(b.label);
    const matchesQuery = (t: ToolDefinition) =>
      !query ||
      t.label.toLowerCase().includes(query) ||
      (t.description ?? '').toLowerCase().includes(query) ||
      (t.keywords ?? []).some((k) => k.toLowerCase().includes(query));

    // Distribute a tool list into the canonical TOOL_GROUPS sections.
    const catalogOf = (list: ToolDefinition[]): PanelGroup[] => {
      const groupMap: Record<string, ToolDefinition[]> = {};
      for (const tool of list) {
        const gid = tool.group || 'other';
        (groupMap[gid] ??= []).push(tool);
      }
      for (const gid of Object.keys(groupMap)) groupMap[gid]!.sort(alpha);
      const catalog: PanelGroup[] = [];
      for (const g of TOOL_GROUPS) {
        if ((groupMap[g.id]?.length ?? 0) > 0) {
          catalog.push({ id: g.id, label: g.label, tools: groupMap[g.id]! });
          delete groupMap[g.id];
        }
      }
      for (const [gid, gTools] of Object.entries(groupMap)) {
        if (gTools.length > 0) {
          catalog.push({
            id: gid,
            label: gid.charAt(0).toUpperCase() + gid.slice(1),
            tools: gTools,
          });
        }
      }
      return catalog;
    };

    // Custom groups keep user-curated order; favorites NOT excluded (the user
    // put them there). Empty groups still render — a just-created group needs
    // a visible home for its + affordance.
    const customPanelGroup = (
      g: ToolGroupView,
      keep: (t: ToolDefinition) => boolean = () => true
    ): PanelGroup => ({
      id: `custom:${g.id}`,
      label: g.name,
      customGroupId: g.id,
      tools: g.toolIds
        .map((id) => tools.find((t) => t.id === id))
        .filter((t): t is ToolDefinition => !!t)
        .filter(keep),
    });

    if (query) {
      const top = customGroups
        .map((g) => customPanelGroup(g, matchesQuery))
        .filter((g) => g.tools.length > 0);
      return { topGroups: top, catalogGroups: catalogOf(tools.filter(matchesQuery)) };
    }

    if (activeChip.type === 'group') {
      const list = tools.filter((t) => t.group === activeChip.id).sort(alpha);
      const label = TOOL_GROUPS.find((g) => g.id === activeChip.id)?.label ?? activeChip.id;
      return {
        topGroups: [],
        catalogGroups: list.length > 0 ? [{ id: activeChip.id, label, tools: list }] : [],
      };
    }

    if (activeChip.type === 'custom_group') {
      const g = customGroups.find((x) => x.id === activeChip.id);
      return { topGroups: g ? [customPanelGroup(g)] : [], catalogGroups: [] };
    }

    if (activeChip.id === 'pinned') {
      const favs = tools.filter((t) => favoriteIds.includes(t.id));
      return { topGroups: [], catalogGroups: catalogOf(favs) };
    }

    if (activeChip.id === 'recent') {
      // Recency order is the point — one flat section, most recent first.
      const list = recentToolIds
        .map((id) => tools.find((t) => t.id === id))
        .filter((t): t is ToolDefinition => !!t);
      return {
        topGroups: list.length > 0 ? [{ id: '_recent', label: 'Recent', tools: list }] : [],
        catalogGroups: [],
      };
    }

    if (activeChip.id === 'suggested') {
      const list = suggestedToolIds
        .map((id) => tools.find((t) => t.id === id))
        .filter((t): t is ToolDefinition => !!t);
      return {
        topGroups: list.length > 0 ? [{ id: '_suggested', label: 'Suggested', tools: list }] : [],
        catalogGroups: [],
      };
    }

    // view:all — pinned favorites and custom groups above the full catalog
    const top: PanelGroup[] = [];
    const pinnedTools =
      favoriteIds.length > 0
        ? tools.filter((t) => favoriteIds.includes(t.id)).sort(alpha)
        : [];
    if (pinnedTools.length > 0) {
      top.push({ id: '_pinned', label: 'Pinned', tools: pinnedTools });
    }
    for (const g of customGroups) {
      top.push(customPanelGroup(g));
    }
    return { topGroups: top, catalogGroups: catalogOf(tools) };
  }, [query, activeChip, tools, favoriteIds, customGroups, recentToolIds, suggestedToolIds]);

  const commitNewGroup = () => {
    const name = (newGroupName ?? '').trim();
    if (name) toolGroups.createGroup(name);
    setNewGroupName(null);
  };

  // Mobile chip row: hide an empty Suggested chip (it teaches nothing at 0)
  // and dangling custom-group chips (their group is gone / not hydrated yet).
  const rowChips = useMemo(
    () =>
      sidebarChips.chips.filter((chip) => {
        if (
          chip.type === 'view' &&
          chip.id === 'suggested' &&
          suggestedToolIds.length === 0 &&
          activeChipKey !== 'view:suggested'
        ) {
          return false;
        }
        return chipLabel(chip, customGroups) !== null;
      }),
    [sidebarChips.chips, suggestedToolIds.length, activeChipKey, customGroups]
  );

  // The active chip is never hidden in the ⋯ +N overflow — it swaps into the
  // last visible slot (the VSCode active-editor-tab rule).
  const { visibleRowChips, overflowRowChips } = useMemo(() => {
    if (rowChips.length <= MOBILE_MAX_VISIBLE_CHIPS) {
      return { visibleRowChips: rowChips, overflowRowChips: [] as SidebarChip[] };
    }
    const visible = rowChips.slice(0, MOBILE_MAX_VISIBLE_CHIPS);
    const overflow = rowChips.slice(MOBILE_MAX_VISIBLE_CHIPS);
    const activeIdx = rowChips.findIndex((c) => chipKey(c) === activeChipKey);
    if (activeIdx >= MOBILE_MAX_VISIBLE_CHIPS) {
      const displaced = visible[MOBILE_MAX_VISIBLE_CHIPS - 1]!;
      visible[MOBILE_MAX_VISIBLE_CHIPS - 1] = rowChips[activeIdx]!;
      overflow[activeIdx - MOBILE_MAX_VISIBLE_CHIPS] = displaced;
    }
    return { visibleRowChips: visible, overflowRowChips: overflow };
  }, [rowChips, activeChipKey]);

  const emptyHint = (() => {
    if (topGroups.length > 0 || catalogGroups.length > 0) return null;
    if (query) return `No tools match "${filterQuery.trim()}"`;
    if (activeChip.type === 'view' && activeChip.id === 'pinned') {
      return 'No pinned tools yet — click the ♥ on any tool.';
    }
    if (activeChip.type === 'view' && activeChip.id === 'recent') {
      return 'Tools you run will appear here.';
    }
    if (activeChip.type === 'view' && activeChip.id === 'suggested') {
      return 'Suggestions appear when your text matches a tool.';
    }
    if (activeChip.type === 'custom_group') return 'This group no longer exists.';
    return 'No tools here yet.';
  })();

  const showNewGroupRow = !query && activeChip.type === 'view' && activeChip.id === 'all';

  /* ── Drag and drop ─────────────────────────────────────────────────────── */

  const sensors = useSensors(
    // distance keeps plain clicks working; delay keeps touch scrolling working
    // (long-press to lift on mobile).
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  /** Group drags only see other group blocks; tool drags prefer the exact
   * item under the pointer, then a group's drop area. Keyboard drags have no
   * pointer, so they fall through to rect intersection. */
  const collisionDetection = useCallback<CollisionDetection>((args) => {
    const kind = (args.active.data.current as DragData | undefined)?.kind;
    if (kind === 'group') {
      return closestCenter({
        ...args,
        droppableContainers: args.droppableContainers.filter(
          (c) => (c.data.current as DropData | undefined)?.kind === 'group'
        ),
      });
    }
    const items = args.droppableContainers.filter(
      (c) => (c.data.current as DropData | undefined)?.kind === 'group-tool'
    );
    const drops = args.droppableContainers.filter(
      (c) => (c.data.current as DropData | undefined)?.kind === 'group-drop'
    );
    const hitItems = pointerWithin({ ...args, droppableContainers: items });
    if (hitItems.length > 0) return hitItems;
    const hitDrops = pointerWithin({ ...args, droppableContainers: drops });
    if (hitDrops.length > 0) return hitDrops;
    return rectIntersection({ ...args, droppableContainers: [...items, ...drops] });
  }, []);

  const handleDragStart = useCallback(({ active }: DragStartEvent) => {
    setTooltip(null);
    setActiveDrag((active.data.current as DragData | undefined) ?? null);
  }, []);

  const handleDragOver = useCallback(({ over }: DragOverEvent) => {
    const data = over?.data.current as DropData | undefined;
    setDropGroupId(
      data?.kind === 'group-drop' || data?.kind === 'group-tool' ? data.groupId : null
    );
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveDrag(null);
    setDropGroupId(null);
  }, []);

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      setActiveDrag(null);
      setDropGroupId(null);
      const a = active.data.current as DragData | undefined;
      const o = over?.data.current as DropData | undefined;
      if (!a || !o) return;

      if (a.kind === 'group') {
        if (o.kind !== 'group' || o.groupId === a.groupId) return;
        const ids = customGroups.map((g) => g.id);
        const from = ids.indexOf(a.groupId);
        const to = ids.indexOf(o.groupId);
        if (from < 0 || to < 0 || from === to) return;
        toolGroups.reorderGroups(arrayMove(ids, from, to));
        return;
      }

      if (o.kind === 'group') return;
      const target = customGroups.find((g) => g.id === o.groupId);
      if (!target) return;

      // Reorder within the same group
      if (a.kind === 'group-tool' && a.groupId === target.id) {
        const from = target.toolIds.indexOf(a.toolId);
        const to =
          o.kind === 'group-tool' ? target.toolIds.indexOf(o.toolId) : target.toolIds.length - 1;
        if (from < 0 || to < 0 || from === to) return;
        toolGroups.setGroupTools(target.id, arrayMove(target.toolIds, from, to));
        return;
      }

      // Add from the catalog, or move from another group
      const label = a.tool.label;
      if (target.toolIds.includes(a.toolId)) {
        flash(`${label} is already in ${target.name}`);
        return;
      }
      if (target.toolIds.length >= MAX_TOOLS_PER_GROUP) {
        flash(`${target.name} is full (${MAX_TOOLS_PER_GROUP} tools max)`);
        return;
      }
      const insertAt =
        o.kind === 'group-tool' ? target.toolIds.indexOf(o.toolId) : target.toolIds.length;
      const nextIds = [...target.toolIds];
      nextIds.splice(insertAt < 0 ? nextIds.length : insertAt, 0, a.toolId);
      toolGroups.setGroupTools(target.id, nextIds);
      if (a.kind === 'group-tool') {
        toolGroups.removeToolFromGroup(a.groupId, a.toolId);
      }
    },
    [customGroups, toolGroups, flash]
  );

  /* ── Bulk "Add tools" picker ───────────────────────────────────────────── */

  const sortedCatalog = useMemo(
    () => [...tools].sort((a, b) => a.label.localeCompare(b.label)),
    [tools]
  );

  const openPicker = useCallback(
    (groupId: string) => {
      const group = toolGroups.groups.find((g) => g.id === groupId);
      if (!group) return;
      setPicker({ groupId, query: '', selected: new Set(group.toolIds) });
    },
    [toolGroups]
  );

  const togglePickerTool = useCallback((toolId: string) => {
    setPicker((prev) => {
      if (!prev) return prev;
      const selected = new Set(prev.selected);
      if (selected.has(toolId)) selected.delete(toolId);
      else if (selected.size < MAX_TOOLS_PER_GROUP) selected.add(toolId);
      return { ...prev, selected };
    });
  }, []);

  /** Kept tools preserve their curated order; newly picked ones append in
   * catalog (alphabetical) order. setGroupTools is called outside any state
   * updater — updaters must stay pure (no setState into other components). */
  const commitPicker = useCallback(() => {
    if (!picker) return;
    const group = toolGroups.groups.find((g) => g.id === picker.groupId);
    if (group) {
      const kept = group.toolIds.filter((id) => picker.selected.has(id));
      const added = sortedCatalog
        .filter((t) => picker.selected.has(t.id) && !group.toolIds.includes(t.id))
        .map((t) => t.id);
      toolGroups.setGroupTools(picker.groupId, [...kept, ...added]);
    }
    setPicker(null);
  }, [picker, toolGroups, sortedCatalog]);

  const pickerGroup = picker ? toolGroups.groups.find((g) => g.id === picker.groupId) : null;
  const pickerTools = useMemo(() => {
    if (!picker) return [];
    const q = picker.query.trim().toLowerCase();
    return q ? sortedCatalog.filter((t) => t.label.toLowerCase().includes(q)) : sortedCatalog;
  }, [picker, sortedCatalog]);

  /* ── Rendering ─────────────────────────────────────────────────────────── */

  const renderToolItem = (group: PanelGroup, tool: ToolDefinition) => {
    const itemProps: ToolItemProps = {
      tool,
      disabled,
      onClick: () => onToolClick(tool),
      isFavorite: favoriteIds.includes(tool.id),
      onToggleFavorite: favorites.toggleFavorite,
      isActive: activeToolId === tool.id,
      isSuggested: suggestedToolIds.includes(tool.id),
      onHover: handleHover,
      onLeave: handleLeave,
      customGroupId: group.customGroupId,
      onRemoveFromGroup: handleRemoveFromGroup,
      onOpenGroupMenu: openGroupMenu,
    };
    return group.customGroupId ? (
      <SortableGroupTool
        key={tool.id}
        groupId={group.customGroupId}
        viewMode={viewMode}
        {...itemProps}
      />
    ) : (
      <DraggableCatalogTool key={tool.id} sectionId={group.id} viewMode={viewMode} {...itemProps} />
    );
  };

  const renderGroup = (group: PanelGroup) => (
    <div key={group.id} className="tu-group">
      <GroupHeader
        label={group.label}
        count={group.tools.length}
        collapsed={!!collapsedGroups[group.id]}
        onToggle={() => toggleGroup(group.id)}
        pinned={group.id === '_pinned'}
      />
      {!collapsedGroups[group.id] && (
        <div className={viewMode === 'grid' ? 'tu-group-grid' : 'tu-group-items'}>
          {group.tools.map((tool) => renderToolItem(group, tool))}
        </div>
      )}
    </div>
  );

  const renderCustomGroup = (group: PanelGroup) => {
    const gid = group.customGroupId!;
    const collapsed = !!collapsedGroups[group.id];
    // Highlight while a tool from outside this group hovers over it
    const highlight =
      dropGroupId === gid &&
      activeDrag !== null &&
      (activeDrag.kind === 'catalog-tool' ||
        (activeDrag.kind === 'group-tool' && activeDrag.groupId !== gid));
    return (
      <SortableCustomGroup key={group.id} groupId={gid} label={group.label} highlight={highlight}>
        {(dragHandleProps) => (
          <>
            <CustomGroupHeader
              label={group.label}
              count={group.tools.length}
              collapsed={collapsed}
              onToggle={() => toggleGroup(group.id)}
              onRename={(name) => toolGroups.renameGroup(gid, name)}
              onDelete={() => toolGroups.deleteGroup(gid)}
              onAddTools={() => openPicker(gid)}
              dragHandleProps={dragHandleProps}
            />
            {!collapsed && group.tools.length === 0 && (
              <div className="tu-group-empty-hint">
                Drag tools here, or use the + on any tool
              </div>
            )}
            {!collapsed && group.tools.length > 0 && (
              <SortableContext
                items={group.tools.map((t) => `grouptool:${gid}:${t.id}`)}
                strategy={viewMode === 'grid' ? rectSortingStrategy : verticalListSortingStrategy}
              >
                <div className={viewMode === 'grid' ? 'tu-group-grid' : 'tu-group-items'}>
                  {group.tools.map((tool) => renderToolItem(group, tool))}
                </div>
              </SortableContext>
            )}
          </>
        )}
      </SortableCustomGroup>
    );
  };

  return (
    <div className="tu-tpanel">
      <div className="tu-tpanel-search">
        <SearchIcon size={13} />
        <input
          value={filterQuery}
          placeholder="Filter tools…"
          onChange={(e) => setFilterQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') setFilterQuery('');
          }}
          aria-label="Filter tools"
        />
        {filterQuery && (
          <button
            className="tu-tpanel-search-clear"
            onClick={() => setFilterQuery('')}
            aria-label="Clear filter"
          >
            <XIcon size={12} />
          </button>
        )}
      </div>

      {!hideChips && (
        <div className="tu-tpanel-tabs">
          {visibleRowChips.map((chip) => {
            const key = chipKey(chip);
            const label = chipLabel(chip, customGroups)!;
            return (
              <button
                key={key}
                className={`tu-tpanel-tab${activeChipKey === key ? ' tu-tpanel-tab--active' : ''}`}
                onClick={() => onChipChange(key)}
                title={label}
              >
                <span className="tu-tpanel-tab-label">{label}</span>
                <span className="tu-tpanel-tab-count">{chipCounts[key] || 0}</span>
              </button>
            );
          })}
          {overflowRowChips.length > 0 && (
            <button
              ref={overflowBtnRef}
              className="tu-tpanel-tab tu-tpanel-tab--more"
              onClick={() => setOverflowOpen(true)}
              aria-label={`${overflowRowChips.length} more views`}
              aria-haspopup="menu"
            >
              <EllipsisIcon size={12} />
              <span className="tu-tpanel-tab-count">+{overflowRowChips.length}</span>
            </button>
          )}
          <button
            className="tu-tpanel-tab tu-tpanel-tab--edit"
            onClick={(e) => setChipEditorAnchor(e.currentTarget.getBoundingClientRect())}
            aria-label="Customize sidebar"
            title="Customize sidebar"
          >
            <PlusIcon size={12} />
          </button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="tu-tpanel-list">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${query ? '_search' : activeChipKey}-${viewMode}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.12 }}
            >
              <SortableContext
                items={customGroups.map((g) => `groupblock:${g.id}`)}
                strategy={verticalListSortingStrategy}
              >
                {topGroups.map((g) => (g.customGroupId ? renderCustomGroup(g) : renderGroup(g)))}
              </SortableContext>
              {showNewGroupRow &&
                (newGroupName !== null ? (
                  <div className="tu-group-new tu-group-new--editing">
                    <input
                      className="tu-group-rename-input"
                      value={newGroupName}
                      autoFocus
                      maxLength={100}
                      placeholder="Group name"
                      onChange={(e) => setNewGroupName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitNewGroup();
                        if (e.key === 'Escape') setNewGroupName(null);
                      }}
                      onBlur={commitNewGroup}
                      aria-label="New group name"
                    />
                  </div>
                ) : (
                  <button
                    className="tu-group-new"
                    onClick={() => setNewGroupName('')}
                    disabled={customGroups.length >= MAX_TOOL_GROUPS}
                    title={
                      customGroups.length >= MAX_TOOL_GROUPS
                        ? `Group limit reached (${MAX_TOOL_GROUPS})`
                        : 'Create a custom tool group'
                    }
                  >
                    <PlusIcon size={12} />
                    <span>New Group</span>
                  </button>
                ))}
              {catalogGroups.map(renderGroup)}
              {emptyHint && <div className="tu-sidebar-panel-empty">{emptyHint}</div>}
            </motion.div>
          </AnimatePresence>
        </div>

        <DragOverlay>
          {activeDrag && activeDrag.kind !== 'group' && (
            <div className="tu-dnd-overlay">
              <ToolIcon
                icon={activeDrag.tool.icon}
                color={activeDrag.tool.color}
                toolId={activeDrag.tool.id}
              />
              <span>{activeDrag.tool.label}</span>
            </div>
          )}
          {activeDrag && activeDrag.kind === 'group' && (
            <div className="tu-dnd-overlay tu-dnd-overlay--group">
              <GripVerticalIcon size={12} />
              <span>{activeDrag.label}</span>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Transient snackbar (undo removals, drop feedback) */}
      {snackbar && (
        <div className="tu-undo-snackbar" role="status" aria-live="polite">
          <span className="tu-undo-snackbar-msg">{snackbar.message}</span>
          {snackbar.undo && (
            <button
              className="tu-undo-snackbar-btn"
              onClick={() => {
                snackbar.undo?.();
                dismissSnackbar();
              }}
            >
              Undo
            </button>
          )}
          <button
            className="tu-undo-snackbar-close"
            onClick={dismissSnackbar}
            aria-label="Dismiss notification"
          >
            <XIcon size={12} />
          </button>
        </div>
      )}

      {/* Portal ⋯ +N overflow menu (mobile chip row) */}
      {overflowOpen &&
        createPortal(
          <>
            <div className="tu-group-menu-backdrop" onClick={() => setOverflowOpen(false)} />
            <div
              className="tu-group-menu"
              style={(() => {
                const rect = overflowBtnRef.current?.getBoundingClientRect();
                const top = Math.min((rect?.bottom ?? 0) + 4, window.innerHeight - 320);
                const left = Math.min(rect?.left ?? 0, window.innerWidth - 228);
                return { top: Math.max(4, top), left: Math.max(4, left) };
              })()}
              role="menu"
              aria-label="More views"
            >
              {overflowRowChips.map((chip) => {
                const key = chipKey(chip);
                const label = chipLabel(chip, customGroups)!;
                return (
                  <button
                    key={key}
                    className="tu-group-menu-item"
                    role="menuitem"
                    onClick={() => {
                      onChipChange(key);
                      setOverflowOpen(false);
                    }}
                  >
                    <span className="tu-group-menu-name">{label}</span>
                    <span className="tu-tpanel-tab-count">{chipCounts[key] || 0}</span>
                  </button>
                );
              })}
            </div>
          </>,
          document.body
        )}

      {/* Chip-row editor popover */}
      {chipEditorAnchor && (
        <ChipEditor
          anchor={chipEditorAnchor}
          onClose={() => setChipEditorAnchor(null)}
          sidebarChips={sidebarChips}
          toolGroups={toolGroups}
          showAlert={showAlert}
        />
      )}

      {/* Portal tooltip */}
      {tooltip &&
        createPortal(
          <div
            className="tu-titem-tooltip"
            style={{ top: tooltip.top, left: tooltip.left, transform: 'translateY(-50%)' }}
          >
            {tooltip.text}
          </div>,
          document.body
        )}

      {/* Portal add-to-group menu */}
      {groupMenu &&
        createPortal(
          <>
            <div className="tu-group-menu-backdrop" onClick={() => setGroupMenu(null)} />
            <div
              className="tu-group-menu"
              style={{ top: groupMenu.top, left: groupMenu.left }}
              role="menu"
              aria-label="Add to group"
            >
              <div className="tu-group-menu-title">Add to group</div>
              {customGroups.map((g) => {
                const checked = g.toolIds.includes(groupMenu.toolId);
                return (
                  <button
                    key={g.id}
                    className="tu-group-menu-item"
                    role="menuitemcheckbox"
                    aria-checked={checked}
                    onClick={() => {
                      if (checked) handleRemoveFromGroup(g.id, groupMenu.toolId);
                      else toolGroups.addToolToGroup(g.id, groupMenu.toolId);
                    }}
                  >
                    <span className="tu-group-menu-check">
                      {checked ? <CheckIcon size={12} /> : null}
                    </span>
                    <span className="tu-group-menu-name">{g.name}</span>
                  </button>
                );
              })}
              {customGroups.length === 0 && (
                <div className="tu-group-menu-empty">No groups yet</div>
              )}
              <div className="tu-group-menu-sep" />
              {menuNewName === null ? (
                <button
                  className="tu-group-menu-item tu-group-menu-item--new"
                  onClick={() => setMenuNewName('')}
                  disabled={customGroups.length >= MAX_TOOL_GROUPS}
                >
                  <span className="tu-group-menu-check">
                    <PlusIcon size={12} />
                  </span>
                  <span className="tu-group-menu-name">New group…</span>
                </button>
              ) : (
                <input
                  className="tu-group-rename-input tu-group-menu-input"
                  value={menuNewName}
                  autoFocus
                  maxLength={100}
                  placeholder="Group name"
                  onChange={(e) => setMenuNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const name = menuNewName.trim();
                      if (name) {
                        toolGroups.createGroup(name, [groupMenu.toolId]);
                        setGroupMenu(null);
                      }
                    }
                    if (e.key === 'Escape') setMenuNewName(null);
                  }}
                  aria-label="New group name"
                />
              )}
            </div>
          </>,
          document.body
        )}

      {/* Portal bulk "Add tools" picker */}
      {picker &&
        createPortal(
          <>
            <div className="tu-group-menu-backdrop" onClick={() => setPicker(null)} />
            <div
              className="tu-group-picker"
              role="dialog"
              aria-modal="true"
              aria-label={`Add tools to ${pickerGroup?.name ?? 'group'}`}
            >
              <div className="tu-group-picker-head">
                <span className="tu-group-picker-title">
                  Add tools to {pickerGroup?.name ?? 'group'}
                </span>
                <button
                  className="tu-group-picker-close"
                  onClick={() => setPicker(null)}
                  aria-label="Close"
                >
                  <XIcon size={14} />
                </button>
              </div>
              <div className="tu-group-picker-search">
                <SearchIcon size={13} />
                <input
                  autoFocus
                  value={picker.query}
                  placeholder="Search tools…"
                  onChange={(e) =>
                    setPicker((prev) => (prev ? { ...prev, query: e.target.value } : prev))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') setPicker(null);
                  }}
                  aria-label="Search tools"
                />
              </div>
              <div className="tu-group-picker-list">
                {pickerTools.map((t) => {
                  const checked = picker.selected.has(t.id);
                  const full = !checked && picker.selected.size >= MAX_TOOLS_PER_GROUP;
                  return (
                    <label
                      key={t.id}
                      className={`tu-group-picker-item${
                        full ? ' tu-group-picker-item--disabled' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={full}
                        onChange={() => togglePickerTool(t.id)}
                      />
                      <ToolIcon icon={t.icon} color={t.color} toolId={t.id} />
                      <span className="tu-group-picker-name">{t.label}</span>
                    </label>
                  );
                })}
                {pickerTools.length === 0 && (
                  <div className="tu-group-menu-empty">No tools match</div>
                )}
              </div>
              <div className="tu-group-picker-foot">
                <span className="tu-group-picker-count">
                  {picker.selected.size}/{MAX_TOOLS_PER_GROUP} selected
                </span>
                <button className="tu-group-picker-cancel" onClick={() => setPicker(null)}>
                  Cancel
                </button>
                <button className="tu-group-picker-save" onClick={commitPicker}>
                  Save
                </button>
              </div>
            </div>
          </>,
          document.body
        )}
    </div>
  );
});
