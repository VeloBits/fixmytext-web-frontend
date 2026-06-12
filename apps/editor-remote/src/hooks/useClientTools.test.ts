import { renderHook } from '@testing-library/react';
import useClientTools from './useClientTools';

// Top-level mocks for dynamic imports used by handlers
vi.mock('sql-formatter', () => ({
  format: vi.fn((t: string) => `formatted:${t}`),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async () => 'data:image/png;base64,fakeqr'),
  },
}));

const EXPECTED_KEYS = [
  'handleFrequencyAnalysis',
  'handleFormatSql',
  'handleFormatXml',
  'handleJsonMinify',
  'handleJsonToTs',
  'handleUuidGen',
  'handleTimestampConvert',
  'handleColorConvert',
  'handleUlidGen',
  'handleCronExplain',
  'handleHttpHeaderParse',
  'handleUrlParser',
  'handleSlugGenerator',
  'handleReadingLevel',
  'handleReadingTime',
  'handleCharCount',
  'handleTextStats',
  'handleDuplicateWords',
  'handleOverusedWords',
  'handleNumToWords',
  'handleWordsToNum',
  'handleRomanNumeral',
  'handleQrFromText',
  'handleMdToHtml',
  'handleTextToTable',
  'handleExtractEmails',
  'handleExtractUrls',
  'handleExtractNumbers',
  'handleNanoidGen',
  'handleTimestampGen',
  'handleUsernameGen',
  'handlePlaceholderImg',
  'handleJwtDecode',
];

function setup(textValue = '') {
  const props = {
    textRef: { current: textValue },
    setToolResults: vi.fn((fn) => fn({})),
    setPreviewMode: vi.fn(),
    setLocalLoading: vi.fn(),
    showAlert: vi.fn(),
    activeWorkspaceId: 'ws-1',
    setAiResult: vi.fn(),
    pushHistory: vi.fn(),
  };
  const { result } = renderHook(() => useClientTools(props));
  return { handlers: result.current, ...props };
}

describe('useClientTools', () => {
  it('returns all expected handler keys', () => {
    const { handlers } = setup();
    expect(Object.keys(handlers).sort()).toEqual([...EXPECTED_KEYS].sort());
    for (const key of EXPECTED_KEYS) {
      expect(typeof (handlers as Record<string, unknown>)[key]).toBe('function');
    }
  });

  describe('handleUuidGen', () => {
    it('generates 5 UUIDs and calls setToolResults and setPreviewMode', () => {
      let callCount = 0;
      const fakeCrypto = {
        randomUUID: () => `fake-uuid-${++callCount}`,
        getRandomValues: globalThis.crypto?.getRandomValues?.bind(globalThis.crypto),
      };
      const original = globalThis.crypto;
      Object.defineProperty(globalThis, 'crypto', {
        value: fakeCrypto,
        writable: true,
        configurable: true,
      });

      try {
        const { handlers, setToolResults, setPreviewMode } = setup();
        handlers.handleUuidGen();

        expect(setToolResults).toHaveBeenCalledTimes(1);
        const updater = setToolResults.mock.calls[0]![0]!;
        const result = updater({});
        const uuids = result['ws-1'].split('\n');
        expect(uuids).toHaveLength(5);
        expect(uuids[0]).toBe('fake-uuid-1');
        expect(uuids[4]).toBe('fake-uuid-5');

        expect(setPreviewMode).toHaveBeenCalledWith('result');
      } finally {
        Object.defineProperty(globalThis, 'crypto', {
          value: original,
          writable: true,
          configurable: true,
        });
      }
    });
  });

  describe('handleJsonMinify', () => {
    it('minifies valid JSON and calls setToolResults', () => {
      const { handlers, setToolResults, showAlert } = setup('{ "a": 1,  "b": 2 }');
      handlers.handleJsonMinify();

      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('{"a":1,"b":2}');
      expect(showAlert).toHaveBeenCalledWith('JSON minified', 'success');
    });

    it('calls showAlert with danger on invalid JSON', () => {
      const { handlers, showAlert, setToolResults } = setup('not json {{{');
      handlers.handleJsonMinify();

      expect(showAlert).toHaveBeenCalledWith('Invalid JSON input', 'danger');
      expect(setToolResults).not.toHaveBeenCalled();
    });
  });

  describe('handleCharCount', () => {
    it('counts characters correctly', () => {
      const text = 'Hello world. Goodbye world.';
      const { handlers, setToolResults } = setup(text);
      handlers.handleCharCount();

      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      const output = result['ws-1'];

      expect(output).toContain(`Characters:     ${text.length}`);
      expect(output).toContain('Words:          4');
      expect(output).toContain('Sentences:      2');
      expect(output).toContain('Lines:          1');
    });
  });

  describe('handleExtractEmails', () => {
    it('extracts emails from text', () => {
      const text = 'Contact alice@example.com or bob@test.org for info.';
      const { handlers, setToolResults, showAlert } = setup(text);
      handlers.handleExtractEmails();

      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      const emails = result['ws-1'].split('\n');
      expect(emails).toContain('alice@example.com');
      expect(emails).toContain('bob@test.org');
      expect(showAlert).toHaveBeenCalledWith('Found 2 email(s)', 'success');
    });
  });

  describe('handleColorConvert', () => {
    it('converts hex color to RGB and HSL', () => {
      const { handlers, setToolResults } = setup('#FF5733');
      handlers.handleColorConvert();

      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      const output = result['ws-1'];

      expect(output).toContain('HEX: #FF5733');
      expect(output).toContain('RGB: rgb(255, 87, 51)');
      expect(output).toMatch(/HSL: hsl\(\d+, \d+%, \d+%\)/);
    });
  });

  describe('handleTimestampConvert', () => {
    it('converts a Unix timestamp (seconds)', () => {
      // 1700000000 => 2023-11-14T22:13:20.000Z
      const { handlers, setToolResults, showAlert } = setup('1700000000');
      handlers.handleTimestampConvert();

      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      const output = result['ws-1'];

      expect(output).toContain('Unix (s):  1700000000');
      expect(output).toContain('Unix (ms): 1700000000000');
      expect(output).toContain('ISO 8601:  2023-11-14T22:13:20.000Z');
      expect(showAlert).toHaveBeenCalledWith('Timestamp converted', 'success');
    });
  });

  describe('handler with empty textRef.current', () => {
    it('does nothing when textRef.current is empty', () => {
      const { handlers, setToolResults, setPreviewMode, showAlert } = setup('');
      handlers.handleExtractEmails();

      expect(setToolResults).not.toHaveBeenCalled();
      expect(setPreviewMode).not.toHaveBeenCalled();
      expect(showAlert).not.toHaveBeenCalled();
    });
  });

  describe('handleFrequencyAnalysis', () => {
    it('produces letter frequency output', () => {
      const { handlers, setToolResults, showAlert } = setup('aabbc');
      handlers.handleFrequencyAnalysis();

      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      const output = result['ws-1'];

      expect(output).toContain('Total letters: 5');
      expect(output).toMatch(/A\s+2/);
      expect(output).toMatch(/B\s+2/);
      expect(output).toMatch(/C\s+1/);
      expect(showAlert).toHaveBeenCalledWith('Frequency analysis complete', 'success');
    });
  });

  // ─── handleFormatSql ────────────────────────────────────────────────────────

  describe('handleFormatSql', () => {
    it('does nothing when textRef is empty', async () => {
      const { handlers, setPreviewMode, showAlert } = setup('');
      await handlers.handleFormatSql();
      expect(setPreviewMode).not.toHaveBeenCalled();
      expect(showAlert).not.toHaveBeenCalled();
    });

    it('formats SQL successfully', async () => {
      const { handlers, setPreviewMode, showAlert, setLocalLoading } = setup('select * from users');
      await handlers.handleFormatSql();
      expect(setLocalLoading).toHaveBeenCalledWith(true);
      expect(setLocalLoading).toHaveBeenCalledWith(false);
      expect(setPreviewMode).toHaveBeenCalledWith('result');
      expect(showAlert).toHaveBeenCalledWith('SQL formatted', 'success');
    });
  });

  // ─── handleFormatXml ────────────────────────────────────────────────────────

  describe('handleFormatXml', () => {
    it('does nothing when textRef is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleFormatXml();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('formats valid XML', () => {
      const { handlers, setPreviewMode, showAlert } = setup('<root><child>text</child></root>');
      handlers.handleFormatXml();
      expect(setPreviewMode).toHaveBeenCalledWith('result');
      expect(showAlert).toHaveBeenCalledWith('XML formatted', 'success');
    });

    it('shows error for invalid XML', () => {
      const { handlers, showAlert, setPreviewMode } = setup('<broken><<</broken>');
      handlers.handleFormatXml();
      expect(showAlert).toHaveBeenCalledWith('Invalid XML input', 'danger');
      expect(setPreviewMode).not.toHaveBeenCalled();
    });
  });

  // ─── handleJsonToTs ─────────────────────────────────────────────────────────

  describe('handleJsonToTs', () => {
    it('does nothing when textRef is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleJsonToTs();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('generates TypeScript interface for a flat object', () => {
      const { handlers, setToolResults, showAlert } = setup('{"name":"Alice","age":30}');
      handlers.handleJsonToTs();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('interface Root');
      expect(result['ws-1']).toContain('name: string');
      expect(result['ws-1']).toContain('age: number');
      expect(showAlert).toHaveBeenCalledWith('TypeScript interface generated', 'success');
    });

    it('handles null values in object', () => {
      const { handlers, setToolResults } = setup('{"val":null}');
      handlers.handleJsonToTs();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('val: null');
    });

    it('handles array values', () => {
      const { handlers, setToolResults } = setup('{"items":[1,2,3]}');
      handlers.handleJsonToTs();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('items');
    });

    it('handles empty arrays', () => {
      const { handlers, setToolResults } = setup('{"items":[]}');
      handlers.handleJsonToTs();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('any[]');
    });

    it('handles nested object', () => {
      const { handlers, setToolResults } = setup('{"user":{"id":1,"name":"Bob"}}');
      handlers.handleJsonToTs();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('interface Root');
    });

    it('shows danger alert for invalid JSON', () => {
      const { handlers, showAlert } = setup('{not valid}');
      handlers.handleJsonToTs();
      expect(showAlert).toHaveBeenCalledWith('Invalid JSON input', 'danger');
    });
  });

  // ─── handleTimestampConvert (extended) ──────────────────────────────────────

  describe('handleTimestampConvert extended', () => {
    it('converts a Unix timestamp in milliseconds', () => {
      const { handlers, setToolResults, showAlert } = setup('1700000000000');
      handlers.handleTimestampConvert();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Unix (ms): 1700000000000');
      expect(showAlert).toHaveBeenCalledWith('Timestamp converted', 'success');
    });

    it('converts "now" keyword', () => {
      const { handlers, setToolResults, showAlert } = setup('now');
      handlers.handleTimestampConvert();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('ISO 8601:');
      expect(showAlert).toHaveBeenCalledWith('Timestamp converted', 'success');
    });

    it('converts ISO date string', () => {
      const { handlers, setToolResults } = setup('2024-01-15T12:00:00Z');
      handlers.handleTimestampConvert();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('ISO 8601:');
    });

    it('handles invalid timestamp with danger alert', () => {
      const { handlers, showAlert, setPreviewMode } = setup('not-a-timestamp');
      handlers.handleTimestampConvert();
      expect(showAlert).toHaveBeenCalledWith('Could not parse date/timestamp', 'danger');
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('reports invalid line but converts valid ones when mixed', () => {
      const { handlers, showAlert } = setup('1700000000\nnot-valid');
      handlers.handleTimestampConvert();
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('1/2'), 'success');
    });

    it('does nothing when text is whitespace-only', () => {
      const { handlers, setPreviewMode } = setup('   ');
      handlers.handleTimestampConvert();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });
  });

  // ─── handleColorConvert (extended) ──────────────────────────────────────────

  describe('handleColorConvert extended', () => {
    it('converts RGB color', () => {
      const { handlers, setToolResults, showAlert } = setup('rgb(255, 0, 0)');
      handlers.handleColorConvert();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('HEX: #FF0000');
      expect(showAlert).toHaveBeenCalledWith('Color converted', 'success');
    });

    it('handles invalid color input', () => {
      const { handlers, showAlert, setPreviewMode } = setup('not-a-color');
      handlers.handleColorConvert();
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('HEX'), 'danger');
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('handles multiple color inputs', () => {
      const { handlers, showAlert } = setup('#FF0000\n#00FF00');
      handlers.handleColorConvert();
      expect(showAlert).toHaveBeenCalledWith('Converted 2/2 colors', 'success');
    });

    it('does nothing when text is whitespace-only', () => {
      const { handlers, setPreviewMode } = setup('   ');
      handlers.handleColorConvert();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });
  });

  // ─── handleCronExplain ──────────────────────────────────────────────────────

  describe('handleCronExplain', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('   ');
      handlers.handleCronExplain();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('explains a simple cron expression', () => {
      const { handlers, setToolResults, showAlert } = setup('0 12 * * *');
      handlers.handleCronExplain();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('at minute 0');
      expect(showAlert).toHaveBeenCalledWith('Cron expression explained', 'success');
    });

    it('explains a cron with specific day-of-week', () => {
      const { handlers, setToolResults } = setup('0 9 * * 1');
      handlers.handleCronExplain();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Monday');
    });

    it('explains a cron with minute interval', () => {
      const { handlers, setToolResults } = setup('*/5 * * * *');
      handlers.handleCronExplain();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('every 5 minutes');
    });

    it('explains a cron with hour range', () => {
      const { handlers, setToolResults } = setup('0 9-17 * * *');
      handlers.handleCronExplain();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('through');
    });

    it('explains a cron with specific month and day', () => {
      const { handlers, setToolResults } = setup('0 0 1 1 *');
      handlers.handleCronExplain();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('on day 1');
      expect(result['ws-1']).toContain('in month 1');
    });

    it('explains multiple cron expressions', () => {
      const { handlers, showAlert } = setup('0 12 * * *\n*/5 * * * *');
      handlers.handleCronExplain();
      expect(showAlert).toHaveBeenCalledWith('Explained 2/2 cron expressions', 'success');
    });

    it('shows error for invalid cron expression', () => {
      const { handlers, showAlert, setPreviewMode } = setup('not a cron');
      handlers.handleCronExplain();
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('valid cron'), 'danger');
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('explains day-of-week range', () => {
      const { handlers, setToolResults } = setup('0 9 * * 1-5');
      handlers.handleCronExplain();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Monday');
    });

    it('explains comma-separated days', () => {
      const { handlers, setToolResults } = setup('0 9 * * 1,3,5');
      handlers.handleCronExplain();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Monday');
    });
  });

  // ─── handleHttpHeaderParse ──────────────────────────────────────────────────

  describe('handleHttpHeaderParse', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleHttpHeaderParse();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('parses HTTP headers into a markdown table', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'Content-Type: application/json\nAuthorization: Bearer token123'
      );
      handlers.handleHttpHeaderParse();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Content-Type');
      expect(result['ws-1']).toContain('application/json');
      expect(result['ws-1']).toContain('Authorization');
      expect(showAlert).toHaveBeenCalledWith('HTTP headers parsed', 'success');
    });
  });

  // ─── handleUrlParser ────────────────────────────────────────────────────────

  describe('handleUrlParser', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleUrlParser();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('parses a valid URL', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'https://example.com:8080/path?foo=bar#section'
      );
      handlers.handleUrlParser();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Protocol: https:');
      expect(result['ws-1']).toContain('Host:     example.com');
      expect(result['ws-1']).toContain('Port:     8080');
      expect(result['ws-1']).toContain('Path:     /path');
      expect(result['ws-1']).toContain('foo = bar');
      expect(showAlert).toHaveBeenCalledWith('URL parsed', 'success');
    });

    it('parses a URL without port', () => {
      const { handlers, setToolResults } = setup('https://example.com/');
      handlers.handleUrlParser();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('(default)');
    });

    it('shows danger for an invalid URL', () => {
      const { handlers, showAlert, setPreviewMode } = setup('not a url');
      handlers.handleUrlParser();
      expect(showAlert).toHaveBeenCalledWith('Invalid URL', 'danger');
      expect(setPreviewMode).not.toHaveBeenCalled();
    });
  });

  // ─── handleSlugGenerator ────────────────────────────────────────────────────

  describe('handleSlugGenerator', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleSlugGenerator();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('generates a URL slug from text', () => {
      const { handlers, setToolResults, showAlert } = setup('Hello World! This is a Test');
      handlers.handleSlugGenerator();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toMatch(/^[a-z0-9-]+$/);
      expect(showAlert).toHaveBeenCalledWith('URL slug generated', 'success');
    });

    it('removes stop words', () => {
      const { handlers, setToolResults } = setup('the quick and the dead');
      handlers.handleSlugGenerator();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).not.toContain('the');
      expect(result['ws-1']).toContain('quick');
    });
  });

  // ─── handleReadingLevel ─────────────────────────────────────────────────────

  describe('handleReadingLevel', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleReadingLevel();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('computes reading level analysis', () => {
      const text =
        'The quick brown fox jumps over the lazy dog. This is a simple sentence. Words matter greatly here.';
      const { handlers, setToolResults, showAlert } = setup(text);
      handlers.handleReadingLevel();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Flesch Score:');
      expect(result['ws-1']).toContain('Grade Level:');
      expect(result['ws-1']).toContain('Reading Time:');
      expect(showAlert).toHaveBeenCalledWith('Reading level analyzed', 'success');
    });
  });

  // ─── handleReadingTime ──────────────────────────────────────────────────────

  describe('handleReadingTime', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleReadingTime();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('estimates reading time', () => {
      const text = Array(300).fill('word').join(' ');
      const { handlers, setToolResults, showAlert } = setup(text);
      handlers.handleReadingTime();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Reading Time:');
      expect(result['ws-1']).toContain('Words: 300');
      expect(showAlert).toHaveBeenCalledWith('Reading time estimated', 'success');
    });
  });

  // ─── handleTextStats ────────────────────────────────────────────────────────

  describe('handleTextStats', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleTextStats();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('computes text statistics', () => {
      const { handlers, setToolResults, showAlert } = setup('hello world hello foo');
      handlers.handleTextStats();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Total Words:');
      expect(result['ws-1']).toContain('Unique Words:');
      expect(result['ws-1']).toContain('Vocabulary Ratio:');
      expect(showAlert).toHaveBeenCalledWith('Text statistics computed', 'success');
    });
  });

  // ─── handleDuplicateWords ───────────────────────────────────────────────────

  describe('handleDuplicateWords', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleDuplicateWords();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('finds duplicate words', () => {
      const { handlers, setToolResults, showAlert } = setup('hello world hello');
      handlers.handleDuplicateWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('hello: 2×');
      expect(showAlert).toHaveBeenCalledWith('Duplicate words found', 'success');
    });

    it('reports no duplicates when all words are unique', () => {
      const { handlers, setToolResults } = setup('alpha beta gamma');
      handlers.handleDuplicateWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('No duplicate words found!');
    });
  });

  // ─── handleOverusedWords ────────────────────────────────────────────────────

  describe('handleOverusedWords', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleOverusedWords();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('detects overused content words', () => {
      // Repeat a content word many times so it exceeds the 3% threshold.
      const text = Array(40).fill('amazing').concat(Array(10).fill('content')).join(' ');
      const { handlers, setToolResults, showAlert } = setup(text);
      handlers.handleOverusedWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('amazing');
      expect(showAlert).toHaveBeenCalledWith('Overused words analyzed', 'success');
    });

    it('reports no overused words when none exceed threshold', () => {
      const { handlers, setToolResults } = setup('alpha beta gamma delta epsilon');
      handlers.handleOverusedWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('No overused words detected!');
    });
  });

  // ─── handleNumToWords ───────────────────────────────────────────────────────

  describe('handleNumToWords', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleNumToWords();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('converts zero to "zero"', () => {
      const { handlers, setToolResults } = setup('0');
      handlers.handleNumToWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('zero');
    });

    it('converts a simple number', () => {
      const { handlers, setToolResults, showAlert } = setup('42');
      handlers.handleNumToWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('forty');
      expect(result['ws-1']).toContain('two');
      expect(showAlert).toHaveBeenCalledWith('Number converted to words', 'success');
    });

    it('converts hundreds', () => {
      const { handlers, setToolResults } = setup('200');
      handlers.handleNumToWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('two hundred');
    });

    it('converts thousands', () => {
      const { handlers, setToolResults } = setup('1000');
      handlers.handleNumToWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('thousand');
    });

    it('converts millions', () => {
      const { handlers, setToolResults } = setup('1000000');
      handlers.handleNumToWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('million');
    });

    it('converts billions', () => {
      const { handlers, setToolResults } = setup('2000000000');
      handlers.handleNumToWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('billion');
    });

    it('converts negative number', () => {
      const { handlers, setToolResults } = setup('-5');
      handlers.handleNumToWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('negative');
    });

    it('shows danger alert for non-numeric input', () => {
      const { handlers, showAlert, setPreviewMode } = setup('not a number');
      handlers.handleNumToWords();
      expect(showAlert).toHaveBeenCalledWith('Enter a valid number', 'danger');
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('handles comma-formatted numbers', () => {
      const { handlers, setToolResults } = setup('1,000');
      handlers.handleNumToWords();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('thousand');
    });
  });

  // ─── handleWordsToNum ───────────────────────────────────────────────────────

  describe('handleWordsToNum', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleWordsToNum();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('converts "forty-two" to 42', () => {
      const { handlers, setToolResults, showAlert } = setup('forty-two');
      handlers.handleWordsToNum();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('42');
      expect(showAlert).toHaveBeenCalledWith('Words converted to number', 'success');
    });

    it('converts "one hundred"', () => {
      const { handlers, setToolResults } = setup('one hundred');
      handlers.handleWordsToNum();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(Number(result['ws-1'])).toBeGreaterThan(0);
    });

    it('converts "one thousand"', () => {
      const { handlers, setToolResults } = setup('one thousand');
      handlers.handleWordsToNum();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(Number(result['ws-1'])).toBeGreaterThan(0);
    });

    it('ignores "and"', () => {
      const { handlers, setToolResults } = setup('twenty and one');
      handlers.handleWordsToNum();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      // Should not crash, result is a number string
      expect(typeof result['ws-1']).toBe('string');
    });
  });

  // ─── handleRomanNumeral ─────────────────────────────────────────────────────

  describe('handleRomanNumeral', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleRomanNumeral();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('converts integer to Roman numeral', () => {
      const { handlers, setToolResults, showAlert } = setup('2024');
      handlers.handleRomanNumeral();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toMatch(/^[MDCLXVI]+$/);
      expect(showAlert).toHaveBeenCalledWith('Roman numeral converted', 'success');
    });

    it('converts Roman numeral to integer', () => {
      const { handlers, setToolResults } = setup('XIV');
      handlers.handleRomanNumeral();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('14');
    });

    it('converts subtractive notation (IX = 9)', () => {
      const { handlers, setToolResults } = setup('IX');
      handlers.handleRomanNumeral();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('9');
    });
  });

  // ─── handleQrFromText ───────────────────────────────────────────────────────

  describe('handleQrFromText', () => {
    it('does nothing when text is empty', async () => {
      const { handlers, setPreviewMode } = setup('');
      await handlers.handleQrFromText();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('generates QR code data URL', async () => {
      const { handlers, setToolResults, showAlert } = setup('https://example.com');
      await handlers.handleQrFromText();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('[QR Code Generated]');
      expect(showAlert).toHaveBeenCalledWith('QR code generated', 'success');
    });
  });

  // ─── handleMdToHtml ─────────────────────────────────────────────────────────

  describe('handleMdToHtml', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleMdToHtml();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('converts markdown headings to HTML', () => {
      const { handlers, setToolResults, showAlert } = setup('# Heading 1\n## Heading 2\n### Heading 3');
      handlers.handleMdToHtml();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('<h1>Heading 1</h1>');
      expect(result['ws-1']).toContain('<h2>Heading 2</h2>');
      expect(result['ws-1']).toContain('<h3>Heading 3</h3>');
      expect(showAlert).toHaveBeenCalledWith('Markdown converted to HTML', 'success');
    });

    it('converts markdown bold and italic', () => {
      const { handlers, setToolResults } = setup('**bold** and *italic*');
      handlers.handleMdToHtml();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('<strong>bold</strong>');
      expect(result['ws-1']).toContain('<em>italic</em>');
    });

    it('converts inline code', () => {
      const { handlers, setToolResults } = setup('use `console.log()` here');
      handlers.handleMdToHtml();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('<code>console.log()</code>');
    });

    it('converts list items', () => {
      const { handlers, setToolResults } = setup('- item one\n- item two');
      handlers.handleMdToHtml();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('<li>item one</li>');
    });

    it('converts numbered list items', () => {
      const { handlers, setToolResults } = setup('1. first\n2. second');
      handlers.handleMdToHtml();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('<li>first</li>');
    });
  });

  // ─── handleTextToTable ──────────────────────────────────────────────────────

  describe('handleTextToTable', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleTextToTable();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('converts CSV to markdown table', () => {
      const { handlers, setToolResults, showAlert } = setup('Name,Age\nAlice,30\nBob,25');
      handlers.handleTextToTable();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('| Name');
      expect(result['ws-1']).toContain('| Age');
      expect(result['ws-1']).toContain('Alice');
      expect(showAlert).toHaveBeenCalledWith('Text converted to table', 'success');
    });

    it('converts tab-separated data', () => {
      const { handlers, setToolResults } = setup('Name\tAge\nAlice\t30');
      handlers.handleTextToTable();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Name');
    });

    it('shows danger when only header row (no data rows)', () => {
      const { handlers, showAlert, setPreviewMode } = setup('Name,Age');
      handlers.handleTextToTable();
      expect(showAlert).toHaveBeenCalledWith('Need at least a header + 1 data row', 'danger');
      expect(setPreviewMode).not.toHaveBeenCalled();
    });
  });

  // ─── handleExtractUrls ──────────────────────────────────────────────────────

  describe('handleExtractUrls', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleExtractUrls();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('extracts URLs from text', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'Visit https://example.com or http://foo.org for more.'
      );
      handlers.handleExtractUrls();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('https://example.com');
      expect(result['ws-1']).toContain('http://foo.org');
      expect(showAlert).toHaveBeenCalledWith('Found 2 URL(s)', 'success');
    });

    it('reports "No URLs found" when none present', () => {
      const { handlers, setToolResults } = setup('plain text with no urls');
      handlers.handleExtractUrls();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('No URLs found');
    });
  });

  // ─── handleExtractNumbers ───────────────────────────────────────────────────

  describe('handleExtractNumbers', () => {
    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleExtractNumbers();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('extracts numbers from text', () => {
      const { handlers, setToolResults, showAlert } = setup('I have 3 cats and 12.5 dogs');
      handlers.handleExtractNumbers();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('3');
      expect(result['ws-1']).toContain('12.5');
      expect(showAlert).toHaveBeenCalledWith('Found 2 number(s)', 'success');
    });

    it('reports "No numbers found" when none present', () => {
      const { handlers, setToolResults } = setup('no numbers here');
      handlers.handleExtractNumbers();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toBe('No numbers found');
    });
  });

  // ─── handleNanoidGen ────────────────────────────────────────────────────────

  describe('handleNanoidGen', () => {
    it('generates 5 Nano IDs', () => {
      const { handlers, setToolResults, showAlert } = setup();
      handlers.handleNanoidGen();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      const ids = result['ws-1'].split('\n');
      expect(ids).toHaveLength(5);
      expect(showAlert).toHaveBeenCalledWith('Nano IDs generated', 'success');
    });
  });

  // ─── handleTimestampGen ─────────────────────────────────────────────────────

  describe('handleTimestampGen', () => {
    it('generates timestamp in multiple formats', () => {
      const { handlers, setToolResults, showAlert } = setup();
      handlers.handleTimestampGen();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('Unix (s):');
      expect(result['ws-1']).toContain('ISO 8601:');
      expect(result['ws-1']).toContain('RFC 2822:');
      expect(showAlert).toHaveBeenCalledWith('Timestamps generated', 'success');
    });
  });

  // ─── handleUsernameGen ──────────────────────────────────────────────────────

  describe('handleUsernameGen', () => {
    it('generates usernames from input text', () => {
      const { handlers, setToolResults, showAlert } = setup('john doe');
      handlers.handleUsernameGen();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('john');
      expect(showAlert).toHaveBeenCalledWith('Usernames generated', 'success');
    });

    it('generates usernames from empty text using fallback "user"', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handleUsernameGen();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(typeof result['ws-1']).toBe('string');
      expect(result['ws-1'].length).toBeGreaterThan(0);
    });
  });

  // ─── handlePlaceholderImg ───────────────────────────────────────────────────

  describe('handlePlaceholderImg', () => {
    it('generates placeholder URLs for given dimensions', () => {
      const { handlers, setToolResults, showAlert } = setup('1920x1080');
      handlers.handlePlaceholderImg();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('1920x1080');
      expect(showAlert).toHaveBeenCalledWith('Placeholder URLs generated', 'success');
    });

    it('uses default 800x600 when no valid dimension in text', () => {
      const { handlers, setToolResults } = setup('no dimensions here');
      handlers.handlePlaceholderImg();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('800x600');
    });

    it('falls back to 800x600 when text is empty', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handlePlaceholderImg();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      expect(result['ws-1']).toContain('800x600');
    });
  });

  // ─── handleJwtDecode ────────────────────────────────────────────────────────

  describe('handleJwtDecode', () => {
    // A minimal valid JWT with header {alg:"none"} and payload {sub:"1234"}
    const validJwt =
      'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0In0.';

    it('does nothing when text is empty', () => {
      const { handlers, setPreviewMode } = setup('');
      handlers.handleJwtDecode();
      expect(setPreviewMode).not.toHaveBeenCalled();
    });

    it('decodes a valid JWT', () => {
      const { handlers, setAiResult, showAlert, setLocalLoading } = setup(validJwt);
      handlers.handleJwtDecode();
      expect(setLocalLoading).toHaveBeenCalledWith(true);
      expect(setLocalLoading).toHaveBeenCalledWith(false);
      expect(setAiResult).toHaveBeenCalledWith(
        expect.objectContaining({ label: 'JWT Decoded' })
      );
      expect(showAlert).toHaveBeenCalledWith('JWT decoded', 'success');
    });

    it('shows danger for a token with wrong number of parts', () => {
      const { handlers, showAlert } = setup('only.two');
      handlers.handleJwtDecode();
      expect(showAlert).toHaveBeenCalledWith(
        expect.stringContaining('3 dot-separated'),
        'danger'
      );
    });

    it('shows danger for a token with invalid base64', () => {
      const { handlers, showAlert } = setup('not!!!.valid!!!.base64!!!');
      handlers.handleJwtDecode();
      expect(showAlert).toHaveBeenCalledWith(expect.any(String), 'danger');
    });

    it('shows danger for a token whose payload is not JSON', () => {
      // header and payload are valid base64url but payload decodes to plain text
      const header = btoa(JSON.stringify({ alg: 'none' }))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const notJson = btoa('this is not json')
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const { handlers, showAlert } = setup(`${header}.${notJson}.sig`);
      handlers.handleJwtDecode();
      expect(showAlert).toHaveBeenCalledWith(expect.any(String), 'danger');
    });
  });

  // ─── handleFrequencyAnalysis (extended) ─────────────────────────────────────

  describe('handleFrequencyAnalysis extended', () => {
    it('shows warning when text contains no letters', () => {
      const { handlers, showAlert, setPreviewMode } = setup('12345 !@#$%');
      handlers.handleFrequencyAnalysis();
      expect(showAlert).toHaveBeenCalledWith('No letters found to analyze', 'warning');
      expect(setPreviewMode).not.toHaveBeenCalled();
    });
  });

  // ─── handleUlidGen ──────────────────────────────────────────────────────────

  describe('handleUlidGen', () => {
    it('generates 5 ULIDs', () => {
      const { handlers, setToolResults, showAlert } = setup();
      handlers.handleUlidGen();
      const updater = setToolResults.mock.calls[0]![0]!;
      const result = updater({});
      const ulids = result['ws-1'].split('\n');
      expect(ulids).toHaveLength(5);
      expect(showAlert).toHaveBeenCalledWith('ULIDs generated', 'success');
    });
  });
});
