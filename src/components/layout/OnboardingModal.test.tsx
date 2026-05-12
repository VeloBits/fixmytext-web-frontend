import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...filterMotionProps(props)}>{children}</div>,
    button: ({ children, ...props }) => <button {...filterMotionProps(props)}>{children}</button>,
    span: ({ children, ...props }) => <span {...filterMotionProps(props)}>{children}</span>,
    p: ({ children, ...props }) => <p {...filterMotionProps(props)}>{children}</p>,
  },
  AnimatePresence: ({ children }) => children,
}));

// Filter out framer-motion specific props
function filterMotionProps(props) {
  const filtered = { ...props };
  const motionKeys = [
    'initial',
    'animate',
    'exit',
    'transition',
    'whileTap',
    'whileHover',
    'whileInView',
    'viewport',
    'variants',
  ];
  motionKeys.forEach((k) => delete filtered[k]);
  return filtered;
}

vi.mock('../../constants/tools', () => ({
  PERSONAS: {
    writer: { label: 'Writer / Blogger', icon: 'Wr', defaultTab: 'writing' },
    student: { label: 'Student', icon: 'St', defaultTab: 'writing' },
    developer: { label: 'Developer', icon: '</>', defaultTab: 'code' },
    social: { label: 'Social Media', icon: '@s', defaultTab: 'ai' },
    explorer: { label: 'Just Exploring', icon: '?>', defaultTab: 'all' },
  },
}));

import OnboardingModal from './OnboardingModal';

describe('OnboardingModal', () => {
  it('renders welcome title', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    // TypingText renders each character as a separate span — check body text
    expect(document.body.textContent).toContain('Welcome');
  });

  it('renders persona cards', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    expect(screen.getByText('Writer / Blogger')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Just Exploring')).toBeInTheDocument();
  });

  it('calls onComplete with persona id when clicked', () => {
    const onComplete = vi.fn();
    render(<OnboardingModal onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Writer / Blogger'));
    expect(onComplete).toHaveBeenCalledWith('writer');
  });

  it('renders footer text', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    expect(screen.getByText('You can change this anytime in settings')).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    expect(screen.getByText(/Pick your path/)).toBeInTheDocument();
  });

  it('renders logo icon', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    // Logo renders a single letter — may appear in multiple places, check at least one
    expect(document.body.textContent).toMatch(/F/);
  });
});
