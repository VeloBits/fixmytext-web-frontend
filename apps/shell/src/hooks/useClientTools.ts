import { useMemo } from 'react';
import type React from 'react';
import type { AiResult } from './useAiTools';
import type { AlertType } from './useAlert';

interface ClientToolsDeps {
  textRef: React.RefObject<string>;
  setToolResults: (fn: (prev: Record<string, string>) => Record<string, string>) => void;
  setPreviewMode: (mode: string) => void;
  setLocalLoading: (v: boolean) => void;
  showAlert: (msg: string, type: AlertType) => void;
  activeWorkspaceId: string;
  setAiResult: (result: AiResult) => void;
  pushHistory: (label: string, orig: string, result: string, meta: Record<string, string>) => void;
}

export default function useClientTools({
  textRef,
  setToolResults,
  setPreviewMode,
  setLocalLoading,
  showAlert,
  activeWorkspaceId,
  setAiResult,
  pushHistory,
}: ClientToolsDeps) {
  return useMemo(() => {
    const handleFrequencyAnalysis = () => {
      const t = textRef.current;
      if (!t) return;
      const freq: Record<string, number> = {};
      for (const ch of t.toUpperCase()) {
        if (/[A-Z]/.test(ch)) freq[ch] = (freq[ch] || 0) + 1;
      }
      const total = Object.values(freq).reduce((a, b) => a + b, 0);
      if (total === 0) {
        showAlert('No letters found to analyze', 'warning');
        return;
      }
      const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
      const BAR_WIDTH = 20;
      const countWidth = String(sorted[0]?.[1] ?? 0).length;
      const lines = sorted.map(([ch, count]) => {
        const pct = (count / total) * 100;
        const filled = Math.round((pct / 100) * BAR_WIDTH);
        const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(BAR_WIDTH - filled);
        return `${ch}  ${String(count).padStart(countWidth)}  ${bar}  ${pct.toFixed(1).padStart(5)}%`;
      });
      const result = `Total letters: ${total}\n\n${lines.join('\n')}`;
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Frequency Analysis', result });
      setPreviewMode('result');
      showAlert('Frequency analysis complete', 'success');
    };

    const handleFormatSql = async () => {
      const t = textRef.current;
      if (!t) return;
      setLocalLoading(true);
      try {
        const m = await import('sql-formatter');
        const result = m.format(t);
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
        setPreviewMode('result');
        showAlert('SQL formatted', 'success');
      } catch {
        showAlert('Could not format SQL', 'danger');
      } finally {
        setLocalLoading(false);
      }
    };

    const handleFormatXml = () => {
      const t = textRef.current;
      if (!t || !t.trim()) return;
      try {
        // XML is parsed as a single document; pretty-printed input legitimately
        // spans many lines. Splitting per line would reject multi-line XML.
        const parser = new DOMParser();
        const doc = parser.parseFromString(t, 'text/xml');
        if (doc.querySelector('parsererror')) throw new Error('Invalid XML');
        const serializer = new XMLSerializer();
        const xml = serializer.serializeToString(doc);
        let formatted = '',
          indent = 0;
        xml.split(/>\s*</).forEach((node) => {
          if (node.match(/^\//)) indent--;
          formatted += '  '.repeat(Math.max(indent, 0)) + '<' + node + '>\n';
          if (node.match(/^<?\w[^>]*[^/]$/) && !node.startsWith('?')) indent++;
        });
        // Trim the trailing newline first, then strip the leading `<` and the
        // duplicated trailing `>` left over from re-wrapping the last chunk.
        const result = formatted.replace(/\n$/, '').replace(/^</, '').replace(/>$/, '');
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
        setAiResult({ label: 'XML Format', result });
        setPreviewMode('result');
        showAlert('XML formatted', 'success');
      } catch {
        showAlert('Invalid XML input', 'danger');
      }
    };

    const handleJsonMinify = () => {
      const t = textRef.current;
      if (!t) return;
      try {
        const result = JSON.stringify(JSON.parse(t));
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
        setPreviewMode('result');
        showAlert('JSON minified', 'success');
      } catch {
        showAlert('Invalid JSON input', 'danger');
      }
    };

    const handleJsonToTs = () => {
      const t = textRef.current;
      if (!t) return;
      try {
        const obj = JSON.parse(t);
        const inferType = (val: unknown, name = 'Root', depth = 0): string => {
          if (val === null) return 'null';
          if (Array.isArray(val)) {
            if (val.length === 0) return 'any[]';
            const itemType = inferType(val[0], name + 'Item', depth + 1);
            return itemType.includes('{') ? `${name}Item[]` : `${itemType}[]`;
          }
          if (typeof val === 'object') {
            const fields = Object.entries(val as Record<string, unknown>).map(([k, v]) => {
              const type = inferType(v, k.charAt(0).toUpperCase() + k.slice(1), depth + 1);
              return `  ${k}: ${type}`;
            });
            if (depth === 0) return `interface ${name} {\n${fields.join('\n')}\n}`;
            return `{\n${fields.join('\n')}\n}`;
          }
          return typeof val;
        };
        const result = inferType(obj);
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
        setPreviewMode('result');
        showAlert('TypeScript interface generated', 'success');
      } catch {
        showAlert('Invalid JSON input', 'danger');
      }
    };

    const handleUuidGen = () => {
      const uuids = Array.from({ length: 5 }, () => crypto.randomUUID()).join('\n');
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: uuids }));
      setAiResult({ label: 'Result', result: uuids });
      setPreviewMode('result');
      showAlert('UUIDs generated', 'success');
    };

    const handleTimestampConvert = () => {
      const raw = textRef.current || '';
      if (!raw.trim()) return;

      const convertOne = (input: string) => {
        let date;
        if (/^now$/i.test(input)) {
          date = new Date();
        } else if (/^\d{10,13}$/.test(input)) {
          const ts = input.length === 10 ? parseInt(input) * 1000 : parseInt(input);
          date = new Date(ts);
        } else {
          date = new Date(input);
        }
        if (isNaN(date.getTime())) return null;
        return `Unix (s):  ${Math.floor(
          date.getTime() / 1000
        )}\nUnix (ms): ${date.getTime()}\nISO 8601:  ${date.toISOString()}\nUTC:       ${date.toUTCString()}\nLocal:     ${date.toLocaleString()}`;
      };

      const inputs = raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const blocks = inputs.map((input) => {
        const out = convertOne(input);
        return out || `(invalid — could not parse "${input}")`;
      });
      const validCount = inputs.filter((input) => convertOne(input) !== null).length;
      if (validCount === 0) {
        showAlert('Could not parse date/timestamp', 'danger');
        return;
      }
      const result = blocks.join('\n\n');
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Timestamp Converter', result });
      setPreviewMode('result');
      showAlert(
        inputs.length === 1
          ? 'Timestamp converted'
          : `Converted ${validCount}/${inputs.length} timestamps`,
        'success'
      );
    };

    const handleColorConvert = () => {
      const raw = textRef.current || '';
      if (!raw.trim()) return;

      const convertOne = (input: string) => {
        let r, g, b;
        const hexMatch = input.match(/^#?([0-9a-fA-F]{6})$/);
        const rgbMatch = input.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
        if (hexMatch) {
          const hex = hexMatch[1]!;
          r = parseInt(hex.slice(0, 2), 16);
          g = parseInt(hex.slice(2, 4), 16);
          b = parseInt(hex.slice(4, 6), 16);
        } else if (rgbMatch) {
          r = parseInt(rgbMatch[1]!);
          g = parseInt(rgbMatch[2]!);
          b = parseInt(rgbMatch[3]!);
        } else {
          return null;
        }
        const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b
          .toString(16)
          .padStart(2, '0')}`.toUpperCase();
        const rn = r / 255,
          gn = g / 255,
          bn = b / 255;
        const max = Math.max(rn, gn, bn),
          min = Math.min(rn, gn, bn);
        const l = (max + min) / 2;
        let h = 0,
          s = 0;
        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
          else if (max === gn) h = ((bn - rn) / d + 2) / 6;
          else h = ((rn - gn) / d + 4) / 6;
        }
        return `HEX: ${hex}\nRGB: rgb(${r}, ${g}, ${b})\nHSL: hsl(${Math.round(
          h * 360
        )}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`;
      };

      const inputs = raw
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      const blocks = inputs.map((input) => {
        const out = convertOne(input);
        return out || '(invalid — expected HEX or RGB)';
      });
      const valid = blocks.filter((_, i) => convertOne(inputs[i] ?? '') !== null).length;
      if (valid === 0) {
        showAlert('Enter a HEX (#FF5733) or RGB (rgb(255,87,51)) color', 'danger');
        return;
      }
      const result = blocks.join('\n\n');
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Color Converter', result });
      setPreviewMode('result');
      showAlert(
        inputs.length === 1
          ? 'Color converted'
          : `Converted ${valid}/${inputs.length} colors`,
        'success'
      );
    };

    const handleUlidGen = () => {
      const result = Array.from({ length: 5 }, (_, i) => {
        const t = (Date.now() + i).toString(36).toUpperCase().padStart(10, '0');
        const r = Array.from(
          { length: 16 },
          () => '0123456789ABCDEFGHJKMNPQRSTVWXYZ'[Math.floor(Math.random() * 32)]
        ).join('');
        return t + r;
      }).join('\n');
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('ULIDs generated', 'success');
    };

    const handleCronExplain = () => {
      const raw = textRef.current || '';
      if (!raw.trim()) return;

      const explainOne = (expr: string): string | null => {
        const parts = expr.split(/\s+/);
        if (parts.length < 5 || parts.length > 6) return null;
         
        const [min, hour, dom, month, dow] = parts as [string, string, string, string, string];
        const descs: string[] = [];
        if (min === '*') descs.push('every minute');
        else if (min.includes('/')) descs.push(`every ${min.split('/')[1]} minutes`);
        else descs.push(`at minute ${min}`);
        if (hour === '*') descs.push('of every hour');
        else if (hour.includes('-')) descs.push(`during hours ${hour.replace('-', ' through ')}`);
        else descs.push(`at ${hour}:00`);
        if (dom !== '*') descs.push(`on day ${dom} of the month`);
        if (month !== '*') descs.push(`in month ${month}`);
        if (dow !== '*') {
          const days = {
            0: 'Sunday',
            1: 'Monday',
            2: 'Tuesday',
            3: 'Wednesday',
            4: 'Thursday',
            5: 'Friday',
            6: 'Saturday',
            7: 'Sunday',
          };
          const dayStr = dow
            .split(',')
            .map((d) => {
              if (d.includes('-')) {
                const [s, e] = d.split('-') as [string, string];
                return `${days[s as unknown as keyof typeof days] || s} through ${days[e as unknown as keyof typeof days] || e}`;
              }
              return days[d as unknown as keyof typeof days] || d;
            })
            .join(', ');
          descs.push(`on ${dayStr}`);
        }
        return `${descs.join(', ')}.`;
      };

      const inputs = raw
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const blocks = inputs.map((expr) => {
        const out = explainOne(expr);
        return out || '(invalid — expected 5 or 6 space-separated fields)';
      });
      const validCount = inputs.filter((expr) => explainOne(expr) !== null).length;
      if (validCount === 0) {
        showAlert('Enter a valid cron expression (5 or 6 fields)', 'danger');
        return;
      }
      const result = blocks.join('\n');
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Cron Explainer', result });
      setPreviewMode('result');
      showAlert(
        inputs.length === 1
          ? 'Cron expression explained'
          : `Explained ${validCount}/${inputs.length} cron expressions`,
        'success'
      );
    };

    const handleHttpHeaderParse = () => {
      const t = textRef.current;
      if (!t) return;
      const lines = t.split('\n').filter((l) => l.includes(':'));
      const headers = lines.map((l) => {
        const idx = l.indexOf(':');
        return `| ${l.slice(0, idx).trim().padEnd(30)} | ${l.slice(idx + 1).trim()} |`;
      });
      const result = `| ${'Header'.padEnd(30)} | Value |\n| ${'-'.repeat(
        30
      )} | ----- |\n${headers.join('\n')}`;
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('HTTP headers parsed', 'success');
    };

    const handleUrlParser = () => {
      const t = (textRef.current || '').trim();
      if (!t) return;
      try {
        const url = new URL(t);
        const params = [...url.searchParams.entries()].map(([k, v]) => `  ${k} = ${v}`).join('\n');
        const result = `Protocol: ${url.protocol}\nHost:     ${url.hostname}\nPort:     ${
          url.port || '(default)'
        }\nPath:     ${url.pathname}\nSearch:   ${url.search}\nHash:     ${url.hash}\n${
          params ? `\nQuery Parameters:\n${params}` : ''
        }`;
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
        setPreviewMode('result');
        showAlert('URL parsed', 'success');
      } catch {
        showAlert('Invalid URL', 'danger');
      }
    };

    const handleSlugGenerator = () => {
      const t = textRef.current;
      if (!t) return;
      const stopWords = new Set([
        'a',
        'an',
        'the',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'by',
        'is',
        'it',
        'as',
      ]);
      const slug = t
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .split(/\s+/)
        .filter((w) => !stopWords.has(w))
        .join('-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 80);
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: slug }));
      setAiResult({ label: 'Result', result: slug });
      setPreviewMode('result');
      showAlert('URL slug generated', 'success');
    };

    const handleReadingLevel = () => {
      const t = textRef.current;
      if (!t) return;
      const words = t.split(/\s+/).filter(Boolean);
      const sentences = t.split(/[.!?]+/).filter((s) => s.trim());
      const syllables = words.reduce((sum, w) => {
        const s = w
          .toLowerCase()
          .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
          .match(/[aeiouy]{1,2}/g);
        return sum + Math.max(s ? s.length : 1, 1);
      }, 0);
      const wc = words.length,
        sc = sentences.length;
      const flesch = 206.835 - 1.015 * (wc / sc) - 84.6 * (syllables / wc);
      const fkGrade = 0.39 * (wc / sc) + 11.8 * (syllables / wc) - 15.59;
      const readTime = Math.ceil(wc / 238);
      const speakTime = Math.ceil(wc / 150);
      let level = 'College';
      if (fkGrade <= 5) level = 'Elementary';
      else if (fkGrade <= 8) level = 'Middle School';
      else if (fkGrade <= 12) level = 'High School';
      const result = `Reading Level Analysis\n${'\u2500'.repeat(
        30
      )}\nFlesch Score:    ${flesch.toFixed(1)}\nGrade Level:     ${fkGrade.toFixed(
        1
      )} (${level})\nReading Time:    ~${readTime} min (238 WPM)\nSpeaking Time:   ~${speakTime} min (150 WPM)\nWords:           ${wc}\nSentences:       ${sc}\nAvg Words/Sent:  ${(
        wc / sc
      ).toFixed(1)}`;
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('Reading level analyzed', 'success');
    };

    const handleReadingTime = () => {
      const t = textRef.current;
      if (!t) return;
      const words = t.split(/\s+/).filter(Boolean).length;
      const result = `Reading Time:  ~${Math.ceil(
        words / 238
      )} min (238 WPM)\nSpeaking Time: ~${Math.ceil(words / 150)} min (150 WPM)\nWords: ${words}`;
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('Reading time estimated', 'success');
    };

    const handleCharCount = () => {
      const t = textRef.current || '';
      const chars = t.length,
        charsNoSpaces = t.replace(/\s/g, '').length;
      const words = t.split(/\s+/).filter(Boolean).length;
      const sentences = t.split(/[.!?]+/).filter((s) => s.trim()).length;
      const paragraphs = t.split(/\n\s*\n/).filter((p) => p.trim()).length;
      const lines = t.split('\n').length;
      const result = `Characters:     ${chars}\nNo Spaces:      ${charsNoSpaces}\nWords:          ${words}\nSentences:      ${sentences}\nParagraphs:     ${paragraphs}\nLines:          ${lines}`;
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('Characters counted', 'success');
    };

    const handleTextStats = () => {
      const t = textRef.current;
      if (!t) return;
      const words = t.split(/\s+/).filter(Boolean);
      const sentences = t.split(/[.!?]+/).filter((s) => s.trim());
      const uniqueWords = new Set(words.map((w) => w.toLowerCase()));
      const avgWordLen = words.reduce((s, w) => s + w.length, 0) / words.length;
      const avgSentLen = words.length / sentences.length;
      const result = `Text Statistics\n${'\u2500'.repeat(30)}\nTotal Words:       ${
        words.length
      }\nUnique Words:      ${uniqueWords.size}\nVocabulary Ratio:  ${(
        (uniqueWords.size / words.length) *
        100
      ).toFixed(1)}%\nAvg Word Length:   ${avgWordLen.toFixed(
        1
      )} chars\nAvg Sentence Len:  ${avgSentLen.toFixed(
        1
      )} words\nLongest Word:      ${words.reduce((a, b) => (a.length > b.length ? a : b), '')}`;
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('Text statistics computed', 'success');
    };

    const handleDuplicateWords = () => {
      const t = textRef.current;
      if (!t) return;
      const words = t.toLowerCase().match(/\b[a-z]+\b/g) || [];
      const freq: Record<string, number> = {};
      words.forEach((w) => {
        freq[w] = (freq[w] || 0) + 1;
      });
      const dupes = Object.entries(freq)
        .filter(([, c]) => c > 1)
        .sort((a, b) => b[1] - a[1]);
      const result = dupes.length
        ? dupes.map(([w, c]) => `${w}: ${c}\u00d7`).join('\n')
        : 'No duplicate words found!';
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('Duplicate words found', 'success');
    };

    const handleOverusedWords = () => {
      const t = textRef.current;
      if (!t) return;
      const stopWords = new Set([
        'the',
        'a',
        'an',
        'and',
        'or',
        'but',
        'in',
        'on',
        'at',
        'to',
        'for',
        'of',
        'with',
        'by',
        'is',
        'it',
        'as',
        'was',
        'were',
        'be',
        'been',
        'being',
        'have',
        'has',
        'had',
        'do',
        'does',
        'did',
        'will',
        'would',
        'could',
        'should',
        'may',
        'might',
        'can',
        'this',
        'that',
        'these',
        'those',
        'i',
        'you',
        'he',
        'she',
        'we',
        'they',
        'me',
        'him',
        'her',
        'us',
        'them',
        'my',
        'your',
        'his',
        'its',
        'our',
        'their',
        'not',
        'no',
        'so',
        'if',
      ]);
      const words = t.toLowerCase().match(/\b[a-z]+\b/g) || [];
      const freq: Record<string, number> = {};
      words
        .filter((w) => !stopWords.has(w) && w.length > 2)
        .forEach((w) => {
          freq[w] = (freq[w] || 0) + 1;
        });
      const total = Object.values(freq).reduce((a, b) => a + b, 0);
      const overused = Object.entries(freq)
        .filter(([, c]) => c / total > 0.03)
        .sort((a, b) => b[1] - a[1]);
      const result = overused.length
        ? `Overused Words (>3% frequency)\n${'\u2500'.repeat(30)}\n` +
          overused
            .map(([w, c]) => `\u26a0 "${w}" \u2014 ${c}\u00d7 (${((c / total) * 100).toFixed(1)}%)`)
            .join('\n')
        : 'No overused words detected!';
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('Overused words analyzed', 'success');
    };

    const handleNumToWords = () => {
      const t = (textRef.current || '').trim();
      if (!t) return;
      const ones = [
        '',
        'one',
        'two',
        'three',
        'four',
        'five',
        'six',
        'seven',
        'eight',
        'nine',
        'ten',
        'eleven',
        'twelve',
        'thirteen',
        'fourteen',
        'fifteen',
        'sixteen',
        'seventeen',
        'eighteen',
        'nineteen',
      ];
      const tens = [
        '',
        '',
        'twenty',
        'thirty',
        'forty',
        'fifty',
        'sixty',
        'seventy',
        'eighty',
        'ninety',
      ];
      const convert = (n: number): string => {
        if (n === 0) return 'zero';
        if (n < 0) return 'negative ' + convert(-n);
        let result = '';
        if (n >= 1e9) {
          result += convert(Math.floor(n / 1e9)) + ' billion ';
          n %= 1e9;
        }
        if (n >= 1e6) {
          result += convert(Math.floor(n / 1e6)) + ' million ';
          n %= 1e6;
        }
        if (n >= 1000) {
          result += convert(Math.floor(n / 1000)) + ' thousand ';
          n %= 1000;
        }
        if (n >= 100) {
          result += ones[Math.floor(n / 100)] + ' hundred ';
          n %= 100;
        }
        if (n >= 20) {
          result += tens[Math.floor(n / 10)] + (n % 10 ? '-' + ones[n % 10] : '') + ' ';
        } else if (n > 0) {
          result += ones[n] + ' ';
        }
        return result.trim();
      };
      const num = parseFloat(t.replace(/,/g, ''));
      if (isNaN(num)) {
        showAlert('Enter a valid number', 'danger');
        return;
      }
      setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: convert(Math.floor(num)),
      }));
      setAiResult({ label: 'Result', result: convert(Math.floor(num)) });
      setPreviewMode('result');
      showAlert('Number converted to words', 'success');
    };

    const handleWordsToNum = () => {
      const t = (textRef.current || '').trim().toLowerCase();
      if (!t) return;
      const map = {
        zero: 0,
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10,
        eleven: 11,
        twelve: 12,
        thirteen: 13,
        fourteen: 14,
        fifteen: 15,
        sixteen: 16,
        seventeen: 17,
        eighteen: 18,
        nineteen: 19,
        twenty: 20,
        thirty: 30,
        forty: 40,
        fifty: 50,
        sixty: 60,
        seventy: 70,
        eighty: 80,
        ninety: 90,
      };
      const multipliers = {
        hundred: 100,
        thousand: 1000,
        million: 1e6,
        billion: 1e9,
      };
      const words = t
        .replace(/-/g, ' ')
        .split(/[\s,]+/)
        .filter(Boolean);
      let result = 0,
        current = 0;
      for (const w of words) {
        if (w === 'and') continue;
        if (map[w as keyof typeof map] !== undefined) current += map[w as keyof typeof map]!;
        else if (w === 'hundred') current *= 100;
        else if (multipliers[w as keyof typeof multipliers]) {
          result += current * (multipliers[w as keyof typeof multipliers]! / (w === 'hundred' ? 1 : 1));
          current *= multipliers[w as keyof typeof multipliers]!;
          if (w !== 'hundred') {
            result += current;
            current = 0;
          }
        }
      }
      result += current;
      setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: result.toString(),
      }));
      setAiResult({ label: 'Result', result: result.toString() });
      setPreviewMode('result');
      showAlert('Words converted to number', 'success');
    };

    const handleRomanNumeral = () => {
      const t = (textRef.current || '').trim();
      if (!t) return;
      if (/^\d+$/.test(t)) {
        let n = parseInt(t),
          result = '';
        const vals: [number, string][] = [
          [1000, 'M'],
          [900, 'CM'],
          [500, 'D'],
          [400, 'CD'],
          [100, 'C'],
          [90, 'XC'],
          [50, 'L'],
          [40, 'XL'],
          [10, 'X'],
          [9, 'IX'],
          [5, 'V'],
          [4, 'IV'],
          [1, 'I'],
        ];
        for (const [val, sym] of vals) {
          while (n >= val) {
            result += sym;
            n -= val;
          }
        }
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      } else {
        const roman = { M: 1000, D: 500, C: 100, L: 50, X: 10, V: 5, I: 1 };
        const upper = t.toUpperCase();
        let result = 0;
        for (let i = 0; i < upper.length; i++) {
          const curr = roman[upper[i] as keyof typeof roman],
            next = roman[upper[i + 1] as keyof typeof roman];
          if (next && curr < next) result -= curr;
          else result += curr;
        }
        setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: result.toString(),
      }));
      setAiResult({ label: 'Result', result: result.toString() });
      }
      setPreviewMode('result');
      showAlert('Roman numeral converted', 'success');
    };

    const handleQrFromText = async () => {
      const t = textRef.current;
      if (!t) return;
      try {
        const QRCode = (await import('qrcode')).default;
        const dataUrl = await QRCode.toDataURL(t, { width: 300, margin: 2 });
        const result = `[QR Code Generated]\n\nData URL (paste in browser):\n${dataUrl}`;
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
        setPreviewMode('result');
        showAlert('QR code generated', 'success');
      } catch {
        showAlert('Could not generate QR code', 'danger');
      }
    };

    const handleMdToHtml = () => {
      const t = textRef.current;
      if (!t) return;
      try {
        let html = t
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
          .replace(/\*(.+?)\*/g, '<em>$1</em>')
          .replace(/`(.+?)`/g, '<code>$1</code>')
          .replace(/^- (.+)$/gm, '<li>$1</li>')
          .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
          .replace(/\n\n/g, '</p>\n<p>');
        html = '<p>' + html + '</p>';
        setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: html }));
      setAiResult({ label: 'Result', result: html });
        setPreviewMode('result');
        showAlert('Markdown converted to HTML', 'success');
      } catch {
        showAlert('Could not convert Markdown', 'danger');
      }
    };

    const handleTextToTable = () => {
      const t = textRef.current;
      if (!t) return;
      const lines = t.split('\n').filter((l) => l.trim());
      const sep = lines[0]!.includes('\t') ? '\t' : ',';
      const rows = lines.map((l) => l.split(sep).map((c) => c.trim()));
      if (rows.length < 2) {
        showAlert('Need at least a header + 1 data row', 'danger');
        return;
      }
      const widths = rows[0]!.map((_, i) => Math.max(...rows.map((r) => (r[i] ?? '').length)));
      const header = '| ' + rows[0]!.map((c, i) => c.padEnd(widths[i] ?? 0)).join(' | ') + ' |';
      const divider = '| ' + widths.map((w) => '-'.repeat(w)).join(' | ') + ' |';
      const body = rows
        .slice(1)
        .map((r) => '| ' + r.map((c, i) => (c || '').padEnd(widths[i] || 0)).join(' | ') + ' |')
        .join('\n');
      setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: `${header}\n${divider}\n${body}`,
      }));
      setAiResult({ label: 'Result', result: `${header}\n${divider}\n${body}` });
      setPreviewMode('result');
      showAlert('Text converted to table', 'success');
    };

    const handleExtractEmails = () => {
      const t = textRef.current;
      if (!t) return;
      const emails = [...new Set(t.match(/[\w.+-]+@[\w-]+\.[\w.]+/g) || [])];
      setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: emails.length ? emails.join('\n') : 'No email addresses found',
      }));
      setAiResult({ label: 'Result', result: emails.length ? emails.join('\n') : 'No email addresses found' });
      setPreviewMode('result');
      showAlert(`Found ${emails.length} email(s)`, 'success');
    };

    const handleExtractUrls = () => {
      const t = textRef.current;
      if (!t) return;
      const urls = [...new Set(t.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/g) || [])];
      setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: urls.length ? urls.join('\n') : 'No URLs found',
      }));
      setAiResult({ label: 'Result', result: urls.length ? urls.join('\n') : 'No URLs found' });
      setPreviewMode('result');
      showAlert(`Found ${urls.length} URL(s)`, 'success');
    };

    const handleExtractNumbers = () => {
      const t = textRef.current;
      if (!t) return;
      const numbers = t.match(/-?\d+\.?\d*/g) || [];
      setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: numbers.length ? numbers.join('\n') : 'No numbers found',
      }));
      setAiResult({ label: 'Result', result: numbers.length ? numbers.join('\n') : 'No numbers found' });
      setPreviewMode('result');
      showAlert(`Found ${numbers.length} number(s)`, 'success');
    };

    const handleNanoidGen = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
      const gen = () =>
        Array.from(crypto.getRandomValues(new Uint8Array(21)), (b) => chars[b % 64]).join('');
      const result = Array.from({ length: 5 }, gen).join('\n');
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('Nano IDs generated', 'success');
    };

    const handleTimestampGen = () => {
      const now = new Date();
      const result = `Unix (s):  ${Math.floor(
        now.getTime() / 1000
      )}\nUnix (ms): ${now.getTime()}\nISO 8601:  ${now.toISOString()}\nRFC 2822:  ${now.toUTCString()}\nLocal:     ${now.toLocaleString()}`;
      setToolResults((prev) => ({ ...prev, [activeWorkspaceId]: result }));
      setAiResult({ label: 'Result', result: result });
      setPreviewMode('result');
      showAlert('Timestamps generated', 'success');
    };

    const handleUsernameGen = () => {
      const t = (textRef.current || '').trim() || 'user';
      const words = t.toLowerCase().split(/\s+/);
      const combos = [
        words.join('_'),
        words.join('.'),
        (words[0] ?? '') + '_' + Math.floor(Math.random() * 999),
        words.join('') + Math.floor(Math.random() * 99),
        (words[0]?.[0] ?? '') + '_' + (words[1] ?? words[0] ?? '') + '_' + Math.floor(Math.random() * 99),
        words.map((w) => w[0] ?? '').join('') + '_' + Math.floor(Math.random() * 9999),
        (words[0] ?? '') + '.codes',
        'the_' + (words[0] ?? ''),
        (words[0] ?? '') + '_dev',
        words.reverse().join('_'),
      ];
      setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: [...new Set(combos)].join('\n'),
      }));
      setAiResult({ label: 'Result', result: [...new Set(combos)].join('\n') });
      setPreviewMode('result');
      showAlert('Usernames generated', 'success');
    };

    const handlePlaceholderImg = () => {
      const t = (textRef.current || '').trim() || '800x600';
      const match = t.match(/(\d+)\s*[x\u00d7]\s*(\d+)/);
      const w = match ? match[1] : '800',
        h = match ? match[2] : '600';
      const urls = [
        `https://placehold.co/${w}x${h}`,
        `https://placehold.co/${w}x${h}/png`,
        `https://placehold.co/${w}x${h}/gray/white`,
        `https://placehold.co/${w}x${h}/000/fff?text=Placeholder`,
      ];
      setToolResults((prev) => ({
        ...prev,
        [activeWorkspaceId]: urls.join('\n'),
      }));
      setAiResult({ label: 'Result', result: urls.join('\n') });
      setPreviewMode('result');
      showAlert('Placeholder URLs generated', 'success');
    };

    const handleJwtDecode = () => {
      const t = textRef.current;
      if (!t) return;
      const original = t;
      setLocalLoading(true);
      try {
        const cleaned = t.trim().replace(/\s+/g, '');
        const parts = cleaned.split('.');
        if (parts.length !== 3) throw new Error('Invalid JWT: expected 3 dot-separated parts');
        const decode = (s: string, label: string) => {
          if (!/^[A-Za-z0-9_-]+$/.test(s)) throw new Error(`Invalid characters in JWT ${label}`);
          const padded = s + '='.repeat((4 - (s.length % 4)) % 4);
          let binary;
          try {
            binary = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
          } catch {
            throw new Error(`Invalid base64 in JWT ${label}`);
          }
          const jsonStr = new TextDecoder().decode(Uint8Array.from(binary, (c: string) => c.charCodeAt(0)));
          try {
            return JSON.parse(jsonStr);
          } catch {
            throw new Error(`JWT ${label} is not valid JSON`);
          }
        };
        const header = decode(parts[0]!, 'header');
        const payload = decode(parts[1]!, 'payload');
        const result = `=== HEADER ===\n${JSON.stringify(
          header,
          null,
          2
        )}\n\n=== PAYLOAD ===\n${JSON.stringify(payload, null, 2)}`;
        setAiResult({ label: 'JWT Decoded', result });
        setPreviewMode('result');
        pushHistory('JWT Decoded', original, result, {
          toolId: 'jwt_decode',
          toolType: 'local',
        });
        showAlert('JWT decoded', 'success');
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Invalid JWT token';
        showAlert(msg, 'danger');
      } finally {
        setLocalLoading(false);
      }
    };

    return {
      handleFrequencyAnalysis,
      handleFormatSql,
      handleFormatXml,
      handleJsonMinify,
      handleJsonToTs,
      handleUuidGen,
      handleTimestampConvert,
      handleColorConvert,
      handleUlidGen,
      handleCronExplain,
      handleHttpHeaderParse,
      handleUrlParser,
      handleSlugGenerator,
      handleReadingLevel,
      handleReadingTime,
      handleCharCount,
      handleTextStats,
      handleDuplicateWords,
      handleOverusedWords,
      handleNumToWords,
      handleWordsToNum,
      handleRomanNumeral,
      handleQrFromText,
      handleMdToHtml,
      handleTextToTable,
      handleExtractEmails,
      handleExtractUrls,
      handleExtractNumbers,
      handleNanoidGen,
      handleTimestampGen,
      handleUsernameGen,
      handlePlaceholderImg,
      handleJwtDecode,
    };
  }, [
    textRef,
    setToolResults,
    setPreviewMode,
    setLocalLoading,
    showAlert,
    activeWorkspaceId,
    setAiResult,
    pushHistory,
  ]);
}
