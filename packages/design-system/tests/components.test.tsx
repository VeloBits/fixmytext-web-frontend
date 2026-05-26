import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { Input } from '../src/components/Input';
import { ToolCard } from '../src/components/ToolCard';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('applies primary variant classes by default', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('bg-[var(--accent)]');
  });

  it('applies secondary variant classes', () => {
    render(<Button variant="secondary">Secondary</Button>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('border-[var(--accent)]');
  });

  it('is disabled when disabled prop set', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies hoverable cursor class when prop set', () => {
    const { container } = render(<Card hoverable>Hoverable</Card>);
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('cursor-pointer');
  });
});

describe('Input', () => {
  it('renders with label', () => {
    render(<Input label="Email" id="email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('renders error message', () => {
    render(<Input error="Required" />);
    expect(screen.getByText('Required')).toBeInTheDocument();
  });
});

describe('ToolCard', () => {
  it('renders icon and label', () => {
    render(<ToolCard icon="MD5" label="MD5 Hash" />);
    expect(screen.getByText('MD5')).toBeInTheDocument();
    expect(screen.getByText('MD5 Hash')).toBeInTheDocument();
  });

  it('sets title from description', () => {
    render(<ToolCard icon="X" label="Tool" description="Does stuff" />);
    expect(screen.getByTitle('Does stuff')).toBeInTheDocument();
  });
});
