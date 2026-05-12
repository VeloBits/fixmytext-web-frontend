import React from 'react';
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => {
      const filtered = { ...props };
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
      ].forEach((k) => delete filtered[k]);
      return <div {...(filtered as React.HTMLAttributes<HTMLDivElement>)}>{children}</div>;
    },
    span: ({ children, ...props }: { children?: ReactNode; [k: string]: unknown }) => {
      const filtered = { ...props };
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
      ].forEach((k) => delete filtered[k]);
      return <span {...(filtered as React.HTMLAttributes<HTMLSpanElement>)}>{children}</span>;
    },
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => children,
}));

import About from './About';

function renderAbout() {
  return render(
    <MemoryRouter>
      <About />
    </MemoryRouter>
  );
}

describe('About', () => {
  it('renders hero section with brand name', () => {
    renderAbout();
    // Brand name "FixMyText" may appear in multiple places
    expect(screen.getAllByText(/FixMyText/i).length).toBeGreaterThan(0);
  });

  it('renders back to editor link', () => {
    renderAbout();
    expect(screen.getAllByText('Back to Editor').length).toBeGreaterThanOrEqual(1);
  });

  it('renders navigation links', () => {
    renderAbout();
    // 'Features' and 'How it works' appear in both nav links and section headings
    expect(screen.getAllByText('Features').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('How it works').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Principles')).toBeInTheDocument();
  });

  it('renders stats section', () => {
    renderAbout();
    expect(screen.getByText('Tools Available')).toBeInTheDocument();
    expect(screen.getByText('Categories')).toBeInTheDocument();
    expect(screen.getByText('14+')).toBeInTheDocument();
    expect(screen.getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('Free Forever')).toBeInTheDocument();
  });

  it('renders features section', () => {
    renderAbout();
    expect(screen.getByText('Text Transformation')).toBeInTheDocument();
    expect(screen.getByText('AI-Powered Tools')).toBeInTheDocument();
    expect(screen.getByText('Developer Toolkit')).toBeInTheDocument();
    expect(screen.getByText('Export Anywhere')).toBeInTheDocument();
  });

  it('renders how it works section', () => {
    renderAbout();
    expect(screen.getByText('Paste or type')).toBeInTheDocument();
    expect(screen.getByText('Pick a tool')).toBeInTheDocument();
    expect(screen.getByText('Get results')).toBeInTheDocument();
  });

  it('renders principles section', () => {
    renderAbout();
    expect(screen.getByText('Privacy First')).toBeInTheDocument();
    expect(screen.getByText('No Sign-Up Required')).toBeInTheDocument();
    expect(screen.getByText('Always Free')).toBeInTheDocument();
  });

  it('renders audiences section', () => {
    renderAbout();
    expect(screen.getByText('Writers')).toBeInTheDocument();
    expect(screen.getByText('Students')).toBeInTheDocument();
    expect(screen.getByText('Developers')).toBeInTheDocument();
    expect(screen.getByText('Creators')).toBeInTheDocument();
  });

  it('renders technology section', () => {
    renderAbout();
    expect(screen.getByText('React')).toBeInTheDocument();
    expect(screen.getByText('Vite')).toBeInTheDocument();
    expect(screen.getByText('Redux Toolkit')).toBeInTheDocument();
  });

  it('renders CTA section', () => {
    renderAbout();
    expect(screen.getByText('Ready to start?')).toBeInTheDocument();
    expect(screen.getByText(/No install/)).toBeInTheDocument();
  });

  it('renders Open Editor links', () => {
    renderAbout();
    const editorLinks = screen.getAllByText('Open Editor');
    expect(editorLinks.length).toBeGreaterThanOrEqual(1);
  });

  it('renders footer with brand name', () => {
    renderAbout();
    // FixMyText appears in multiple places (hero + footer)
    expect(screen.getAllByText(/FixMyText/i).length).toBeGreaterThanOrEqual(1);
  });

  it('sets body overflow on mount and cleans up', () => {
    const { unmount } = renderAbout();
    expect(document.body.style.overflow).toBe('auto');
    unmount();
    expect(document.body.style.overflow).toBe('');
  });
});
