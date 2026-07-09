import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  JsonPathDrawer,
  MarkdownPreviewDrawer,
  LoremIpsumDrawer,
  SampleJsonDrawer,
} from './DevToolsDrawer';

describe('JsonPathDrawer', () => {
  const props = { text: '', onResult: vi.fn(), showAlert: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the input and query button', () => {
    render(<JsonPathDrawer {...props} />);
    expect(screen.getByPlaceholderText('JSONPath, e.g. $.store.book[0].title')).toBeInTheDocument();
    expect(screen.getByText('Query')).toBeInTheDocument();
  });

  it('shows warning when text is empty', () => {
    render(<JsonPathDrawer {...props} text="" />);
    fireEvent.click(screen.getByText('Query'));
    expect(props.showAlert).toHaveBeenCalledWith('Enter JSON in the editor first', 'warning');
  });

  it('queries valid JSON with simple path', () => {
    const json = JSON.stringify({ name: 'Alice' });
    render(<JsonPathDrawer {...props} text={json} />);
    fireEvent.change(screen.getByPlaceholderText('JSONPath, e.g. $.store.book[0].title'), {
      target: { value: '$.name' },
    });
    fireEvent.click(screen.getByText('Query'));
    expect(props.onResult).toHaveBeenCalledWith('JSON Path Result', '"Alice"');
    expect(props.showAlert).toHaveBeenCalledWith('JSON path query executed', 'success');
  });

  it('handles invalid JSON', () => {
    render(<JsonPathDrawer {...props} text="not json" />);
    fireEvent.click(screen.getByText('Query'));
    expect(props.showAlert).toHaveBeenCalledWith('Invalid JSON or path expression', 'danger');
  });

  it('handles path with no match', () => {
    const json = JSON.stringify({ a: 1 });
    render(<JsonPathDrawer {...props} text={json} />);
    fireEvent.change(screen.getByPlaceholderText('JSONPath, e.g. $.store.book[0].title'), {
      target: { value: '$.missing' },
    });
    fireEvent.click(screen.getByText('Query'));
    expect(props.onResult).toHaveBeenCalledWith('JSON Path', 'No match found for path: $.missing');
  });

  it('handles array index in path', () => {
    const json = JSON.stringify({ items: ['a', 'b', 'c'] });
    render(<JsonPathDrawer {...props} text={json} />);
    fireEvent.change(screen.getByPlaceholderText('JSONPath, e.g. $.store.book[0].title'), {
      target: { value: '$.items[1]' },
    });
    fireEvent.click(screen.getByText('Query'));
    expect(props.onResult).toHaveBeenCalledWith('JSON Path Result', '"b"');
  });

  it('handles wildcard * path', () => {
    const json = JSON.stringify({ a: 1, b: 2 });
    render(<JsonPathDrawer {...props} text={json} />);
    fireEvent.change(screen.getByPlaceholderText('JSONPath, e.g. $.store.book[0].title'), {
      target: { value: '$.*' },
    });
    fireEvent.click(screen.getByText('Query'));
    expect(props.onResult).toHaveBeenCalledWith('JSON Path Result', expect.any(String));
  });

  it('handles root $ path', () => {
    const json = JSON.stringify({ a: 1 });
    render(<JsonPathDrawer {...props} text={json} />);
    fireEvent.change(screen.getByPlaceholderText('JSONPath, e.g. $.store.book[0].title'), {
      target: { value: '$' },
    });
    fireEvent.click(screen.getByText('Query'));
    expect(props.onResult).toHaveBeenCalledWith('JSON Path Result', expect.any(String));
  });
});

describe('MarkdownPreviewDrawer', () => {
  it('shows placeholder when text is empty', () => {
    const { container } = render(<MarkdownPreviewDrawer text="" />);
    expect(container.textContent).toMatch(/Enter Markdown/);
  });

  it('renders bold markdown', () => {
    const { container } = render(<MarkdownPreviewDrawer text="**bold text**" />);
    expect(container.querySelector('strong')).toBeTruthy();
  });

  it('renders headings', () => {
    const { container } = render(<MarkdownPreviewDrawer text="# Heading 1" />);
    expect(container.querySelector('h1')).toBeTruthy();
  });
});

describe('LoremIpsumDrawer', () => {
  const props = { onResult: vi.fn(), showAlert: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders type/count options', () => {
    render(<LoremIpsumDrawer {...props} />);
    expect(screen.getByText('Words')).toBeInTheDocument();
    expect(screen.getByText('Sentences')).toBeInTheDocument();
    expect(screen.getByText('Paragraphs')).toBeInTheDocument();
    expect(screen.getByText('Generate')).toBeInTheDocument();
  });

  it('generates paragraphs by default', () => {
    render(<LoremIpsumDrawer {...props} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(props.onResult).toHaveBeenCalledWith(
      'Lorem Ipsum',
      expect.stringContaining('Lorem ipsum')
    );
    expect(props.showAlert).toHaveBeenCalledWith('Generated 3 paragraphs', 'success');
  });

  it('generates words', () => {
    render(<LoremIpsumDrawer {...props} />);
    fireEvent.click(screen.getByText('Words'));
    fireEvent.click(screen.getByText('1'));
    fireEvent.click(screen.getByText('Generate'));
    expect(props.onResult).toHaveBeenCalledWith('Lorem Ipsum', expect.any(String));
    expect(props.showAlert).toHaveBeenCalledWith('Generated 1 words', 'success');
  });

  it('generates sentences', () => {
    render(<LoremIpsumDrawer {...props} />);
    fireEvent.click(screen.getByText('Sentences'));
    fireEvent.click(screen.getByText('Generate'));
    expect(props.onResult).toHaveBeenCalled();
  });

  it('allows changing count', () => {
    render(<LoremIpsumDrawer {...props} />);
    fireEvent.click(screen.getByText('5'));
    fireEvent.click(screen.getByText('Generate'));
    expect(props.showAlert).toHaveBeenCalledWith('Generated 5 paragraphs', 'success');
  });
});

describe('SampleJsonDrawer', () => {
  const props = { onResult: vi.fn(), showAlert: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders template options', () => {
    render(<SampleJsonDrawer {...props} />);
    expect(screen.getByText('user')).toBeInTheDocument();
    expect(screen.getByText('product')).toBeInTheDocument();
    expect(screen.getByText('order')).toBeInTheDocument();
  });

  it('generates sample JSON', () => {
    render(<SampleJsonDrawer {...props} />);
    fireEvent.click(screen.getByText('Generate'));
    expect(props.onResult).toHaveBeenCalledWith('Sample JSON', expect.stringContaining('"name"'));
    expect(props.showAlert).toHaveBeenCalledWith('Sample JSON generated', 'success');
  });

  it('switches template', () => {
    render(<SampleJsonDrawer {...props} />);
    fireEvent.click(screen.getByText('product'));
    fireEvent.click(screen.getByText('Generate'));
    expect(props.onResult).toHaveBeenCalledWith('Sample JSON', expect.stringContaining('"price"'));
  });
});
