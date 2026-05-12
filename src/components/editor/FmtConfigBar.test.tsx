import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FmtConfigBar from './FmtConfigBar';

describe('FmtConfigBar', () => {
  const defaultCfg = {
    tabWidth: 2,
    useTabs: false,
    semi: true,
    singleQuote: false,
    trailingComma: 'es5',
    bracketSpacing: true,
    arrowParens: 'always',
    jsxSingleQuote: false,
    sortImports: true,
    bracketSameLine: false,
    htmlWhitespaceSensitivity: 'css',
  };

  it('returns null for unknown toolId', () => {
    const { container } = render(
      <FmtConfigBar toolId="unknown" fmtCfg={defaultCfg} setFmtCfg={vi.fn()} />
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders JS config bar', () => {
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={vi.fn()} />);
    expect(screen.getByText('JavaScript')).toBeInTheDocument();
    expect(screen.getByText('Semicolons')).toBeInTheDocument();
    expect(screen.getByText('Single Quotes')).toBeInTheDocument();
    expect(screen.getByText('Bracket Spacing')).toBeInTheDocument();
    expect(screen.getByText('Sort Imports')).toBeInTheDocument();
  });

  it('renders TS config bar', () => {
    render(<FmtConfigBar toolId="ts_fmt" fmtCfg={defaultCfg} setFmtCfg={vi.fn()} />);
    expect(screen.getByText('TypeScript')).toBeInTheDocument();
  });

  it('renders CSS config bar with limited options', () => {
    render(<FmtConfigBar toolId="css_fmt" fmtCfg={defaultCfg} setFmtCfg={vi.fn()} />);
    expect(screen.getByText('CSS')).toBeInTheDocument();
    expect(screen.getByText('Single Quotes')).toBeInTheDocument();
    expect(screen.queryByText('Semicolons')).not.toBeInTheDocument();
  });

  it('renders HTML config bar with whitespace option', () => {
    render(
      <FmtConfigBar
        toolId="html_fmt"
        fmtCfg={{ ...defaultCfg, htmlWhitespaceSensitivity: 'css' }}
        setFmtCfg={vi.fn()}
      />
    );
    expect(screen.getByText('HTML')).toBeInTheDocument();
    expect(screen.getByText('Bracket Same Line')).toBeInTheDocument();
    expect(screen.getByText('Whitespace')).toBeInTheDocument();
  });

  it('toggles semicolons option', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.click(screen.getByText('Semicolons'));
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('changes indent setting', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: '4' } });
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('changes to tabs', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'tabs' } });
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('shows presets for JS', () => {
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={vi.fn()} />);
    expect(screen.getByText('Default')).toBeInTheDocument();
    expect(screen.getByText('Airbnb')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });

  it('applies preset when clicked', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.click(screen.getByText('Airbnb'));
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('changes trailing comma select', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    // Find the trailing comma select
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const trailingSelect = selects.find((s) => s.value === 'es5');
    fireEvent.change(trailingSelect!, { target: { value: 'all' } });
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('changes arrow parens select', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const arrowSelect = selects.find((s) => s.value === 'always');
    fireEvent.change(arrowSelect!, { target: { value: 'avoid' } });
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('toggles single quotes option', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.click(screen.getByText('Single Quotes'));
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('toggles bracket spacing option', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.click(screen.getByText('Bracket Spacing'));
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('toggles JSX quotes option', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.click(screen.getByText('JSX Quotes'));
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('toggles sort imports option', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.click(screen.getByText('Sort Imports'));
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('toggles bracket same line for HTML', () => {
    const setFmtCfg = vi.fn();
    render(
      <FmtConfigBar
        toolId="html_fmt"
        fmtCfg={{ ...defaultCfg, htmlWhitespaceSensitivity: 'css', bracketSameLine: false }}
        setFmtCfg={setFmtCfg}
      />
    );
    fireEvent.click(screen.getByText('Bracket Same Line'));
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('changes HTML whitespace sensitivity select', () => {
    const setFmtCfg = vi.fn();
    render(
      <FmtConfigBar
        toolId="html_fmt"
        fmtCfg={{ ...defaultCfg, htmlWhitespaceSensitivity: 'css' }}
        setFmtCfg={setFmtCfg}
      />
    );
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const whitespaceSelect = selects.find((s) => s.value === 'css');
    fireEvent.change(whitespaceSelect!, { target: { value: 'strict' } });
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('applies Default preset', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.click(screen.getByText('Default'));
    expect(setFmtCfg).toHaveBeenCalled();
  });

  it('applies Standard preset', () => {
    const setFmtCfg = vi.fn();
    render(<FmtConfigBar toolId="js_fmt" fmtCfg={defaultCfg} setFmtCfg={setFmtCfg} />);
    fireEvent.click(screen.getByText('Standard'));
    expect(setFmtCfg).toHaveBeenCalled();
  });
});
