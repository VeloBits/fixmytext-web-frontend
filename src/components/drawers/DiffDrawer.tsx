import { useState } from 'react';
import type { ToolDefinition } from '../../types/tools';

type AlertType = 'warning' | 'danger' | 'success' | 'info';

interface DiffDrawerProps {
  activeTool?: Pick<ToolDefinition, 'id' | 'label'> | null;
  text: string;
  onResult: (label: string, result: string) => void;
  showAlert: (message: string, type: AlertType) => void;
}

export default function DiffDrawer({ activeTool, text, onResult, showAlert }: DiffDrawerProps) {
  const [textB, setTextB] = useState('');
  const toolId = activeTool?.id || 'char_diff';

  const handleCompare = () => {
    if (!text || !textB) {
      showAlert('Enter text in both sides', 'warning');
      return;
    }

    switch (toolId) {
      case 'char_diff': {
        // Character-level diff
        const maxLen = Math.max(text.length, textB.length);
        let diff = 0;
        const lines = [];
        for (let i = 0; i < maxLen; i++) {
          const a = text[i] || '',
            b = textB[i] || '';
          if (a === b) {
            lines.push(`  ${a}`);
          } else {
            diff++;
            lines.push(`- ${a || '(empty)'}\n+ ${b || '(empty)'}`);
          }
        }
        onResult(
          'Character Diff',
          `${diff} character difference(s)\n${'─'.repeat(30)}\n${lines.join('\n')}`
        );
        break;
      }
      case 'word_diff': {
        // Word-level diff
        const wordsA = text.split(/\s+/),
          wordsB = textB.split(/\s+/);
        const lines = [];
        const maxLen = Math.max(wordsA.length, wordsB.length);
        for (let i = 0; i < maxLen; i++) {
          const a = wordsA[i] || '',
            b = wordsB[i] || '';
          if (a === b) lines.push(a);
          else lines.push(`[-${a}-]{+${b}+}`);
        }
        onResult('Word Diff', lines.join(' '));
        break;
      }
      case 'similarity_pct': {
        // Levenshtein-based similarity
        const a = text,
          b = textB;
        const matrix = Array.from({ length: a.length + 1 }, (_, i) =>
          Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
        );
        for (let i = 1; i <= a.length; i++)
          for (let j = 1; j <= b.length; j++)
            matrix[i][j] = Math.min(
              matrix[i - 1][j] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j - 1] + (a[i - 1] !== b[j - 1] ? 1 : 0)
            );
        const dist = matrix[a.length][b.length];
        const maxLen = Math.max(a.length, b.length);
        const similarity = ((1 - dist / maxLen) * 100).toFixed(1);
        onResult(
          'Similarity Score',
          `Similarity: ${similarity}%\nLevenshtein Distance: ${dist}\nText A Length: ${a.length}\nText B Length: ${b.length}`
        );
        break;
      }
      case 'json_diff': {
        try {
          const objA = JSON.parse(text),
            objB = JSON.parse(textB);
          const diffs: string[] = [];
          const compare = (a: Record<string, unknown>, b: Record<string, unknown>, path = '') => {
            const allKeys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
            for (const key of allKeys) {
              const p = path ? `${path}.${key}` : key;
              if (!(key in (a || {}))) diffs.push(`+ ${p}: ${JSON.stringify(b[key])}`);
              else if (!(key in (b || {}))) diffs.push(`- ${p}: ${JSON.stringify(a[key])}`);
              else if (typeof a[key] === 'object' && typeof b[key] === 'object')
                compare(a[key], b[key], p);
              else if (JSON.stringify(a[key]) !== JSON.stringify(b[key]))
                diffs.push(`~ ${p}: ${JSON.stringify(a[key])} → ${JSON.stringify(b[key])}`);
            }
          };
          compare(objA, objB);
          onResult('JSON Diff', diffs.length ? diffs.join('\n') : 'JSON objects are identical');
        } catch {
          showAlert('Both texts must be valid JSON', 'danger');
        }
        break;
      }
      case 'list_diff': {
        const setA = new Set(
          text
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        );
        const setB = new Set(
          textB
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
        );
        const onlyA = [...setA].filter((x) => !setB.has(x));
        const onlyB = [...setB].filter((x) => !setA.has(x));
        const shared = [...setA].filter((x) => setB.has(x));
        const result = `Only in Text A (${onlyA.length}):\n${
          onlyA.map((l) => '  - ' + l).join('\n') || '  (none)'
        }\n\nOnly in Text B (${onlyB.length}):\n${
          onlyB.map((l) => '  + ' + l).join('\n') || '  (none)'
        }\n\nShared (${shared.length}):\n${shared.map((l) => '  = ' + l).join('\n') || '  (none)'}`;
        onResult('List Diff', result);
        break;
      }
      case 'text_overlap': {
        // Find shared 3+ word phrases
        const getPhrasesSet = (txt: string) => {
          const words = txt.split(/\s+/);
          const phrases = new Set<string>();
          for (let len = 3; len <= Math.min(8, words.length); len++)
            for (let i = 0; i <= words.length - len; i++)
              phrases.add(
                words
                  .slice(i, i + len)
                  .join(' ')
                  .toLowerCase()
              );
          return phrases;
        };
        const phrasesA = getPhrasesSet(text);
        const phrasesB = getPhrasesSet(textB);
        const shared = [...phrasesA]
          .filter((p) => phrasesB.has(p))
          .sort((a, b) => b.split(' ').length - a.split(' ').length);
        // Deduplicate (remove shorter phrases contained in longer ones)
        const filtered = shared.filter((p, i) => !shared.some((q, j) => j < i && q.includes(p)));
        onResult(
          'Text Overlap',
          filtered.length
            ? `Found ${filtered.length} shared phrase(s):\n\n${filtered
                .slice(0, 20)
                .map((p) => `• "${p}"`)
                .join('\n')}`
            : 'No significant shared phrases found'
        );
        break;
      }
      default:
        showAlert('Unknown comparison mode', 'danger');
    }
    showAlert('Comparison complete', 'success');
  };

  const titles = {
    char_diff: 'Character Diff',
    word_diff: 'Word Diff',
    similarity_pct: 'Similarity Score',
    json_diff: 'JSON Diff',
    list_diff: 'List Diff',
    text_overlap: 'Overlap Detector',
  };

  return (
    <div className="tu-fr">
      <div className="tu-fr-row">
        <div className="tu-fr-field">
          <textarea
            className="tu-fr-input tu-fr-input--multiline"
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            placeholder={`Paste the second text to ${titles[toolId] || 'compare'}…`}
            rows={3}
            spellCheck={false}
          />
        </div>
        <div className="tu-fr-actions">
          <button
            className="tu-fr-action tu-fr-action--text"
            onClick={handleCompare}
            title="Compare"
          >
            Compare
          </button>
        </div>
      </div>
    </div>
  );
}
