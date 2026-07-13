import React from 'react';
import { render } from '@testing-library/react';
import Home from './Home';
import type {
  FavoritesContextValue,
  GamificationContextValue,
  PersonaContextValue,
  SubscriptionContextValue,
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
  persona: { persona: null, setPersona: vi.fn(), onboarded: false } as PersonaContextValue,
  favorites: { favorites: [], toggleFavorite: vi.fn() } as FavoritesContextValue,
  gamification: {} as unknown as GamificationContextValue,
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
    expect(content).toContain('persona');
    expect(content).toContain('favorites');
    expect(content).toContain('gamification');
  });

  it('threads a null gamification through to TextForm (kill switch)', () => {
    const { getByTestId } = render(<Home {...baseProps} gamification={null} />);
    const content = getByTestId('text-form').textContent;
    // key still present (explicit null), alongside the new required contexts
    expect(content).toContain('gamification');
    expect(content).toContain('persona');
    expect(content).toContain('favorites');
  });

  it('normalizes an omitted gamification prop to null', () => {
    const withoutGam: Omit<typeof baseProps, 'gamification'> & {
      gamification?: GamificationContextValue | null;
    } = { ...baseProps };
    delete withoutGam.gamification;
    const { getByTestId } = render(<Home {...withoutGam} />);
    expect(getByTestId('text-form').textContent).toContain('gamification');
  });
});
