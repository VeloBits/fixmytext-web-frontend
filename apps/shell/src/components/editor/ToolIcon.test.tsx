import React from 'react';
import { render } from '@testing-library/react';
import ToolIcon from './ToolIcon';

describe('ToolIcon', () => {
  it('renders SVG icon for known tool id', () => {
    const { container } = render(<ToolIcon toolId="uppercase" color="pink" />);
    const span = container.querySelector('.tu-titem-icon');
    expect(span).toBeInTheDocument();
    expect(span!.classList.contains('tu-titem-icon--pink')).toBe(true);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders fallback text icon for unknown tool', () => {
    const { container } = render(<ToolIcon icon="AB" color="blue" toolId="unknown_tool_xyz" />);
    const span = container.querySelector('.tu-titem-icon');
    expect(span).toBeInTheDocument();
    expect(span!.textContent).toBe('AB');
  });

  it('renders fallback without toolId', () => {
    const { container } = render(<ToolIcon icon="Hi" />);
    expect(container.querySelector('.tu-titem-icon')!.textContent).toBe('Hi');
  });

  it('applies 3ch size class for 3-char icons', () => {
    const { container } = render(<ToolIcon icon="Abc" />);
    expect(container.querySelector('.tu-titem-icon--3ch')).toBeInTheDocument();
  });

  it('applies 4ch size class for 4-char icons', () => {
    const { container } = render(<ToolIcon icon="Abcd" />);
    expect(container.querySelector('.tu-titem-icon--4ch')).toBeInTheDocument();
  });

  it('handles no icon at all', () => {
    const { container } = render(<ToolIcon />);
    expect(container.querySelector('.tu-titem-icon')).toBeInTheDocument();
  });

  it('renders multiple known tool icons', () => {
    const ids = ['lowercase', 'reverse', 'base64_enc', 'json_fmt', 'fix_grammar', 'password'];
    ids.forEach((id) => {
      const { container } = render(<ToolIcon toolId={id} />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });
  });
});
