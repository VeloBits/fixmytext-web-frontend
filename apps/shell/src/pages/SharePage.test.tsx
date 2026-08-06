import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SharePage from './SharePage';

vi.mock('react-router-dom', () => ({
  Link: ({
    children,
    to,
    ...props
  }: {
    children?: React.ReactNode;
    to: string;
    [key: string]: unknown;
  }) => React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => vi.fn(),
  useParams: () => ({ id: 'share123' }),
  useSearchParams: () => [new URLSearchParams(), vi.fn()],
}));

const mockShareData = {
  tool_id: 'uppercase',
  tool_label: 'Uppercase',
  output_text: 'HELLO WORLD\nLINE TWO',
  created_at: '2025-01-15T10:00:00Z',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let mockQueryResult: { data: typeof mockShareData | null; isLoading: boolean; error: any } = {
  data: mockShareData,
  isLoading: false,
  error: null,
};

vi.mock('@velobits/app-core/store/api/shareApi', () => ({
  useGetShareQuery: () => mockQueryResult,
}));

vi.mock('@velobits/app-core/constants/tools', () => ({
  TOOLS: [{ id: 'uppercase', label: 'Uppercase', icon: 'AA', color: 'pink' }],
}));

vi.mock('@velobits/app-core/components/editor/ToolIcon', () => ({
  default: ({ icon, toolId }: { icon?: string; toolId?: string }) => (
    <span data-testid="tool-icon">{toolId || icon}</span>
  ),
}));

describe('SharePage', () => {
  const showAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockQueryResult = { data: mockShareData, isLoading: false, error: null as null };
  });

  it('renders share page with data', () => {
    render(<SharePage showAlert={showAlert} />);
    expect(screen.getByText('Shared Result')).toBeInTheDocument();
    expect(screen.getByText('Uppercase')).toBeInTheDocument();
    // Output text is rendered - check body text content
    expect(document.body.textContent).toContain('HELLO WORLD');
  });

  it('shows stats (lines, words, chars)', () => {
    render(<SharePage showAlert={showAlert} />);
    // Stats text may be split across elements - check body text
    expect(document.body.textContent).toMatch(/lines/);
    expect(document.body.textContent).toMatch(/words/);
    expect(document.body.textContent).toMatch(/chars/);
  });

  it('renders line numbers for multi-line output', () => {
    const { container } = render(<SharePage showAlert={showAlert} />);
    const gutter = container.querySelector('.sh-card-gutter');
    expect(gutter).toBeInTheDocument();
    expect(gutter!.children.length).toBe(2); // 2 lines
  });

  it('shows loading state', () => {
    mockQueryResult = { data: null, isLoading: true, error: null };
    render(<SharePage showAlert={showAlert} />);
    expect(screen.getByText('Loading shared result...')).toBeInTheDocument();
  });

  it('shows error state for not found', () => {
    mockQueryResult = { data: null, isLoading: false, error: { status: 404 } };
    render(<SharePage showAlert={showAlert} />);
    expect(screen.getByText('Share not found')).toBeInTheDocument();
  });

  it('shows expired state', () => {
    mockQueryResult = { data: null, isLoading: false, error: { status: 410 } };
    render(<SharePage showAlert={showAlert} />);
    expect(screen.getByText('This share has expired')).toBeInTheDocument();
    expect(screen.getByText(/expire after 30 days/)).toBeInTheDocument();
  });

  it('copies to clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { clipboard: { writeText } });
    render(<SharePage showAlert={showAlert} />);
    const copyBtns = screen.getAllByText('Copy to Clipboard');
    fireEvent.click(copyBtns[0]!);
    expect(writeText).toHaveBeenCalledWith('HELLO WORLD\nLINE TWO');
    expect(showAlert).toHaveBeenCalledWith('Copied to clipboard!', 'success');
  });

  it('shows CTA links', () => {
    render(<SharePage showAlert={showAlert} />);
    expect(screen.getByText('Try FixMyText')).toBeInTheDocument();
    expect(screen.getByText(/Get started free/)).toBeInTheDocument();
  });

  it('shows status bar with stats', () => {
    render(<SharePage showAlert={showAlert} />);
    expect(screen.getByText('UTF-8')).toBeInTheDocument();
  });
});
