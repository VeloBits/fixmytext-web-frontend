import { useState, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { USE_CASE_TABS, TOOL_GROUPS } from '@velobits/app-core/constants/tools';
import { MAX_TOOL_GROUPS } from '@velobits/app-core/hooks/useToolGroups';
import ToolIcon from '@velobits/app-core/components/editor/ToolIcon';
import type { ToolDefinition, ToolTab } from '@velobits/app-core/types/tools';
import type { ToolGroupsContextValue } from '@velobits/app-core/types/context';
import {
  CheckIcon,
  HeartIcon,
  MinusIcon,
  PenLineIcon,
  PlusIcon,
  Trash2Icon,
} from '@velobits/design-system';

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
}

interface ToolPanelProps {
  tools: ToolDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onToolClick: (tool: ToolDefinition) => void;
  disabled: boolean;
  favorites: FavoritesState;
  toolGroups: ToolGroupsContextValue;
  activeToolId?: string | null;
  hideTabs?: boolean;
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
  } = props;
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled && tool.type !== 'drawer' && (tool.type as string) !== 'action';
  const itemRef = useRef<HTMLDivElement | null>(null);

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
      ref={itemRef}
      className={`tu-titem-wrap${hovered ? ' tu-titem-wrap--hover' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={`tu-titem${isActive ? ' tu-titem--active' : ''}${
          isDisabled ? ' tu-titem--disabled' : ''
        }`}
        onClick={handleClick}
      >
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

/* ── Custom (user-created) group header: rename + delete on hover ── */
function CustomGroupHeader({
  label,
  count,
  collapsed,
  onToggle,
  onRename,
  onDelete,
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
  const { tool, disabled, onClick, isFavorite, onToggleFavorite, isActive, isSuggested, onHover, onLeave } =
    props;
  const isDisabled = disabled && tool.type !== 'drawer' && (tool.type as string) !== 'action';
  const cardRef = useRef<HTMLDivElement | null>(null);

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
      ref={cardRef}
      className={`tu-tgrid-card${isActive ? ' tu-tgrid-card--active' : ''}${
        isDisabled ? ' tu-tgrid-card--disabled' : ''
      }`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onLeave}
    >
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

interface PanelGroup {
  id: string;
  label: string;
  tools: ToolDefinition[];
  /** Present on user-created groups (the raw group id, without the section prefix). */
  customGroupId?: string;
}

export default memo(function ToolPanel({
  tools,
  activeTab,
  onTabChange,
  onToolClick,
  disabled,
  favorites,
  toolGroups,
  activeToolId,
  hideTabs,
  viewMode = 'list',
  suggestedToolIds = [],
}: ToolPanelProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [groupMenu, setGroupMenu] = useState<GroupMenuState | null>(null);
  // null = the "New group…" row is a button; a string = its inline input value
  const [menuNewName, setMenuNewName] = useState<string | null>(null);
  const [newGroupName, setNewGroupName] = useState<string | null>(null);

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

  // Count tools per tab
  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { all: tools.length };
    for (const tab of USE_CASE_TABS) {
      if (!counts[tab.id]) {
        counts[tab.id] = tools.filter((t) => t.tabs?.includes(tab.id as ToolTab)).length;
      }
    }
    return counts;
  }, [tools]);

  // Filter tools by active tab
  const filteredTools = useMemo(() => {
    if (activeTab === 'all') return [...tools].sort((a, b) => a.label.localeCompare(b.label));
    return tools.filter((t) => t.tabs?.includes(activeTab as ToolTab));
  }, [tools, activeTab]);

  // Group tools — pinned favorites and the user's custom groups sit above the
  // canonical catalog groups, which keep TOOL_GROUPS order.
  const favoriteIds = useMemo(() => favorites.favorites || [], [favorites]);
  const customGroups = toolGroups.groups;
  const { topGroups, catalogGroups } = useMemo(() => {
    const top: PanelGroup[] = [];

    // Collect pinned favorites from the filtered set
    const pinnedTools =
      favoriteIds.length > 0
        ? filteredTools
            .filter((t) => favoriteIds.includes(t.id))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [];

    if (pinnedTools.length > 0) {
      top.push({ id: '_pinned', label: 'Pinned', tools: pinnedTools });
    }

    // Custom groups resolve from the full catalog, not filteredTools, so they
    // stay visible whatever tab is active; user-curated order, favorites NOT
    // excluded (the user put them there). Empty groups still render — a
    // just-created group needs a visible home for its + affordance.
    for (const g of customGroups) {
      top.push({
        id: `custom:${g.id}`,
        label: g.name,
        customGroupId: g.id,
        tools: g.toolIds
          .map((id) => tools.find((t) => t.id === id))
          .filter((t): t is ToolDefinition => !!t),
      });
    }

    const catalog: PanelGroup[] = [];
    const groupMap: Record<string, ToolDefinition[]> = {};
    for (const tool of filteredTools) {
      const gid = tool.group || 'other';
      if (!groupMap[gid]) {
        groupMap[gid] = [];
      }
      groupMap[gid].push(tool);
    }

    // Sort each group's tools alphabetically
    for (const gid of Object.keys(groupMap)) {
      groupMap[gid]!.sort((a, b) => a.label.localeCompare(b.label));
    }

    // Maintain TOOL_GROUPS order, then add any ungrouped
    for (const g of TOOL_GROUPS) {
      if ((groupMap[g.id]?.length ?? 0) > 0) {
        catalog.push({ id: g.id, label: g.label, tools: groupMap[g.id]! });
        delete groupMap[g.id];
      }
    }
    // Any remaining groups not in TOOL_GROUPS
    for (const [gid, gTools] of Object.entries(groupMap)) {
      if (gTools.length > 0) {
        catalog.push({
          id: gid,
          label: gid.charAt(0).toUpperCase() + gid.slice(1),
          tools: gTools,
        });
      }
    }

    return { topGroups: top, catalogGroups: catalog };
  }, [filteredTools, favoriteIds, customGroups, tools]);

  const commitNewGroup = () => {
    const name = (newGroupName ?? '').trim();
    if (name) toolGroups.createGroup(name);
    setNewGroupName(null);
  };

  const renderGroup = (group: PanelGroup) => (
    <div key={group.id} className="tu-group">
      {group.customGroupId ? (
        <CustomGroupHeader
          label={group.label}
          count={group.tools.length}
          collapsed={!!collapsedGroups[group.id]}
          onToggle={() => toggleGroup(group.id)}
          onRename={(name) => toolGroups.renameGroup(group.customGroupId!, name)}
          onDelete={() => toolGroups.deleteGroup(group.customGroupId!)}
        />
      ) : (
        <GroupHeader
          label={group.label}
          count={group.tools.length}
          collapsed={!!collapsedGroups[group.id]}
          onToggle={() => toggleGroup(group.id)}
          pinned={group.id === '_pinned'}
        />
      )}
      {!collapsedGroups[group.id] && group.customGroupId && group.tools.length === 0 && (
        <div className="tu-group-empty-hint">Use the + on any tool to add it here</div>
      )}
      {!collapsedGroups[group.id] &&
        (viewMode === 'grid' ? (
          <div className="tu-group-grid">
            {group.tools.map((tool) => (
              <ToolGridCard
                key={tool.id}
                tool={tool}
                disabled={disabled}
                onClick={() => onToolClick(tool)}
                isFavorite={favoriteIds.includes(tool.id)}
                onToggleFavorite={favorites.toggleFavorite}
                isActive={activeToolId === tool.id}
                isSuggested={suggestedToolIds.includes(tool.id)}
                onHover={handleHover}
                onLeave={handleLeave}
                customGroupId={group.customGroupId}
                onRemoveFromGroup={toolGroups.removeToolFromGroup}
                onOpenGroupMenu={openGroupMenu}
              />
            ))}
          </div>
        ) : (
          <div className="tu-group-items">
            {group.tools.map((tool) => (
              <ToolPanelItem
                key={tool.id}
                tool={tool}
                disabled={disabled}
                onClick={() => onToolClick(tool)}
                isFavorite={favoriteIds.includes(tool.id)}
                onToggleFavorite={favorites.toggleFavorite}
                isActive={activeToolId === tool.id}
                isSuggested={suggestedToolIds.includes(tool.id)}
                onHover={handleHover}
                onLeave={handleLeave}
                customGroupId={group.customGroupId}
                onRemoveFromGroup={toolGroups.removeToolFromGroup}
                onOpenGroupMenu={openGroupMenu}
              />
            ))}
          </div>
        ))}
    </div>
  );

  return (
    <div className="tu-tpanel">
      {!hideTabs && (
        <div className="tu-tpanel-tabs">
          {USE_CASE_TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tu-tpanel-tab${activeTab === tab.id ? ' tu-tpanel-tab--active' : ''}`}
              onClick={() => onTabChange(tab.id)}
              title={tab.label}
            >
              <span className="tu-tpanel-tab-icon">{tab.icon}</span>
              <span className="tu-tpanel-tab-label">{tab.label}</span>
              <span className="tu-tpanel-tab-count">{tabCounts[tab.id] || 0}</span>
            </button>
          ))}
        </div>
      )}

      <div className="tu-tpanel-list">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${viewMode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
            {topGroups.map(renderGroup)}
            {newGroupName !== null ? (
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
            )}
            {catalogGroups.map(renderGroup)}
          </motion.div>
        </AnimatePresence>
      </div>

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
                      if (checked) toolGroups.removeToolFromGroup(g.id, groupMenu.toolId);
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
    </div>
  );
});
