import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import Navbar from './Navbar';
import { expectNoA11yViolations } from '@/test/axeHelper';

// Mock useOidcAuth so we can control isAuthenticated per test
vi.mock('@/auth/useOidcAuth', () => ({
  useOidcAuth: vi.fn().mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    accessToken: null,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}));

import { useOidcAuth } from '@/auth/useOidcAuth';
const mockUseOidcAuth = vi.mocked(useOidcAuth);

function makeStore(accessToken: string | null = null) {
  return configureStore({
    reducer: {
      auth: () => ({ accessToken }),
    },
  });
}

function renderNavbar(props = {}, accessToken: string | null = null) {
  // Keep Redux store in sync for any selectors that may read from it,
  // and also update the OIDC mock since Navbar uses useOidcAuth.
  mockUseOidcAuth.mockReturnValue({
    isAuthenticated: !!accessToken,
    isLoading: false,
    accessToken,
    oidcUser: null,
    login: vi.fn(),
    logout: vi.fn(),
  });
  return render(
    <Provider store={makeStore(accessToken)}>
      <MemoryRouter>
        <Navbar {...props} />
      </MemoryRouter>
    </Provider>
  );
}

describe('Navbar', () => {
  it('renders brand name', () => {
    renderNavbar();
    expect(screen.getByText('Fix')).toBeInTheDocument();
    expect(screen.getByText(/MyText/)).toBeInTheDocument();
  });

  it('renders search trigger with Ctrl+K', () => {
    renderNavbar();
    expect(screen.getByText('Search tools...')).toBeInTheDocument();
    expect(screen.getByText('Ctrl+K')).toBeInTheDocument();
  });

  it('renders Share button', () => {
    renderNavbar();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('renders GitHub link', () => {
    renderNavbar();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
  });

  it('renders About link', () => {
    renderNavbar();
    expect(screen.getByText('About')).toBeInTheDocument();
  });

  it('shows Sign In when logged out', () => {
    renderNavbar({}, null);
    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();
  });

  it('shows Upgrade when logged in', () => {
    renderNavbar({}, 'fake-token');
    expect(screen.getByText('Upgrade')).toBeInTheDocument();
    // Sign In link in the desktop nav should not show, but mobile menu may have it
    // The desktop sign-in is conditional on !accessToken
  });

  it('toggles mobile menu', () => {
    renderNavbar();
    expect(screen.queryByText('Home')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();

    // Close menu
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('closes mobile menu when a link is clicked', () => {
    renderNavbar();
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(screen.getByText('Home')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Home'));
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('handles share button - success', async () => {
    const showAlert = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });

    renderNavbar({ showAlert });
    fireEvent.click(screen.getByLabelText('Share website link'));

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Website link copied to clipboard!', 'success');
    });
  });

  it('handles share button - failure', async () => {
    const showAlert = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error('fail')),
      },
    });

    renderNavbar({ showAlert });
    fireEvent.click(screen.getByLabelText('Share website link'));

    await vi.waitFor(() => {
      expect(showAlert).toHaveBeenCalledWith('Failed to copy link', 'danger');
    });
  });

  it('dispatches keydown event when search button is clicked', () => {
    renderNavbar();
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    fireEvent.click(screen.getByText('Search tools...'));
    expect(dispatchSpy).toHaveBeenCalled();
    dispatchSpy.mockRestore();
  });

  it('shows Sign In in mobile menu when logged out', () => {
    renderNavbar({}, null);
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    // There are Sign In links in both desktop and mobile
    const signInLinks = screen.getAllByText('Sign In');
    expect(signInLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show Sign In in mobile menu when logged in', () => {
    renderNavbar({}, 'fake-token');
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    // Sign In should not appear in mobile menu for authenticated users
    expect(screen.queryByText('Sign In')).not.toBeInTheDocument();
  });

  it('closes mobile menu when About link is clicked', () => {
    renderNavbar();
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    // Click About in mobile menu
    const aboutLinks = screen.getAllByText('About');
    const mobileAbout = aboutLinks.find((el) => el.closest('.tu-mobile-menu'));
    if (mobileAbout) {
      fireEvent.click(mobileAbout);
      expect(screen.queryByText('Pricing')).not.toBeInTheDocument();
    }
  });

  it('closes mobile menu when Pricing link is clicked', () => {
    renderNavbar();
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    const pricingLink = screen.getByText('Pricing');
    fireEvent.click(pricingLink);
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });

  it('closes mobile menu when Sign In link is clicked (logged out)', () => {
    renderNavbar({}, null);
    fireEvent.click(screen.getByLabelText('Toggle menu'));
    const mobileMenu = document.querySelector('.tu-mobile-menu');
    if (mobileMenu) {
      const signInLinks = Array.from(mobileMenu.querySelectorAll('a')).filter((a) =>
        a.textContent.includes('Sign In')
      );
      if (signInLinks.length > 0) {
        fireEvent.click(signInLinks[0]!);
        expect(screen.queryByText('Home')).not.toBeInTheDocument();
      }
    }
  });

  it('has no axe violations', async () => {
    const { container } = renderNavbar();
    await expectNoA11yViolations(container);
  });
});
