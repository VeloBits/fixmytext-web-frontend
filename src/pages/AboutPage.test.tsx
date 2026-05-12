import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutPage from './AboutPage';

vi.mock('framer-motion', () => {
  const m =
    (tag) =>
    ({ children, ...props }) =>
      React.createElement(tag || 'div', props, children);
  return {
    motion: new Proxy({}, { get: (_, tag) => m(tag) }),
    AnimatePresence: ({ children }) => children,
    useReducedMotion: () => false,
    useInView: () => true,
  };
});

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => vi.fn(),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
  useParams: () => ({}),
}));

describe('AboutPage', () => {
  it('renders the About component', () => {
    render(<AboutPage />);
    // The About component should render text about features
    expect(screen.getByText(/Text Transformation/i)).toBeInTheDocument();
  });

  it('renders feature cards', () => {
    render(<AboutPage />);
    expect(screen.getByText(/AI-Powered Tools/i)).toBeInTheDocument();
    expect(screen.getByText(/Developer Toolkit/i)).toBeInTheDocument();
  });
});
