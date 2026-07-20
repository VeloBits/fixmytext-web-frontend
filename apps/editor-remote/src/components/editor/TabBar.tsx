import { useState, useEffect, useCallback, useRef } from 'react';
import ToolIcon from '@velobits/app-core/components/editor/ToolIcon';
import { XIcon } from '@velobits/design-system';

interface WorkspaceTabTool {
  id: string;
  color?: string;
}

interface WorkspaceTab {
  id: string;
  label: string;
  icon?: string;
  type: 'tool' | 'drawer' | string;
  tool?: WorkspaceTabTool;
  panelId?: string;
  color?: string;
}

interface SaveModalPayload {
  tabId: string;
  defaultName: string;
}

interface TabBarProps {
  workspaceTabs: WorkspaceTab[];
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string) => void;
  setActivePanel: (panelId: string | null) => void;
  setSaveModal: (payload: SaveModalPayload) => void;
  closeWorkspaceTab: (id: string) => void;
  onTabSwitch?: () => void;
}

/**
 * Workspace tab bar with horizontal scrolling and tab management.
 * Renders open workspace tabs (tool or drawer), supporting scroll arrows
 * that disable at scroll boundaries, save-to-template, and close actions.
 *
 * @param {object} props
 * @param {Array} props.workspaceTabs - Array of open workspace tab objects.
 * @param {string|null} props.activeWorkspaceId - ID of the currently active tab.
 * @param {function} props.setActiveWorkspaceId - Setter to change active tab.
 * @param {function} props.setActivePanel - Setter for the active drawer panel.
 * @param {function} props.setSaveModal - Callback to open the save-as-template modal.
 * @param {function} props.closeWorkspaceTab - Callback to close a tab by ID.
 * @param {function} [props.onTabSwitch] - Optional callback fired before switching tabs.
 */
export default function TabBar({
  workspaceTabs,
  activeWorkspaceId,
  setActiveWorkspaceId,
  setActivePanel,
  setSaveModal,
  closeWorkspaceTab,
  onTabSwitch,
}: TabBarProps) {
  const barRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState({ overflows: false, atStart: true, atEnd: true });

  const updateScroll = useCallback(() => {
    const el = barRef.current;
    if (!el) return;
    const overflows = el.scrollWidth > el.clientWidth;
    const atStart = el.scrollLeft <= 0;
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
    setScrollState({ overflows, atStart, atEnd });
  }, []);

  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    updateScroll();
    el.addEventListener('scroll', updateScroll, { passive: true });
    const ro = new ResizeObserver(updateScroll);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScroll);
      ro.disconnect();
    };
  }, [updateScroll, workspaceTabs.length]);

  return (
    <div className="tu-tab-bar-wrap">
      {scrollState.overflows && (
        <button
          className={`tu-tab-scroll tu-tab-scroll--left${
            scrollState.atStart ? ' tu-tab-scroll--disabled' : ''
          }`}
          onClick={() => barRef.current?.scrollBy({ left: -200, behavior: 'smooth' })}
          disabled={scrollState.atStart}
          title="Scroll tabs left"
          aria-label="Scroll tabs left"
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
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      )}
      <div
        ref={barRef}
        className="tu-tab-bar"
        onWheel={(e) => {
          e.currentTarget.scrollLeft += e.deltaY;
          e.preventDefault();
        }}
      >
        {workspaceTabs.map((tab) => (
          <div
            key={tab.id}
            className={`tu-tab${activeWorkspaceId === tab.id ? ' tu-tab--active' : ''}`}
            onClick={() => {
              if (tab.id !== activeWorkspaceId) onTabSwitch?.();
              setActiveWorkspaceId(tab.id);
              if (tab.type === 'drawer') setActivePanel(tab.panelId ?? null);
            }}
            title={`~/FixMyText/workspace/${tab.label}`}
          >
            <ToolIcon
              icon={tab.icon}
              color={tab.tool?.color || tab.color}
              toolId={tab.tool?.id || tab.panelId}
            />
            <span className="tu-tab-name">{tab.label}</span>
            <button
              className="tu-tab-save"
              onClick={(e) => {
                e.stopPropagation();
                setSaveModal({ tabId: tab.id, defaultName: tab.label });
              }}
              title="Save to templates (Ctrl+S)"
              aria-label="Save tab to templates"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                <polyline points="17 21 17 13 7 13 7 21" />
                <polyline points="7 3 7 8 15 8" />
              </svg>
            </button>
            <button
              className="tu-tab-close"
              onClick={(e) => {
                e.stopPropagation();
                closeWorkspaceTab(tab.id);
              }}
              aria-label={`Close ${tab.label} tab`}
            >
              <XIcon size={12} />
            </button>
          </div>
        ))}
      </div>
      {scrollState.overflows && (
        <button
          className={`tu-tab-scroll tu-tab-scroll--right${
            scrollState.atEnd ? ' tu-tab-scroll--disabled' : ''
          }`}
          onClick={() => barRef.current?.scrollBy({ left: 200, behavior: 'smooth' })}
          disabled={scrollState.atEnd}
          title="Scroll tabs right"
          aria-label="Scroll tabs right"
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
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      )}
    </div>
  );
}
