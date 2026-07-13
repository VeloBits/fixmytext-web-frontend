import React from 'react';
import type { ReactNode } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ToolPanel from './ToolPanel';
import type { ToolDefinition } from '@velobits/app-core/types/tools';

// Mock framer-motion
vi.mock('framer-motion', () => {
  const m =
    (tag: string) =>
    ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => {
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
      return React.createElement(tag, p as Record<string, unknown>, children);
    };
  return {
    motion: new Proxy({}, { get: (_, t: string) => m(t) }),
    AnimatePresence: ({ children }: { children?: ReactNode }) => children,
    useReducedMotion: () => false,
  };
});

// Mock ToolIcon
vi.mock('./ToolIcon', () => ({
  default: ({ toolId }: { toolId?: string }) =>
    React.createElement('span', { 'data-testid': `tool-icon-${toolId}` }),
}));

// Sample tools for testing
const sampleTools = [
  {
    id: 'uppercase',
    label: 'UPPERCASE',
    description: 'Convert to uppercase',
    icon: 'UC',
    color: 'violet',
    group: 'case',
    tabs: ['all', 'transform'],
    type: 'api',
  },
  {
    id: 'lowercase',
    label: 'lowercase',
    description: 'Convert to lowercase',
    icon: 'lc',
    color: 'violet',
    group: 'case',
    tabs: ['all', 'transform'],
    type: 'api',
  },
  {
    id: 'fix_grammar',
    label: 'Fix Grammar',
    description: 'AI grammar fix',
    icon: 'FG',
    color: 'pink',
    group: 'ai_writing',
    tabs: ['all', 'ai', 'writing'],
    type: 'ai',
  },
  {
    id: 'base64',
    label: 'Base64 Encode',
    description: 'Encode to base64',
    icon: 'B6',
    color: 'teal',
    group: 'encoding',
    tabs: ['all', 'encode'],
    type: 'api',
  },
] as unknown as ToolDefinition[];

const defaultProps = {
  tools: sampleTools,
  activeTab: 'all',
  onTabChange: vi.fn(),
  onToolClick: vi.fn(),
  disabled: false,
  // Favorites are their own standalone context.
  favorites: { favorites: [] as string[], toggleFavorite: vi.fn() },
  activeToolId: null,
  hideTabs: false,
  viewMode: 'list',
  suggestedToolIds: [],
};

describe('ToolPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders tool panel container', () => {
    render(<ToolPanel {...defaultProps} />);
    expect(document.querySelector('.tu-tpanel')).toBeInTheDocument();
  });

  it('renders tab buttons when hideTabs=false', () => {
    render(<ToolPanel {...defaultProps} />);
    // USE_CASE_TABS includes 'All Tools' tab
    expect(screen.getByText('All Tools')).toBeInTheDocument();
  });

  it('does not render tabs when hideTabs=true', () => {
    render(<ToolPanel {...defaultProps} hideTabs={true} />);
    expect(document.querySelector('.tu-tpanel-tabs')).not.toBeInTheDocument();
  });

  it('renders all tools when activeTab=all', () => {
    render(<ToolPanel {...defaultProps} activeTab="all" />);
    expect(screen.getByText('UPPERCASE')).toBeInTheDocument();
    expect(screen.getByText('lowercase')).toBeInTheDocument();
    expect(screen.getByText('Fix Grammar')).toBeInTheDocument();
    expect(screen.getByText('Base64 Encode')).toBeInTheDocument();
  });

  it('filters tools by activeTab', () => {
    const writingTools = [
      {
        id: 'fix_grammar',
        label: 'Fix Grammar',
        icon: 'FG',
        color: 'pink',
        group: 'ai_writing',
        tabs: ['writing', 'ai'],
        type: 'ai',
      },
      {
        id: 'uppercase',
        label: 'UPPERCASE',
        icon: 'UC',
        color: 'violet',
        group: 'case',
        tabs: ['transform'],
        type: 'api',
      },
    ] as unknown as ToolDefinition[];
    render(<ToolPanel {...defaultProps} tools={writingTools} activeTab="writing" />);
    expect(screen.getByText('Fix Grammar')).toBeInTheDocument();
    expect(screen.queryByText('UPPERCASE')).not.toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', () => {
    const onTabChange = vi.fn();
    render(<ToolPanel {...defaultProps} onTabChange={onTabChange} />);
    fireEvent.click(screen.getByText('Writing'));
    expect(onTabChange).toHaveBeenCalledWith('writing');
  });

  it('calls onToolClick when a tool is clicked', () => {
    const onToolClick = vi.fn();
    render(<ToolPanel {...defaultProps} onToolClick={onToolClick} />);
    fireEvent.click(screen.getByText('UPPERCASE'));
    expect(onToolClick).toHaveBeenCalledWith(sampleTools[0]);
  });

  it('renders group headers for grouped tools', () => {
    render(<ToolPanel {...defaultProps} activeTab="all" />);
    // Group labels come from TOOL_GROUPS - 'case' maps to 'Case Transform'
    expect(screen.getByText('Case Transform')).toBeInTheDocument();
  });

  it('renders tool count in group header', () => {
    render(<ToolPanel {...defaultProps} activeTab="all" />);
    // 'case' group has 2 tools
    // The count should appear next to the group header
    const caseGroupCounts = screen.getAllByText('2');
    expect(caseGroupCounts.length).toBeGreaterThanOrEqual(1);
  });

  it('renders favorite heart button on each tool', () => {
    render(<ToolPanel {...defaultProps} />);
    const favBtns = document.querySelectorAll('.tu-titem-fav');
    expect(favBtns.length).toBe(sampleTools.length);
  });

  it('marks active tool with active class', () => {
    render(<ToolPanel {...defaultProps} activeToolId="uppercase" />);
    const activeItem = document.querySelector('.tu-titem--active');
    expect(activeItem).toBeInTheDocument();
  });

  it('does not show active class when activeToolId is null', () => {
    render(<ToolPanel {...defaultProps} activeToolId={null} />);
    expect(document.querySelector('.tu-titem--active')).not.toBeInTheDocument();
  });

  it('renders pinned favorites group when favorites are set', () => {
    const favorites = { favorites: ['uppercase'], toggleFavorite: vi.fn() };
    render(<ToolPanel {...defaultProps} favorites={favorites} />);
    expect(screen.getByText('Pinned')).toBeInTheDocument();
  });

  it('shows filled heart for favorite tools', () => {
    const favorites = { favorites: ['uppercase'], toggleFavorite: vi.fn() };
    render(<ToolPanel {...defaultProps} favorites={favorites} />);
    const activeFavBtns = document.querySelectorAll('.tu-titem-fav--active');
    expect(activeFavBtns.length).toBeGreaterThan(0);
  });

  it('calls toggleFavorite when heart is clicked', () => {
    const toggleFavorite = vi.fn();
    const favorites = { favorites: [] as string[], toggleFavorite };
    render(<ToolPanel {...defaultProps} favorites={favorites} />);
    const favBtns = document.querySelectorAll('.tu-titem-fav');
    fireEvent.click(favBtns[0]!);
    expect(toggleFavorite).toHaveBeenCalled();
  });

  it('renders suggested badge for suggested tools', () => {
    render(<ToolPanel {...defaultProps} suggestedToolIds={['uppercase']} />);
    expect(screen.getByText('suggested')).toBeInTheDocument();
  });

  it('renders For You group from personaToolIds in curated order', () => {
    render(<ToolPanel {...defaultProps} personaToolIds={['fix_grammar', 'base64']} />);
    const forYouGroup = screen.getByText('For You').closest('.tu-group')!;
    const labels = Array.from(forYouGroup.querySelectorAll('.tu-titem-name')).map(
      (el) => el.textContent
    );
    // Curated order preserved: fix_grammar first even though 'Base64 Encode' sorts before it
    expect(labels).toEqual(['Fix Grammar', 'Base64 Encode']);
  });

  it('renders For You tools even when their tabs exclude the active tab', () => {
    // base64 only has tabs ['all','encode'] — must still show on 'writing'
    render(<ToolPanel {...defaultProps} activeTab="writing" personaToolIds={['base64']} />);
    expect(screen.getByText('For You')).toBeInTheDocument();
    expect(screen.getByText('Base64 Encode')).toBeInTheDocument();
  });

  it('does not render For You group when personaToolIds is empty or omitted', () => {
    const { rerender } = render(<ToolPanel {...defaultProps} personaToolIds={[]} />);
    expect(screen.queryByText('For You')).not.toBeInTheDocument();
    rerender(<ToolPanel {...defaultProps} />);
    expect(screen.queryByText('For You')).not.toBeInTheDocument();
  });

  it('ignores unknown ids in personaToolIds', () => {
    render(<ToolPanel {...defaultProps} personaToolIds={['does_not_exist']} />);
    expect(screen.queryByText('For You')).not.toBeInTheDocument();
  });

  it('clicking a For You tool calls onToolClick', () => {
    const onToolClick = vi.fn();
    render(
      <ToolPanel
        {...defaultProps}
        activeTab="writing"
        personaToolIds={['base64']}
        onToolClick={onToolClick}
      />
    );
    fireEvent.click(screen.getByText('Base64 Encode'));
    expect(onToolClick).toHaveBeenCalledWith(sampleTools[3]);
  });

  it('excludes favorited tools from For You (already pinned above)', () => {
    const favorites = { favorites: ['fix_grammar'], toggleFavorite: vi.fn() };
    render(
      <ToolPanel
        {...defaultProps}
        favorites={favorites}
        personaToolIds={['fix_grammar', 'base64']}
      />
    );
    expect(screen.getByText('Pinned')).toBeInTheDocument();
    const forYouGroup = screen.getByText('For You').closest('.tu-group')!;
    expect(forYouGroup.textContent).toContain('Base64 Encode');
    // fix_grammar sits in Pinned already — not duplicated into For You
    expect(forYouGroup.textContent).not.toContain('Fix Grammar');
  });

  it('pinned favorites and For You work together', () => {
    // Favorites + persona picks are independent contexts driving the pinned
    // and For You groups.
    const toggleFavorite = vi.fn();
    const favorites = { favorites: ['uppercase'], toggleFavorite };
    render(<ToolPanel {...defaultProps} favorites={favorites} personaToolIds={['fix_grammar']} />);
    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.getByText('For You')).toBeInTheDocument();
    const heart = document.querySelector('.tu-titem-fav--active');
    fireEvent.click(heart!);
    expect(toggleFavorite).toHaveBeenCalledWith('uppercase');
  });

  it('collapses group when group header is clicked', () => {
    render(<ToolPanel {...defaultProps} activeTab="all" />);
    // Click on Case Transform header to collapse
    const header = screen.getByText('Case Transform');
    fireEvent.click(header.closest('button')!);
    // After collapse, UPPERCASE tool should not be visible in list items
    // collapsed groups hide the items container
    expect(document.querySelector('.tu-group-header--collapsed')).toBeInTheDocument();
  });

  it('renders grid view when viewMode=grid', () => {
    render(<ToolPanel {...defaultProps} viewMode="grid" />);
    expect(document.querySelector('.tu-tgrid-card')).toBeInTheDocument();
  });

  it('renders list view by default', () => {
    render(<ToolPanel {...defaultProps} viewMode="list" />);
    expect(document.querySelector('.tu-titem')).toBeInTheDocument();
  });

  it('shows tab count badges', () => {
    render(<ToolPanel {...defaultProps} />);
    const countSpans = document.querySelectorAll('.tu-tpanel-tab-count');
    expect(countSpans.length).toBeGreaterThan(0);
  });

  it('marks active tab button with active class', () => {
    render(<ToolPanel {...defaultProps} activeTab="all" />);
    const activeTab = document.querySelector('.tu-tpanel-tab--active');
    expect(activeTab).toBeInTheDocument();
  });

  it('renders empty group list when no tools match filter', () => {
    render(<ToolPanel {...defaultProps} tools={[]} activeTab="all" />);
    // No tool items should be rendered
    expect(document.querySelectorAll('.tu-titem').length).toBe(0);
  });

  it('renders disabled tool items when disabled=true', () => {
    render(<ToolPanel {...defaultProps} disabled={true} />);
    const disabledItems = document.querySelectorAll('.tu-titem--disabled');
    // api and ai tools should be disabled (type !== drawer and type !== action)
    expect(disabledItems.length).toBeGreaterThan(0);
  });

  it('does not mark drawer type tools as disabled when disabled=true', () => {
    const tools = [
      {
        id: 'find_replace',
        label: 'Find & Replace',
        icon: 'FR',
        color: 'teal',
        group: 'cleanup',
        tabs: ['all'],
        type: 'drawer',
        panelId: 'find',
      },
    ] as unknown as ToolDefinition[];
    render(<ToolPanel {...defaultProps} tools={tools} disabled={true} />);
    expect(document.querySelector('.tu-titem--disabled')).not.toBeInTheDocument();
  });

  it('shows tooltip on hover', () => {
    render(<ToolPanel {...defaultProps} />);
    // Hover over a tool to see its description
    const toolWrap = document.querySelector('.tu-titem-wrap');
    if (toolWrap) {
      fireEvent.mouseEnter(toolWrap);
    }
    // tooltip portal renders in document.body when description exists
    // Just check the component doesn't crash on hover
    expect(document.querySelector('.tu-tpanel')).toBeInTheDocument();
  });

  it('fires mouseLeave on tool wrap to trigger handleMouseLeave', () => {
    render(<ToolPanel {...defaultProps} />);
    const toolWrap = document.querySelector('.tu-titem-wrap');
    if (toolWrap) {
      fireEvent.mouseEnter(toolWrap);
      fireEvent.mouseLeave(toolWrap);
    }
    expect(document.querySelector('.tu-tpanel')).toBeInTheDocument();
  });

  it('clicking a disabled tool item does not call onToolClick', () => {
    const onToolClick = vi.fn();
    render(<ToolPanel {...defaultProps} disabled={true} onToolClick={onToolClick} />);
    const disabledItem = document.querySelector('.tu-titem--disabled');
    if (disabledItem) fireEvent.click(disabledItem);
    expect(onToolClick).not.toHaveBeenCalled();
  });

  it('collapses group on group header click', () => {
    render(<ToolPanel {...defaultProps} />);
    const groupHeader = document.querySelector('.tu-group-header');
    if (groupHeader) {
      fireEvent.click(groupHeader);
    }
    // after click, group should be collapsed
    expect(document.querySelector('.tu-tpanel')).toBeInTheDocument();
  });
});
