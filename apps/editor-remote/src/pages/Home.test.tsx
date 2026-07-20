import React from 'react';
import { render } from '@testing-library/react';
import Home from './Home';
import type {
  FavoritesContextValue,
  SubscriptionContextValue,
  ToolGroupsContextValue,
} from '@velobits/app-core/types/context';

// Mock TextForm since it's a complex component
vi.mock('@/components/editor/TextForm', () => ({
  default: (props: Record<string, unknown>) => (
    <div data-testid="text-form">{JSON.stringify(Object.keys(props))}</div>
  ),
}));

const baseProps = {
  mode: 'dark',
  setMode: vi.fn(),
  showAlert: vi.fn(),
  toolGroups: {
    groups: [],
    ready: true,
    createGroup: vi.fn(),
    renameGroup: vi.fn(),
    deleteGroup: vi.fn(),
    addToolToGroup: vi.fn(),
    removeToolFromGroup: vi.fn(),
  } as ToolGroupsContextValue,
  favorites: { favorites: [], toggleFavorite: vi.fn() } as FavoritesContextValue,
  user: null,
  isAuthenticated: false,
  subscription: {} as unknown as SubscriptionContextValue,
};

describe('Home', () => {
  it('renders TextForm with correct props', () => {
    const { getByTestId } = render(<Home {...baseProps} />);
    expect(getByTestId('text-form')).toBeInTheDocument();
    const content = getByTestId('text-form').textContent;
    expect(content).toContain('mode');
    expect(content).toContain('setMode');
    expect(content).toContain('showAlert');
    expect(content).toContain('toolGroups');
    expect(content).toContain('favorites');
    expect(content).toContain('subscription');
  });
});
