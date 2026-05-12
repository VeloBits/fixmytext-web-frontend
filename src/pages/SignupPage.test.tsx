import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SignupPage from './SignupPage';
import { expectNoA11yViolations } from '../test/axeHelper';

const mockNavigate = vi.fn();
const mockRegister = vi.fn();
let mockAccessToken: string | null = null;

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }: { children?: React.ReactNode; to: string; [key: string]: unknown }) => React.createElement('a', { href: to, ...props }, children),
  useNavigate: () => mockNavigate,
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock('react-redux', () => ({
  useSelector: vi.fn((fn) => fn({ auth: { accessToken: mockAccessToken } })),
  useDispatch: () => vi.fn(),
}));

vi.mock('../store/api/authApi', () => ({
  useRegisterMutation: () => [mockRegister, { isLoading: false }],
}));

vi.mock('../constants', () => ({
  ROUTES: { HOME: '/', SIGNUP: '/signup', LOGIN: '/login' },
}));

describe('SignupPage', () => {
  const showAlert = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessToken = null;
  });

  it('renders signup form', () => {
    render(<SignupPage showAlert={showAlert} />);
    // 'Create Account' appears in both h2 and button
    expect(screen.getAllByText('Create Account').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });

  it('renders sign in link', () => {
    render(<SignupPage showAlert={showAlert} />);
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Sign in').closest('a')).toHaveAttribute('href', '/login');
  });

  it('redirects when already authenticated', () => {
    mockAccessToken = 'token123';
    render(<SignupPage showAlert={showAlert} />);
    expect(screen.getByTestId('navigate')).toHaveAttribute('data-to', '/');
  });

  it('validates short password', async () => {
    render(<SignupPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: '123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), { target: { value: '123' } });
    fireEvent.submit(screen.getByText('Create Account', { selector: 'button' }).closest('form')!);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Password must be at least 8 characters', 'danger');
    });
  });

  it('validates password mismatch', async () => {
    render(<SignupPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'different123' },
    });
    fireEvent.submit(screen.getByText('Create Account', { selector: 'button' }).closest('form')!);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Passwords do not match', 'danger');
    });
  });

  it('submits form successfully', async () => {
    mockRegister.mockReturnValue({ unwrap: () => Promise.resolve({}) });
    render(<SignupPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByText('Create Account', { selector: 'button' }).closest('form')!);
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith({
        email: 'john@test.com',
        password: 'password123',
        display_name: 'John',
      });
      expect(showAlert).toHaveBeenCalledWith('Account created successfully', 'success');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('shows error on registration failure', async () => {
    mockRegister.mockReturnValue({
      unwrap: () => Promise.reject({ data: { detail: 'Email taken' } }),
    });
    render(<SignupPage showAlert={showAlert} />);
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@test.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'password123' },
    });
    fireEvent.submit(screen.getByText('Create Account', { selector: 'button' }).closest('form')!);
    await waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Email taken', 'danger');
    });
  });

  it('toggles password visibility', () => {
    render(<SignupPage showAlert={showAlert} />);
    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');
    const toggleBtns = screen.getAllByLabelText('Show password');
    fireEvent.click(toggleBtns[0]!);
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('toggles confirm password visibility', () => {
    render(<SignupPage showAlert={showAlert} />);
    const confirmInput = screen.getByLabelText('Confirm Password');
    expect(confirmInput).toHaveAttribute('type', 'password');
    const toggleBtns = screen.getAllByLabelText('Show password');
    fireEvent.click(toggleBtns[1]!);
    expect(confirmInput).toHaveAttribute('type', 'text');
  });

  it('has no axe violations', async () => {
    const { container } = render(<SignupPage showAlert={showAlert} />);
    await expectNoA11yViolations(container);
  });
});
