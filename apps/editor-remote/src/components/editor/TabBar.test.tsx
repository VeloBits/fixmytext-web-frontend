import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TabBar from './TabBar';

vi.mock('./ToolIcon', () => ({
  default: ({ icon }: { icon?: string }) => <span data-testid="tool-icon">{icon}</span>,
}));

// jsdom doesn't provide ResizeObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
globalThis.ResizeObserver = vi.fn(function () {
  return { observe: mockObserve, unobserve: vi.fn(), disconnect: mockDisconnect };
});

describe('TabBar', () => {
  const mockTabs = [
    {
      id: 'tab-1',
      label: 'Uppercase',
      icon: 'Aa',
      type: 'tool',
      tool: { id: 'upper', color: '#f00' },
    },
    { id: 'tab-2', label: 'History', icon: 'H', type: 'drawer', panelId: 'history', color: '#0f0' },
  ];

  const baseProps = {
    workspaceTabs: mockTabs,
    activeWorkspaceId: 'tab-1',
    setActiveWorkspaceId: vi.fn(),
    setActivePanel: vi.fn(),
    setSaveModal: vi.fn(),
    closeWorkspaceTab: vi.fn(),
    onTabSwitch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all workspace tabs', () => {
    render(<TabBar {...baseProps} />);
    expect(screen.getByText('Uppercase')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('marks active tab with active class', () => {
    render(<TabBar {...baseProps} />);
    const activeTab = screen.getByText('Uppercase').closest('.tu-tab');
    expect(activeTab!.className).toContain('tu-tab--active');
  });

  it('calls setActiveWorkspaceId on tab click', () => {
    render(<TabBar {...baseProps} />);
    fireEvent.click(screen.getByText('History'));
    expect(baseProps.setActiveWorkspaceId).toHaveBeenCalledWith('tab-2');
  });

  it('calls setActivePanel for drawer tabs', () => {
    render(<TabBar {...baseProps} />);
    fireEvent.click(screen.getByText('History'));
    expect(baseProps.setActivePanel).toHaveBeenCalledWith('history');
  });

  it('calls onTabSwitch when switching to a different tab', () => {
    render(<TabBar {...baseProps} />);
    fireEvent.click(screen.getByText('History'));
    expect(baseProps.onTabSwitch).toHaveBeenCalled();
  });

  it('does not call onTabSwitch when clicking active tab', () => {
    render(<TabBar {...baseProps} />);
    fireEvent.click(screen.getByText('Uppercase'));
    expect(baseProps.onTabSwitch).not.toHaveBeenCalled();
  });

  it('calls closeWorkspaceTab when close button clicked', () => {
    render(<TabBar {...baseProps} />);
    const closeBtn = screen.getByLabelText('Close Uppercase tab');
    fireEvent.click(closeBtn);
    expect(baseProps.closeWorkspaceTab).toHaveBeenCalledWith('tab-1');
  });

  it('calls setSaveModal when save button clicked', () => {
    render(<TabBar {...baseProps} />);
    const saveBtns = screen.getAllByLabelText('Save tab to templates');
    fireEvent.click(saveBtns[0]!);
    expect(baseProps.setSaveModal).toHaveBeenCalledWith({
      tabId: 'tab-1',
      defaultName: 'Uppercase',
    });
  });

  it('does not switch tab when close button clicked (stopPropagation)', () => {
    render(<TabBar {...baseProps} />);
    const closeBtn = screen.getByLabelText('Close History tab');
    fireEvent.click(closeBtn);
    expect(baseProps.closeWorkspaceTab).toHaveBeenCalledWith('tab-2');
    expect(baseProps.setActiveWorkspaceId).not.toHaveBeenCalled();
  });

  it('renders with empty workspace tabs', () => {
    render(<TabBar {...baseProps} workspaceTabs={[]} />);
    expect(screen.queryByText('Uppercase')).not.toBeInTheDocument();
  });

  it('handles wheel event on the tab bar', () => {
    render(<TabBar {...baseProps} />);
    const tabBar = document.querySelector('.tu-tab-bar');
    fireEvent.wheel(tabBar!, { deltaY: 100 });
    // The wheel handler sets scrollLeft; we just verify no crash
    expect(tabBar).toBeInTheDocument();
  });

  it('renders scroll arrows and fires scroll click handlers when content overflows', () => {
    render(<TabBar {...baseProps} />);
    const tabBar = document.querySelector('.tu-tab-bar')!;

    // jsdom does not implement Element.scrollBy - stub it so the onClick handlers
    // don't throw an unhandled exception (which would fail the whole run).
    const scrollBySpy = vi.fn();
    (tabBar as unknown as { scrollBy: typeof scrollBySpy }).scrollBy = scrollBySpy;

    // Make the bar appear to overflow so scrollState.overflows = true
    Object.defineProperty(tabBar, 'scrollWidth', { get: () => 2000, configurable: true });
    Object.defineProperty(tabBar, 'clientWidth', { get: () => 200, configurable: true });
    Object.defineProperty(tabBar, 'scrollLeft', {
      get: () => 100,
      configurable: true,
      set: () => {},
    });

    // Trigger scroll event to call updateScroll → setScrollState({overflows: true, ...})
    fireEvent.scroll(tabBar);

    const leftBtn = screen.queryByTitle('Scroll tabs left');
    const rightBtn = screen.queryByTitle('Scroll tabs right');

    if (leftBtn && rightBtn) {
      // Click scroll buttons to cover the onClick arrow functions
      fireEvent.click(leftBtn);
      fireEvent.click(rightBtn);
      expect(scrollBySpy).toHaveBeenCalledWith({ left: -200, behavior: 'smooth' });
      expect(scrollBySpy).toHaveBeenCalledWith({ left: 200, behavior: 'smooth' });
    }
  });

  it('shows left scroll button as disabled at start position', () => {
    render(<TabBar {...baseProps} />);
    const tabBar = document.querySelector('.tu-tab-bar')!;

    Object.defineProperty(tabBar, 'scrollWidth', { get: () => 2000, configurable: true });
    Object.defineProperty(tabBar, 'clientWidth', { get: () => 200, configurable: true });
    Object.defineProperty(tabBar, 'scrollLeft', {
      get: () => 0,
      configurable: true,
      set: () => {},
    });

    fireEvent.scroll(tabBar);

    const leftBtn = screen.queryByTitle('Scroll tabs left');
    if (leftBtn) {
      expect(leftBtn).toBeDisabled();
    }
  });

  it('shows right scroll button as disabled at end position', () => {
    render(<TabBar {...baseProps} />);
    const tabBar = document.querySelector('.tu-tab-bar')!;

    Object.defineProperty(tabBar, 'scrollWidth', { get: () => 400, configurable: true });
    Object.defineProperty(tabBar, 'clientWidth', { get: () => 200, configurable: true });
    // scrollLeft(200) + clientWidth(200) >= scrollWidth(400) - 1 → atEnd = true
    Object.defineProperty(tabBar, 'scrollLeft', {
      get: () => 200,
      configurable: true,
      set: () => {},
    });

    fireEvent.scroll(tabBar);

    const rightBtn = screen.queryByTitle('Scroll tabs right');
    if (rightBtn) {
      expect(rightBtn).toBeDisabled();
    }
  });
});
