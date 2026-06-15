import React, { useState } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

type AlertType = 'warning' | 'danger' | 'success' | 'info';

interface SharedDrawerProps {
  onResult: (label: string, result: string) => void;
  showAlert: (message: string, type: AlertType) => void;
}

interface JsonPathDrawerProps extends SharedDrawerProps {
  text: string;
}

export function JsonPathDrawer({ text, onResult, showAlert }: JsonPathDrawerProps) {
  const [path, setPath] = useState('$');

  const handleQuery = () => {
    if (!text) {
      showAlert('Enter JSON in the editor first', 'warning');
      return;
    }
    try {
      const obj = JSON.parse(text);
      // Simple JSONPath implementation for common patterns
      const parts = path
        .replace(/^\$\.?/, '')
        .split('.')
        .filter(Boolean);
      let current = obj;
      for (const part of parts) {
        const arrayMatch = part.match(/^(\w+)\[(\d+|\*)\]$/);
        if (arrayMatch) {
          current = current[arrayMatch[1]!];
          if (arrayMatch[2] === '*') {
            // Keep as array
          } else {
            current = current[parseInt(arrayMatch[2]!)];
          }
        } else if (part === '*') {
          current = Object.values(current);
        } else {
          current = current[part];
        }
        if (current === undefined) {
          onResult('JSON Path', 'No match found for path: ' + path);
          return;
        }
      }
      onResult('JSON Path Result', JSON.stringify(current, null, 2));
      showAlert('JSON path query executed', 'success');
    } catch {
      showAlert('Invalid JSON or path expression', 'danger');
    }
  };

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field">
          <input
            type="text"
            className="tu-fr-input"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleQuery()}
            placeholder="JSONPath, e.g. $.store.book[0].title"
            spellCheck={false}
            autoFocus
          />
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action tu-fr-action--text"
            onClick={handleQuery}
            title="Query"
          >
            Query
          </button>
        </div>
      </div>
    </div>
  );
}

interface MarkdownPreviewDrawerProps {
  text: string;
}

export function MarkdownPreviewDrawer({ text }: MarkdownPreviewDrawerProps) {
  // Render Markdown via `marked`, then DOMPurify-sanitize before injecting —
  // mirrors OutputPanel's sanitized path so editor text can't inject HTML/JS
  // (FE-XSS-01). The previous hand-rolled regex fed straight into
  // dangerouslySetInnerHTML with no sanitization.
  const htmlContent = text
    ? DOMPurify.sanitize(marked.parse(text) as string)
    : '<p style="color: var(--text-3)">Enter Markdown in the editor to preview...</p>';

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div
          className="tu-fr-field tu-fr-field--readonly"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
        />
      </div>
    </div>
  );
}

export function LoremIpsumDrawer({ onResult, showAlert }: SharedDrawerProps) {
  const [count, setCount] = useState(3);
  const [type, setType] = useState<'words' | 'sentences' | 'paragraphs'>('paragraphs');

  const LOREM =
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.';
  const WORDS = LOREM.replace(/[.,]/g, '').toLowerCase().split(/\s+/);

  const handleGenerate = () => {
    let result;
    if (type === 'words') {
      const words: string[] = [];
      for (let i = 0; i < count; i++) words.push(WORDS[i % WORDS.length]!);
      words[0] = words[0]!.charAt(0).toUpperCase() + words[0]!.slice(1);
      result = words.join(' ') + '.';
    } else if (type === 'sentences') {
      const sentences = LOREM.split('. ').map((s) => s.trim().replace(/\.$/, ''));
      result = Array.from({ length: count }, (_, i) => sentences[i % sentences.length] + '.').join(
        '\n'
      );
    } else {
      // One paragraph per line so the output gutter line numbers match the
      // count (3 paragraphs → lines 1, 2, 3 — no empty rows in between).
      result = Array.from({ length: count }, () => LOREM).join('\n\n');
    }
    onResult('Lorem Ipsum', result);
    showAlert(`Generated ${count} ${type}`, 'success');
  };

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--segmented">
          <span className="tu-fr-seg-label">Type</span>
          {(['words', 'sentences', 'paragraphs'] as const).map((t) => (
            <button
              key={t}
              className={`tu-fr-seg${type === t ? ' tu-fr-seg--on' : ''}`}
              onClick={() => setType(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--segmented">
          <span className="tu-fr-seg-label">Count</span>
          {[1, 3, 5, 10].map((n) => (
            <button
              key={n}
              className={`tu-fr-seg${count === n ? ' tu-fr-seg--on' : ''}`}
              onClick={() => setCount(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action tu-fr-action--text"
            onClick={handleGenerate}
            title="Generate"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}

type SampleTemplate = 'user' | 'product' | 'order' | 'comment' | 'api_response';

export function SampleJsonDrawer({ onResult, showAlert }: SharedDrawerProps) {
  const [template, setTemplate] = useState<SampleTemplate>('user');

  const templates = {
    user: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
      age: 30,
      role: 'admin',
      active: true,
      created_at: new Date().toISOString(),
    },
    product: {
      id: 101,
      name: 'Wireless Headphones',
      price: 79.99,
      category: 'Electronics',
      in_stock: true,
      rating: 4.5,
      tags: ['audio', 'wireless', 'bluetooth'],
    },
    order: {
      id: 'ORD-001',
      customer_id: 1,
      items: [{ product_id: 101, quantity: 2, price: 79.99 }],
      total: 159.98,
      status: 'shipped',
      created_at: new Date().toISOString(),
    },
    comment: {
      id: 1,
      post_id: 42,
      author: 'Jane',
      body: 'Great article!',
      likes: 15,
      created_at: new Date().toISOString(),
    },
    api_response: {
      status: 200,
      data: [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ],
      pagination: { page: 1, per_page: 10, total: 42, total_pages: 5 },
      meta: { request_id: 'abc-123' },
    },
  };

  const handleGenerate = () => {
    onResult('Sample JSON', JSON.stringify(templates[template], null, 2));
    showAlert('Sample JSON generated', 'success');
  };

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field tu-fr-field--segmented">
          <span className="tu-fr-seg-label">Template</span>
          {(Object.keys(templates) as SampleTemplate[]).map((t) => (
            <button
              key={t}
              className={`tu-fr-seg${template === t ? ' tu-fr-seg--on' : ''}`}
              onClick={() => setTemplate(t)}
            >
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action tu-fr-action--text"
            onClick={handleGenerate}
            title="Generate"
          >
            Generate
          </button>
        </div>
      </div>
    </div>
  );
}
