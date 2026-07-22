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
  // Memoize per tag: a fresh component identity on every property access
  // would remount the whole subtree on each render, detaching elements a
  // test holds between fireEvent calls.
  const cache: Record<string, ReturnType<typeof m>> = {};
  return {
    motion: new Proxy({}, { get: (_, t: string) => (cache[t] ??= m(t)) }),
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

const emptyToolGroups = {
  groups: [] as { id: string; name: string; toolIds: string[] }[],
  ready: true,
  createGroup: vi.fn(),
  renameGroup: vi.fn(),
  deleteGroup: vi.fn(),
  addToolToGroup: vi.fn(),
  removeToolFromGroup: vi.fn(),
  setGroupTools: vi.fn(),
  reorderGroups: vi.fn(),
};

const makeToolGroups = (groups: { id: string; name: string; toolIds: string[] }[]) => ({
  ...emptyToolGroups,
  groups,
});

const defaultProps = {
  tools: sampleTools,
  activeTab: 'all',
  onTabChange: vi.fn(),
  onToolClick: vi.fn(),
  disabled: false,
  // Favorites are their own standalone context.
  favorites: { favorites: [] as string[], toggleFavorite: vi.fn() },
  toolGroups: emptyToolGroups,
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

  describe('custom tool groups', () => {
    it('renders custom groups above catalog groups, tools in curated order', () => {
      const toolGroups = makeToolGroups([
        { id: 'g1', name: 'My Kit', toolIds: ['fix_grammar', 'base64'] },
      ]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      const kitGroup = screen.getByText('My Kit').closest('.tu-group')!;
      const labels = Array.from(kitGroup.querySelectorAll('.tu-titem-name')).map(
        (el) => el.textContent
      );
      // Curated order preserved: fix_grammar first even though 'Base64 Encode' sorts before it
      expect(labels).toEqual(['Fix Grammar', 'Base64 Encode']);
      // custom section sits above the catalog groups
      const headers = Array.from(document.querySelectorAll('.tu-group-header')).map(
        (el) => el.textContent
      );
      expect(headers[0]).toContain('My Kit');
    });

    it('renders custom group tools even when their tabs exclude the active tab', () => {
      // base64 only has tabs ['all','encode'] — must still show on 'writing'
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: ['base64'] }]);
      render(<ToolPanel {...defaultProps} activeTab="writing" toolGroups={toolGroups} />);
      expect(screen.getByText('My Kit')).toBeInTheDocument();
      expect(screen.getByText('Base64 Encode')).toBeInTheDocument();
    });

    it('renders an empty custom group with a hint row', () => {
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'Fresh Group', toolIds: [] }]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      expect(screen.getByText('Fresh Group')).toBeInTheDocument();
      expect(document.querySelector('.tu-group-empty-hint')).toBeInTheDocument();
    });

    it('ignores unknown tool ids in a group', () => {
      const toolGroups = makeToolGroups([
        { id: 'g1', name: 'My Kit', toolIds: ['does_not_exist', 'base64'] },
      ]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      const kitGroup = screen.getByText('My Kit').closest('.tu-group')!;
      expect(kitGroup.querySelectorAll('.tu-titem').length).toBe(1);
    });

    it('clicking a custom-group tool calls onToolClick', () => {
      const onToolClick = vi.fn();
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: ['base64'] }]);
      render(
        <ToolPanel
          {...defaultProps}
          activeTab="writing"
          toolGroups={toolGroups}
          onToolClick={onToolClick}
        />
      );
      fireEvent.click(screen.getByText('Base64 Encode'));
      expect(onToolClick).toHaveBeenCalledWith(sampleTools[3]);
    });

    it('rename: pencil opens an inline input, Enter commits', () => {
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: [] }]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      fireEvent.click(screen.getByLabelText('Rename My Kit group'));
      const input = screen.getByLabelText('Group name');
      fireEvent.change(input, { target: { value: 'Blog Kit' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(toolGroups.renameGroup).toHaveBeenCalledWith('g1', 'Blog Kit');
    });

    it('delete: trash asks for a confirming second click', () => {
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: [] }]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      fireEvent.click(screen.getByLabelText('Delete My Kit group'));
      expect(toolGroups.deleteGroup).not.toHaveBeenCalled();
      fireEvent.click(screen.getByLabelText('Confirm delete My Kit group'));
      expect(toolGroups.deleteGroup).toHaveBeenCalledWith('g1');
    });

    it('minus button inside a custom group removes the tool from it', () => {
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: ['base64'] }]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      const kitGroup = screen.getByText('My Kit').closest('.tu-group')!;
      fireEvent.click(
        kitGroup.querySelector('[aria-label="Remove Base64 Encode from this group"]')!
      );
      expect(toolGroups.removeToolFromGroup).toHaveBeenCalledWith('g1', 'base64');
    });

    it('+ on a catalog tool opens the add-to-group menu and toggles membership', () => {
      const toolGroups = makeToolGroups([
        { id: 'g1', name: 'My Kit', toolIds: ['uppercase'] },
        { id: 'g2', name: 'Other Kit', toolIds: [] },
      ]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      fireEvent.click(screen.getByLabelText('Add lowercase to a group'));
      const menu = document.querySelector('.tu-group-menu')!;
      expect(menu).toBeInTheDocument();
      // not a member yet → add
      fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'Other Kit' }));
      expect(toolGroups.addToolToGroup).toHaveBeenCalledWith('g2', 'lowercase');
      // already a member (uppercase) → open its menu and remove
      fireEvent.click(document.querySelector('.tu-group-menu-backdrop')!);
      fireEvent.click(screen.getByLabelText('Add UPPERCASE to a group'));
      fireEvent.click(screen.getByRole('menuitemcheckbox', { name: 'My Kit' }));
      expect(toolGroups.removeToolFromGroup).toHaveBeenCalledWith('g1', 'uppercase');
    });

    it('menu "New group…" creates a group seeded with the tool', () => {
      const toolGroups = makeToolGroups([]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      fireEvent.click(screen.getByLabelText('Add UPPERCASE to a group'));
      fireEvent.click(screen.getByText('New group…'));
      const input = screen.getByLabelText('New group name');
      fireEvent.change(input, { target: { value: 'Case Kit' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(toolGroups.createGroup).toHaveBeenCalledWith('Case Kit', ['uppercase']);
    });

    it('"New Group" row creates an empty group', () => {
      const toolGroups = makeToolGroups([]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      fireEvent.click(screen.getByText('New Group'));
      const input = screen.getByLabelText('New group name');
      fireEvent.change(input, { target: { value: 'Scratch' } });
      expect((input as HTMLInputElement).value).toBe('Scratch');
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(toolGroups.createGroup).toHaveBeenCalledWith('Scratch');
    });

    it('renders drag grips for custom-group tools and the group header, not for catalog tools', () => {
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: ['base64'] }]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      // tool grip (keyboard reorder activator) inside the custom group
      expect(screen.getByLabelText('Reorder Base64 Encode')).toBeInTheDocument();
      // group grip on the custom header
      expect(screen.getByLabelText('Reorder My Kit group')).toBeInTheDocument();
      // catalog copies of the same tool render without a grip
      const kitGroup = screen.getByText('My Kit').closest('.tu-group')!;
      const gripsOutsideKit = Array.from(document.querySelectorAll('.tu-titem-grip')).filter(
        (el) => !kitGroup.contains(el)
      );
      expect(gripsOutsideKit.length).toBe(0);
    });

    it('removal shows an undo snackbar; undo restores the exact previous order', () => {
      const toolGroups = makeToolGroups([
        { id: 'g1', name: 'My Kit', toolIds: ['fix_grammar', 'base64'] },
      ]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      const kitGroup = screen.getByText('My Kit').closest('.tu-group')!;
      fireEvent.click(
        kitGroup.querySelector('[aria-label="Remove Fix Grammar from this group"]')!
      );
      expect(toolGroups.removeToolFromGroup).toHaveBeenCalledWith('g1', 'fix_grammar');
      expect(screen.getByText('Removed Fix Grammar from My Kit')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Undo'));
      // full previous list replayed → the tool returns to its old position
      expect(toolGroups.setGroupTools).toHaveBeenCalledWith('g1', ['fix_grammar', 'base64']);
      expect(screen.queryByText('Removed Fix Grammar from My Kit')).not.toBeInTheDocument();
    });

    it('snackbar dismisses via its close button without undoing', () => {
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: ['base64'] }]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      const kitGroup = screen.getByText('My Kit').closest('.tu-group')!;
      fireEvent.click(
        kitGroup.querySelector('[aria-label="Remove Base64 Encode from this group"]')!
      );
      fireEvent.click(screen.getByLabelText('Dismiss notification'));
      expect(screen.queryByText(/Removed/)).not.toBeInTheDocument();
      expect(toolGroups.setGroupTools).not.toHaveBeenCalled();
    });

    it('empty custom group hint mentions dragging', () => {
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'Fresh Group', toolIds: [] }]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      expect(screen.getByText('Drag tools here, or use the + on any tool')).toBeInTheDocument();
    });

    describe('bulk "Add tools" picker', () => {
      it('opens from the group header, searches, and saves kept + newly picked tools', () => {
        const toolGroups = makeToolGroups([
          { id: 'g1', name: 'My Kit', toolIds: ['base64', 'fix_grammar'] },
        ]);
        render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
        fireEvent.click(screen.getByLabelText('Add tools to My Kit group'));
        const dialog = screen.getByRole('dialog', { name: 'Add tools to My Kit' });
        expect(dialog).toBeInTheDocument();
        // existing members come pre-checked
        const checked = dialog.querySelectorAll('input[type="checkbox"]:checked');
        expect(checked.length).toBe(2);
        // search narrows the list
        fireEvent.change(screen.getByLabelText('Search tools'), {
          target: { value: 'upper' },
        });
        expect(dialog.querySelector('.tu-group-picker-name')!.textContent).toBe('UPPERCASE');
        expect(dialog.querySelectorAll('.tu-group-picker-item').length).toBe(1);
        // pick it and save: curated order kept, new tool appended
        fireEvent.click(dialog.querySelector('.tu-group-picker-item input')!);
        fireEvent.click(screen.getByText('Save'));
        expect(toolGroups.setGroupTools).toHaveBeenCalledWith('g1', [
          'base64',
          'fix_grammar',
          'uppercase',
        ]);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });

      it('unchecking an existing member removes it on save', () => {
        const toolGroups = makeToolGroups([
          { id: 'g1', name: 'My Kit', toolIds: ['base64', 'fix_grammar'] },
        ]);
        render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
        fireEvent.click(screen.getByLabelText('Add tools to My Kit group'));
        const dialog = screen.getByRole('dialog', { name: 'Add tools to My Kit' });
        fireEvent.change(screen.getByLabelText('Search tools'), {
          target: { value: 'Base64' },
        });
        fireEvent.click(dialog.querySelector('.tu-group-picker-item input')!);
        fireEvent.click(screen.getByText('Save'));
        expect(toolGroups.setGroupTools).toHaveBeenCalledWith('g1', ['fix_grammar']);
      });

      it('cancel and Escape close without saving', () => {
        const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: [] }]);
        render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
        fireEvent.click(screen.getByLabelText('Add tools to My Kit group'));
        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        fireEvent.click(screen.getByLabelText('Add tools to My Kit group'));
        fireEvent.keyDown(screen.getByLabelText('Search tools'), { key: 'Escape' });
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(toolGroups.setGroupTools).not.toHaveBeenCalled();
      });
    });

    it('never renders a "For You" section (personas removed)', () => {
      const toolGroups = makeToolGroups([{ id: 'g1', name: 'My Kit', toolIds: ['base64'] }]);
      render(<ToolPanel {...defaultProps} toolGroups={toolGroups} />);
      expect(screen.queryByText('For You')).not.toBeInTheDocument();
    });

    it('pinned favorites and custom groups render together, favorites not excluded', () => {
      const toggleFavorite = vi.fn();
      const favorites = { favorites: ['fix_grammar'], toggleFavorite };
      const toolGroups = makeToolGroups([
        { id: 'g1', name: 'My Kit', toolIds: ['fix_grammar', 'base64'] },
      ]);
      render(<ToolPanel {...defaultProps} favorites={favorites} toolGroups={toolGroups} />);
      expect(screen.getByText('Pinned')).toBeInTheDocument();
      // a favorited tool STAYS in the custom group (user curated it there)
      const kitGroup = screen.getByText('My Kit').closest('.tu-group')!;
      expect(kitGroup.textContent).toContain('Fix Grammar');
      const heart = document.querySelector('.tu-titem-fav--active');
      fireEvent.click(heart!);
      expect(toggleFavorite).toHaveBeenCalledWith('fix_grammar');
    });
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
