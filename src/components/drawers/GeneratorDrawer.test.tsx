import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { RandomTextDrawer, PasswordDrawer } from './GeneratorDrawer';

describe('RandomTextDrawer', () => {
  const props = {
    textGenType: 'words' as const,
    setTextGenType: vi.fn(),
    textGenCount: 10,
    setTextGenCount: vi.fn(),
    handleGenerateText: vi.fn(() => 'generated text'),
    onResult: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders type and count labels', () => {
    render(<RandomTextDrawer {...props} />);
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Count')).toBeInTheDocument();
  });

  it('renders type options', () => {
    render(<RandomTextDrawer {...props} />);
    expect(screen.getByText('Words')).toBeInTheDocument();
    expect(screen.getByText('Sentences')).toBeInTheDocument();
    expect(screen.getByText('Paragraphs')).toBeInTheDocument();
  });

  it('renders count presets', () => {
    render(<RandomTextDrawer {...props} />);
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('50')).toBeInTheDocument();
    expect(screen.getByText('100')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('calls setTextGenType when type button clicked', () => {
    render(<RandomTextDrawer {...props} />);
    fireEvent.click(screen.getByText('Sentences'));
    expect(props.setTextGenType).toHaveBeenCalledWith('sentences');
  });

  it('calls setTextGenCount when preset clicked', () => {
    render(<RandomTextDrawer {...props} />);
    fireEvent.click(screen.getByText('50'));
    expect(props.setTextGenCount).toHaveBeenCalledWith(50);
  });

  it('calls handleGenerateText and onResult on generate', () => {
    render(<RandomTextDrawer {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(props.handleGenerateText).toHaveBeenCalled();
    expect(props.onResult).toHaveBeenCalledWith('generated text');
  });

  it('does not call onResult if handleGenerateText returns null', () => {
    render(<RandomTextDrawer {...props} handleGenerateText={vi.fn(() => null)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(props.onResult).not.toHaveBeenCalled();
  });

  it('calls setTextGenCount when count input changed', () => {
    render(<RandomTextDrawer {...props} />);
    const numInput = screen.getByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '200' } });
    expect(props.setTextGenCount).toHaveBeenCalledWith(200);
  });

  it('clamps count input to max 10000', () => {
    render(<RandomTextDrawer {...props} />);
    const numInput = screen.getByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '99999' } });
    expect(props.setTextGenCount).toHaveBeenCalledWith(10000);
  });

  it('clamps count input to min 1', () => {
    render(<RandomTextDrawer {...props} />);
    const numInput = screen.getByRole('spinbutton');
    fireEvent.change(numInput, { target: { value: '0' } });
    expect(props.setTextGenCount).toHaveBeenCalledWith(1);
  });
});

describe('PasswordDrawer', () => {
  const props = {
    pwdLen: 16,
    setPwdLen: vi.fn(),
    pwdOpts: { upper: true, lower: true, numbers: true, symbols: false },
    setPwdOpts: vi.fn(),
    handleGeneratePassword: vi.fn(() => 'Abc123!@'),
    onResult: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders length and include labels', () => {
    render(<PasswordDrawer {...props} />);
    expect(screen.getByText('Length')).toBeInTheDocument();
    expect(screen.getByText('Include')).toBeInTheDocument();
  });

  it('renders strength indicator', () => {
    render(<PasswordDrawer {...props} />);
    // Strength label is rendered (e.g. "Fair", "Strong", "Weak")
    expect(screen.getByText(/bits/)).toBeInTheDocument();
  });

  it('renders character set buttons', () => {
    render(<PasswordDrawer {...props} />);
    expect(screen.getByText('A\u2013Z')).toBeInTheDocument();
    expect(screen.getByText('a\u2013z')).toBeInTheDocument();
    expect(screen.getByText('0\u20139')).toBeInTheDocument();
    expect(screen.getByText('!@#')).toBeInTheDocument();
  });

  it('renders preset length buttons', () => {
    render(<PasswordDrawer {...props} />);
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('32')).toBeInTheDocument();
    expect(screen.getByText('64')).toBeInTheDocument();
  });

  it('calls handleGeneratePassword and onResult on generate', () => {
    render(<PasswordDrawer {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(props.handleGeneratePassword).toHaveBeenCalled();
    expect(props.onResult).toHaveBeenCalledWith('Abc123!@');
  });

  it('shows entropy and pool info', () => {
    render(<PasswordDrawer {...props} />);
    expect(screen.getByText(/bits/)).toBeInTheDocument();
    expect(screen.getByText(/char pool/)).toBeInTheDocument();
  });

  it('handles all options disabled', () => {
    render(
      <PasswordDrawer
        {...props}
        pwdOpts={{ upper: false, lower: false, numbers: false, symbols: false }}
      />
    );
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('calls setPwdLen when slider changed', () => {
    render(<PasswordDrawer {...props} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '32' } });
    expect(props.setPwdLen).toHaveBeenCalledWith(32);
  });

  it('calls setPwdLen when number input changed', () => {
    render(<PasswordDrawer {...props} />);
    // The number input is second input element
    const numInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(numInput, { target: { value: '24' } });
    expect(props.setPwdLen).toHaveBeenCalledWith(24);
  });

  it('clamps number input to max 128', () => {
    render(<PasswordDrawer {...props} />);
    const numInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(numInput, { target: { value: '999' } });
    expect(props.setPwdLen).toHaveBeenCalledWith(128);
  });

  it('clamps number input to min 4', () => {
    render(<PasswordDrawer {...props} />);
    const numInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(numInput, { target: { value: '1' } });
    expect(props.setPwdLen).toHaveBeenCalledWith(4);
  });

  it('calls setPwdLen when preset length button clicked', () => {
    render(<PasswordDrawer {...props} />);
    fireEvent.click(screen.getByText('32'));
    expect(props.setPwdLen).toHaveBeenCalledWith(32);
  });

  it('toggles charset option when charset button clicked', () => {
    render(<PasswordDrawer {...props} />);
    // Click the symbols button to toggle it
    fireEvent.click(screen.getByText('!@#'));
    expect(props.setPwdOpts).toHaveBeenCalled();
  });

  it('does not call onResult if handleGeneratePassword returns null', () => {
    render(<PasswordDrawer {...props} handleGeneratePassword={vi.fn(() => null)} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(props.onResult).not.toHaveBeenCalled();
  });
});
