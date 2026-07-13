import { useState, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { USE_CASE_TABS, TOOL_GROUPS } from '@velobits/app-core/constants/tools';
import ToolIcon from '@velobits/app-core/components/editor/ToolIcon';
import type { ToolDefinition, ToolTab } from '@velobits/app-core/types/tools';

interface TooltipState {
  text: string;
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
}

interface GroupHeaderProps {
  label: string;
  count: number;
  collapsed: boolean;
  onToggle: () => void;
  pinned: boolean;
}

interface ToolPanelProps {
  tools: ToolDefinition[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  onToolClick: (tool: ToolDefinition) => void;
  disabled: boolean;
  favorites: FavoritesState;
  activeToolId?: string | null;
  hideTabs?: boolean;
  viewMode?: string;
  suggestedToolIds?: string[];
  personaToolIds?: string[];
}

function ToolPanelItem({
  tool,
  disabled,
  onClick,
  isFavorite,
  onToggleFavorite,
  isActive,
  isSuggested,
  onHover,
  onLeave,
}: ToolItemProps) {
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
        <button
          className={`tu-titem-fav${isFavorite ? ' tu-titem-fav--active' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(tool.id);
          }}
        >
          {isFavorite ? '♥' : '♡'}
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

/* ── Grid view tool card ───────────────────────────── */
function ToolGridCard({
  tool,
  disabled,
  onClick,
  isFavorite,
  onToggleFavorite,
  isActive,
  isSuggested,
  onHover,
  onLeave,
}: ToolItemProps) {
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
      <button
        className={`tu-titem-fav tu-tgrid-card-fav${isFavorite ? ' tu-titem-fav--active' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onToggleFavorite?.(tool.id);
        }}
      >
        {isFavorite ? '♥' : '♡'}
      </button>
    </div>
  );
}

export default memo(function ToolPanel({
  tools,
  activeTab,
  onTabChange,
  onToolClick,
  disabled,
  favorites,
  activeToolId,
  hideTabs,
  viewMode = 'list',
  suggestedToolIds = [],
  personaToolIds = [],
}: ToolPanelProps) {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

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

  // Group tools — each group contains tools sorted alphabetically
  // Favorites are pinned at the top as their own group
  const favoriteIds = useMemo(() => favorites.favorites || [], [favorites]);
  const groupedTools = useMemo(() => {
    const groups: { id: string; label: string; tools: ToolDefinition[] }[] = [];
    const groupMap: Record<string, ToolDefinition[]> = {};

    // Collect pinned favorites from the filtered set
    const pinnedTools =
      favoriteIds.length > 0
        ? filteredTools
            .filter((t) => favoriteIds.includes(t.id))
            .sort((a, b) => a.label.localeCompare(b.label))
        : [];

    if (pinnedTools.length > 0) {
      groups.push({ id: '_pinned', label: 'Pinned', tools: pinnedTools });
    }

    // Persona "For You" picks — from the full catalog, not filteredTools, so
    // they stay visible whatever tab is active (a persona's suggested tool may
    // not belong to its own default tab); curated order, favorites already
    // pinned above so skip them here
    const forYouTools = personaToolIds
      .map((id) => tools.find((t) => t.id === id))
      .filter((t): t is ToolDefinition => !!t && !favoriteIds.includes(t.id));
    if (forYouTools.length > 0) {
      groups.push({ id: '_foryou', label: 'For You', tools: forYouTools });
    }

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
        groups.push({ id: g.id, label: g.label, tools: groupMap[g.id]! });
        delete groupMap[g.id];
      }
    }
    // Any remaining groups not in TOOL_GROUPS
    for (const [gid, gTools] of Object.entries(groupMap)) {
      if (gTools.length > 0) {
        groups.push({ id: gid, label: gid.charAt(0).toUpperCase() + gid.slice(1), tools: gTools });
      }
    }

    return groups;
  }, [filteredTools, favoriteIds, personaToolIds, tools]);

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
            {groupedTools.map((group) => (
              <div key={group.id} className="tu-group">
                <GroupHeader
                  label={group.label}
                  count={group.tools.length}
                  collapsed={!!collapsedGroups[group.id]}
                  onToggle={() => toggleGroup(group.id)}
                  pinned={group.id === '_pinned' || group.id === '_foryou'}
                />
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
                        />
                      ))}
                    </div>
                  ))}
              </div>
            ))}
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
    </div>
  );
});
