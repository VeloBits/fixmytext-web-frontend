import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <div {...(filterMotionProps(props) as Record<string, unknown>)}>{children}</div>
    ),
    button: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <button {...(filterMotionProps(props) as Record<string, unknown>)}>{children}</button>
    ),
    span: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <span {...(filterMotionProps(props) as Record<string, unknown>)}>{children}</span>
    ),
    p: ({ children, ...props }: { children?: React.ReactNode; [key: string]: unknown }) => (
      <p {...(filterMotionProps(props) as Record<string, unknown>)}>{children}</p>
    ),
  },
  AnimatePresence: ({ children }: { children?: React.ReactNode }) => children,
}));

// Filter out framer-motion specific props
function filterMotionProps(props: Record<string, unknown>) {
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

const WRITER_KIT = {
  id: 'writer',
  label: 'Writer / Blogger',
  icon: 'Wr',
  groupName: 'Writing essentials',
  defaultTab: 'writing',
  toolIds: ['fix_grammar', 'paraphrase'],
};

vi.mock('@velobits/app-core/constants/tools', () => ({
  STARTER_KITS: [
    {
      id: 'writer',
      label: 'Writer / Blogger',
      icon: 'Wr',
      groupName: 'Writing essentials',
      defaultTab: 'writing',
      toolIds: ['fix_grammar', 'paraphrase'],
    },
    {
      id: 'student',
      label: 'Student',
      icon: 'St',
      groupName: 'Study essentials',
      defaultTab: 'writing',
      toolIds: ['summarize'],
    },
    {
      id: 'developer',
      label: 'Developer',
      icon: '</>',
      groupName: 'Developer toolkit',
      defaultTab: 'code',
      toolIds: ['json_fmt'],
    },
    {
      id: 'social',
      label: 'Social Media',
      icon: '@s',
      groupName: 'Social media kit',
      defaultTab: 'ai',
      toolIds: ['hashtags'],
    },
    {
      id: 'explorer',
      label: 'Just Exploring',
      icon: '?>',
      groupName: '',
      defaultTab: 'all',
      toolIds: [],
    },
  ],
}));

import OnboardingModal from './OnboardingModal';

describe('OnboardingModal', () => {
  it('renders welcome title', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    // TypingText renders each character as a separate span — check body text
    expect(document.body.textContent).toContain('Welcome');
  });

  it('renders starter-kit cards', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    expect(screen.getByText('Writer / Blogger')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
    expect(screen.getByText('Social Media')).toBeInTheDocument();
    expect(screen.getByText('Just Exploring')).toBeInTheDocument();
  });

  it('calls onComplete with the full kit when a card is clicked', () => {
    const onComplete = vi.fn();
    render(<OnboardingModal onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Writer / Blogger'));
    expect(onComplete).toHaveBeenCalledWith(expect.objectContaining(WRITER_KIT));
  });

  it('calls onComplete with null on X (dismiss creates nothing)', () => {
    const onComplete = vi.fn();
    render(<OnboardingModal onComplete={onComplete} />);
    fireEvent.click(screen.getByLabelText('Skip — explore all tools'));
    expect(onComplete).toHaveBeenCalledWith(null);
  });

  it('calls onComplete with null on Escape', () => {
    const onComplete = vi.fn();
    render(<OnboardingModal onComplete={onComplete} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onComplete).toHaveBeenCalledWith(null);
  });

  it('explorer card completes with an empty kit (no group created)', () => {
    const onComplete = vi.fn();
    render(<OnboardingModal onComplete={onComplete} />);
    fireEvent.click(screen.getByText('Just Exploring'));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'explorer', toolIds: [], groupName: '' })
    );
  });

  it('renders footer text', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    expect(
      screen.getByText('Your kit becomes an editable group — rename or change it anytime')
    ).toBeInTheDocument();
  });

  it('renders subtitle text', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    expect(screen.getByText(/Pick a starter kit/)).toBeInTheDocument();
  });

  it('renders logo icon', () => {
    render(<OnboardingModal onComplete={vi.fn()} />);
    // Logo renders a single letter — may appear in multiple places, check at least one
    expect(document.body.textContent).toMatch(/F/);
  });
});
