import { renderHook } from '@testing-library/react';
import useClientTools from './useClientTools';

vi.mock('sql-formatter', () => ({
  format: vi.fn((sql: string) => `FORMATTED: ${sql}`),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn(async () => 'data:image/png;base64,FAKE'),
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

    it('alerts when text has no letters', () => {
      const { handlers, showAlert } = setup('12345 !!!');
      handlers.handleFrequencyAnalysis();
      expect(showAlert).toHaveBeenCalledWith('No letters found to analyze', 'warning');
    });
  });

  describe('handleExtractUrls', () => {
    it('extracts URLs from text', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'Visit https://example.com and https://test.org for more.',
      );
      handlers.handleExtractUrls();
      const result = setToolResults.mock.calls[0]![0]!({});
      const urls = result['ws-1'].split('\n');
      expect(urls).toContain('https://example.com');
      expect(urls).toContain('https://test.org');
      expect(showAlert).toHaveBeenCalledWith('Found 2 URL(s)', 'success');
    });

    it('reports no URLs when none found', () => {
      const { handlers, setToolResults } = setup('plain text no urls here');
      handlers.handleExtractUrls();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('No URLs found');
    });
  });

  describe('handleExtractNumbers', () => {
    it('extracts numbers from text', () => {
      const { handlers, setToolResults, showAlert } = setup('I have 3 cats and 12.5 fish');
      handlers.handleExtractNumbers();
      const result = setToolResults.mock.calls[0]![0]!({});
      const nums = result['ws-1'].split('\n');
      expect(nums).toContain('3');
      expect(nums).toContain('12.5');
      expect(showAlert).toHaveBeenCalledWith('Found 2 number(s)', 'success');
    });

    it('reports no numbers when none found', () => {
      const { handlers, setToolResults } = setup('no numbers here at all');
      handlers.handleExtractNumbers();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('No numbers found');
    });
  });

  describe('handleNanoidGen', () => {
    it('generates 5 nano IDs separated by newlines', () => {
      const { handlers, setToolResults, showAlert } = setup();
      handlers.handleNanoidGen();
      const result = setToolResults.mock.calls[0]![0]!({});
      const ids = result['ws-1'].split('\n');
      expect(ids).toHaveLength(5);
      expect(ids.every((id: string) => id.length === 21)).toBe(true);
      expect(showAlert).toHaveBeenCalledWith('Nano IDs generated', 'success');
    });
  });

  describe('handleTimestampGen', () => {
    it('generates timestamp output in multiple formats', () => {
      const { handlers, setToolResults, showAlert } = setup();
      handlers.handleTimestampGen();
      const result = setToolResults.mock.calls[0]![0]!({});
      const output = result['ws-1'];
      expect(output).toContain('Unix (s):');
      expect(output).toContain('Unix (ms):');
      expect(output).toContain('ISO 8601:');
      expect(showAlert).toHaveBeenCalledWith('Timestamps generated', 'success');
    });
  });

  describe('handleUsernameGen', () => {
    it('generates usernames from input text', () => {
      const { handlers, setToolResults, showAlert } = setup('john doe');
      handlers.handleUsernameGen();
      const result = setToolResults.mock.calls[0]![0]!({});
      const usernames = result['ws-1'].split('\n');
      expect(usernames.length).toBeGreaterThan(0);
      expect(usernames.some((u: string) => u.includes('john'))).toBe(true);
      expect(showAlert).toHaveBeenCalledWith('Usernames generated', 'success');
    });

    it('falls back to "user" when textRef is empty', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handleUsernameGen();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('user');
    });
  });

  describe('handlePlaceholderImg', () => {
    it('generates placeholder URLs for given dimensions', () => {
      const { handlers, setToolResults, showAlert } = setup('320x240');
      handlers.handlePlaceholderImg();
      const result = setToolResults.mock.calls[0]![0]!({});
      const urls = result['ws-1'].split('\n');
      expect(urls.some((u: string) => u.includes('320x240'))).toBe(true);
      expect(showAlert).toHaveBeenCalledWith('Placeholder URLs generated', 'success');
    });

    it('defaults to 800x600 when no dimension input', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handlePlaceholderImg();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('800x600');
    });
  });

  describe('handleJwtDecode', () => {
    const EXAMPLE_JWT =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
      '.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ' +
      '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

    it('decodes a valid JWT and shows header and payload', () => {
      const { handlers, setPreviewMode, showAlert } = setup(EXAMPLE_JWT);
      handlers.handleJwtDecode();
      expect(setPreviewMode).toHaveBeenCalledWith('result');
      expect(showAlert).toHaveBeenCalledWith('JWT decoded', 'success');
    });

    it('shows error when JWT does not have 3 parts', () => {
      const { handlers, showAlert } = setup('only.two');
      handlers.handleJwtDecode();
      expect(showAlert).toHaveBeenCalledWith(
        expect.stringContaining('Invalid JWT'),
        'danger',
      );
    });

    it('shows error when input is empty', () => {
      const { handlers, showAlert, setPreviewMode } = setup('');
      handlers.handleJwtDecode();
      expect(setPreviewMode).not.toHaveBeenCalled();
      expect(showAlert).not.toHaveBeenCalled();
    });
  });

  describe('handleTextToTable', () => {
    it('converts CSV text to a markdown table', () => {
      const { handlers, setToolResults, showAlert } = setup('Name,Age\nAlice,30\nBob,25');
      handlers.handleTextToTable();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Alice');
      expect(result['ws-1']).toContain('Bob');
      expect(showAlert).toHaveBeenCalledWith('Text converted to table', 'success');
    });

    it('converts tab-separated text to a markdown table', () => {
      const { handlers, setToolResults } = setup('Name\tAge\nAlice\t30');
      handlers.handleTextToTable();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Alice');
    });

    it('alerts when fewer than 2 rows', () => {
      const { handlers, showAlert } = setup('just one line');
      handlers.handleTextToTable();
      expect(showAlert).toHaveBeenCalledWith(
        'Need at least a header + 1 data row',
        'danger',
      );
    });
  });

  describe('handleHttpHeaderParse', () => {
    it('parses HTTP headers into a table', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'Content-Type: application/json\nAuthorization: Bearer token123',
      );
      handlers.handleHttpHeaderParse();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Content-Type');
      expect(result['ws-1']).toContain('application/json');
      expect(showAlert).toHaveBeenCalledWith('HTTP headers parsed', 'success');
    });
  });

  describe('handleUrlParser', () => {
    it('parses a valid URL into components', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'https://example.com:8080/path?foo=bar#section',
      );
      handlers.handleUrlParser();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('https:');
      expect(result['ws-1']).toContain('example.com');
      expect(showAlert).toHaveBeenCalledWith('URL parsed', 'success');
    });

    it('alerts on invalid URL', () => {
      const { handlers, showAlert } = setup('not a url at all %%invalid');
      handlers.handleUrlParser();
      expect(showAlert).toHaveBeenCalledWith('Invalid URL', 'danger');
    });
  });

  describe('handleSlugGenerator', () => {
    it('converts text to a URL slug', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'The Quick Brown Fox Jumps Over The Lazy Dog',
      );
      handlers.handleSlugGenerator();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('quick-brown-fox-jumps-over-lazy-dog');
      expect(showAlert).toHaveBeenCalledWith('URL slug generated', 'success');
    });
  });

  describe('handleReadingLevel', () => {
    it('analyzes reading level of text', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'The cat sat on the mat. The dog ran fast.',
      );
      handlers.handleReadingLevel();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Reading Level Analysis');
      expect(result['ws-1']).toContain('Flesch Score');
      expect(showAlert).toHaveBeenCalledWith('Reading level analyzed', 'success');
    });
  });

  describe('handleReadingTime', () => {
    it('estimates reading time for given text', () => {
      const words = Array.from({ length: 238 }, (_, i) => `word${i}`).join(' ');
      const { handlers, setToolResults, showAlert } = setup(words);
      handlers.handleReadingTime();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Reading Time');
      expect(result['ws-1']).toContain('1 min');
      expect(showAlert).toHaveBeenCalledWith('Reading time estimated', 'success');
    });
  });

  describe('handleTextStats', () => {
    it('computes statistics for given text', () => {
      const { handlers, setToolResults, showAlert } = setup(
        'Hello world. This is a test sentence.',
      );
      handlers.handleTextStats();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Text Statistics');
      expect(result['ws-1']).toContain('Total Words');
      expect(showAlert).toHaveBeenCalledWith('Text statistics computed', 'success');
    });
  });

  describe('handleDuplicateWords', () => {
    it('finds duplicate words in text', () => {
      const { handlers, setToolResults, showAlert } = setup('cat dog cat bird dog cat');
      handlers.handleDuplicateWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('cat');
      expect(result['ws-1']).toContain('dog');
      expect(showAlert).toHaveBeenCalledWith('Duplicate words found', 'success');
    });

    it('reports no duplicates when all words are unique', () => {
      const { handlers, setToolResults } = setup('one two three four five');
      handlers.handleDuplicateWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('No duplicate words found!');
    });
  });

  describe('handleOverusedWords', () => {
    it('detects overused words (above 3% frequency)', () => {
      const repeated = Array(15).fill('amazing').join(' ') + ' ' + Array(5).fill('other').join(' ');
      const { handlers, setToolResults, showAlert } = setup(repeated);
      handlers.handleOverusedWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('amazing');
      expect(showAlert).toHaveBeenCalledWith('Overused words analyzed', 'success');
    });

    it('reports no overused words for diverse text', () => {
      // Need >33 unique words so each appears at <3% frequency
      const diverseWords = [
        'apple', 'banana', 'cherry', 'dragon', 'elderberry', 'fig', 'grape',
        'honeydew', 'iris', 'jasmine', 'kiwi', 'lemon', 'mango', 'nectarine',
        'orange', 'papaya', 'quince', 'raspberry', 'strawberry', 'tangerine',
        'ugli', 'vanilla', 'watermelon', 'ximenia', 'yuzu', 'zucchini',
        'almond', 'blueberry', 'coconut', 'date', 'edamame', 'fennel',
        'guava', 'huckleberry',
      ].join(' ');
      const { handlers, setToolResults } = setup(diverseWords);
      handlers.handleOverusedWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('No overused words detected!');
    });
  });

  describe('handleNumToWords', () => {
    it('converts a number to words', () => {
      const { handlers, setToolResults, showAlert } = setup('42');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('forty-two');
      expect(showAlert).toHaveBeenCalledWith('Number converted to words', 'success');
    });

    it('alerts on invalid number input', () => {
      const { handlers, showAlert } = setup('not a number');
      handlers.handleNumToWords();
      expect(showAlert).toHaveBeenCalledWith('Enter a valid number', 'danger');
    });

    it('converts zero', () => {
      const { handlers, setToolResults } = setup('0');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('zero');
    });
  });

  // --- Additional branch coverage tests ---

  describe('handleFormatXml', () => {
    it('formats valid XML', () => {
      const { handlers, setToolResults, showAlert } = setup('<root><child>text</child></root>');
      handlers.handleFormatXml();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('root');
      expect(showAlert).toHaveBeenCalledWith('XML formatted', 'success');
    });

    it('alerts on invalid XML', () => {
      const { handlers, showAlert, setToolResults } = setup('<not valid xml <<>>');
      handlers.handleFormatXml();
      expect(showAlert).toHaveBeenCalledWith('Invalid XML input', 'danger');
      expect(setToolResults).not.toHaveBeenCalled();
    });

    it('does nothing when text is empty', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handleFormatXml();
      expect(setToolResults).not.toHaveBeenCalled();
    });
  });

  describe('handleJsonToTs', () => {
    it('generates a TypeScript interface from an object', () => {
      const { handlers, setToolResults, showAlert } = setup('{"name":"Alice","age":30}');
      handlers.handleJsonToTs();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('interface Root');
      expect(result['ws-1']).toContain('name:');
      expect(showAlert).toHaveBeenCalledWith('TypeScript interface generated', 'success');
    });

    it('handles an array input', () => {
      const { handlers, setToolResults } = setup('[{"id":1}]');
      handlers.handleJsonToTs();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('RootItem[]');
    });

    it('handles an empty array', () => {
      const { handlers, setToolResults } = setup('[]');
      handlers.handleJsonToTs();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('any[]');
    });

    it('handles a null value', () => {
      const { handlers, setToolResults } = setup('null');
      handlers.handleJsonToTs();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('null');
    });

    it('handles a primitive value (number)', () => {
      const { handlers, setToolResults } = setup('42');
      handlers.handleJsonToTs();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('number');
    });

    it('alerts on invalid JSON', () => {
      const { handlers, showAlert, setToolResults } = setup('{bad}');
      handlers.handleJsonToTs();
      expect(showAlert).toHaveBeenCalledWith('Invalid JSON input', 'danger');
      expect(setToolResults).not.toHaveBeenCalled();
    });
  });

  describe('handleTimestampConvert', () => {
    it('converts "now" keyword', () => {
      const { handlers, setToolResults, showAlert } = setup('now');
      handlers.handleTimestampConvert();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Unix (s):');
      expect(showAlert).toHaveBeenCalledWith('Timestamp converted', 'success');
    });

    it('converts a Unix millisecond timestamp', () => {
      const { handlers, setToolResults } = setup('1700000000000');
      handlers.handleTimestampConvert();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Unix (ms): 1700000000000');
    });

    it('converts an ISO date string', () => {
      const { handlers, setToolResults } = setup('2023-11-14');
      handlers.handleTimestampConvert();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Unix (s):');
    });

    it('alerts on unparseable input', () => {
      const { handlers, showAlert } = setup('not-a-date!!!');
      handlers.handleTimestampConvert();
      expect(showAlert).toHaveBeenCalledWith('Could not parse date/timestamp', 'danger');
    });

    it('shows multiple converted count when multiple inputs', () => {
      const { handlers, showAlert } = setup('1700000000\n1700000001');
      handlers.handleTimestampConvert();
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('2/2'), 'success');
    });
  });

  describe('handleColorConvert', () => {
    it('converts an RGB color', () => {
      const { handlers, setToolResults } = setup('rgb(255, 87, 51)');
      handlers.handleColorConvert();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('HEX:');
      expect(result['ws-1']).toContain('RGB: rgb(255, 87, 51)');
    });

    it('alerts on all-invalid input', () => {
      const { handlers, showAlert } = setup('notacolor');
      handlers.handleColorConvert();
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('HEX'), 'danger');
    });

    it('does nothing on empty input', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handleColorConvert();
      expect(setToolResults).not.toHaveBeenCalled();
    });

    it('shows count when multiple colors converted', () => {
      const { handlers, showAlert } = setup('#FF0000\n#00FF00');
      handlers.handleColorConvert();
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('2/2'), 'success');
    });
  });

  describe('handleCronExplain', () => {
    it('explains a simple cron expression', () => {
      const { handlers, setToolResults, showAlert } = setup('*/5 * * * *');
      handlers.handleCronExplain();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('every 5 minutes');
      expect(showAlert).toHaveBeenCalledWith('Cron expression explained', 'success');
    });

    it('explains specific minute and hour', () => {
      const { handlers, setToolResults } = setup('30 14 * * *');
      handlers.handleCronExplain();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('at minute 30');
      expect(result['ws-1']).toContain('at 14:00');
    });

    it('explains day of week', () => {
      const { handlers, setToolResults } = setup('0 9 * * 1,5');
      handlers.handleCronExplain();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('Monday');
    });

    it('explains hour range', () => {
      const { handlers, setToolResults } = setup('0 9-17 * * 1');
      handlers.handleCronExplain();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('during hours');
    });

    it('explains specific month and dom', () => {
      const { handlers, setToolResults } = setup('0 12 15 6 *');
      handlers.handleCronExplain();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('on day 15');
      expect(result['ws-1']).toContain('in month 6');
    });

    it('alerts on invalid cron (too few fields)', () => {
      const { handlers, showAlert } = setup('* * *');
      handlers.handleCronExplain();
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('valid cron'), 'danger');
    });

    it('does nothing on empty input', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handleCronExplain();
      expect(setToolResults).not.toHaveBeenCalled();
    });

    it('explains day-of-week range', () => {
      const { handlers, setToolResults } = setup('0 9 * * 1-5');
      handlers.handleCronExplain();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('through');
    });
  });

  describe('handleWordsToNum', () => {
    it('converts word numbers to numeric value', () => {
      const { handlers, setToolResults, showAlert } = setup('forty two');
      handlers.handleWordsToNum();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('42');
      expect(showAlert).toHaveBeenCalledWith('Words converted to number', 'success');
    });

    it('handles "and" connector word', () => {
      const { handlers, setToolResults } = setup('one hundred and five');
      handlers.handleWordsToNum();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('105');
    });

    it('does nothing on empty input', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handleWordsToNum();
      expect(setToolResults).not.toHaveBeenCalled();
    });
  });

  describe('handleRomanNumeral', () => {
    it('converts an integer to Roman numeral', () => {
      const { handlers, setToolResults, showAlert } = setup('42');
      handlers.handleRomanNumeral();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('XLII');
      expect(showAlert).toHaveBeenCalledWith('Roman numeral converted', 'success');
    });

    it('converts a Roman numeral to integer', () => {
      const { handlers, setToolResults } = setup('XIV');
      handlers.handleRomanNumeral();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('14');
    });

    it('does nothing on empty input', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handleRomanNumeral();
      expect(setToolResults).not.toHaveBeenCalled();
    });
  });

  describe('handleMdToHtml', () => {
    it('converts markdown to HTML', () => {
      const { handlers, setToolResults, showAlert } = setup('# Hello\n\n**bold** and *italic*');
      handlers.handleMdToHtml();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('<h1>Hello</h1>');
      expect(result['ws-1']).toContain('<strong>bold</strong>');
      expect(result['ws-1']).toContain('<em>italic</em>');
      expect(showAlert).toHaveBeenCalledWith('Markdown converted to HTML', 'success');
    });

    it('does nothing on empty input', () => {
      const { handlers, setToolResults } = setup('');
      handlers.handleMdToHtml();
      expect(setToolResults).not.toHaveBeenCalled();
    });
  });

  describe('handleExtractEmails', () => {
    it('reports no emails when none found', () => {
      const { handlers, setToolResults } = setup('no emails in this plain text');
      handlers.handleExtractEmails();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('No email addresses found');
    });
  });

  describe('handleNumToWords large numbers', () => {
    it('converts a billion', () => {
      const { handlers, setToolResults } = setup('1000000000');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('billion');
    });

    it('converts a million', () => {
      const { handlers, setToolResults } = setup('1000000');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('million');
    });

    it('converts a thousand', () => {
      const { handlers, setToolResults } = setup('1500');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('thousand');
    });

    it('converts a hundred', () => {
      const { handlers, setToolResults } = setup('300');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('hundred');
    });

    it('converts a negative number', () => {
      const { handlers, setToolResults } = setup('-5');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('negative');
    });

    it('converts a number in the teens', () => {
      const { handlers, setToolResults } = setup('13');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('thirteen');
    });

    it('converts a number in the tens', () => {
      const { handlers, setToolResults } = setup('25');
      handlers.handleNumToWords();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBe('twenty-five');
    });
  });

  describe('handleColorConvert branch coverage', () => {
    it('handles a green-dominant hex color (G is max)', () => {
      const { handlers, setToolResults } = setup('#00FF00');
      handlers.handleColorConvert();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('HEX: #00FF00');
    });

    it('handles a blue-dominant hex color (B is max)', () => {
      const { handlers, setToolResults } = setup('#0000FF');
      handlers.handleColorConvert();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('HEX: #0000FF');
    });

    it('handles a greyscale color (max === min)', () => {
      const { handlers, setToolResults } = setup('#808080');
      handlers.handleColorConvert();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('HEX: #808080');
    });

    it('handles a dark color (l <= 0.5)', () => {
      const { handlers, setToolResults } = setup('#200020');
      handlers.handleColorConvert();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('HEX:');
    });
  });

  describe('handleJsonToTs nested types', () => {
    it('handles a nested object (depth > 0)', () => {
      const { handlers, setToolResults } = setup('{"person":{"name":"Alice","age":30}}');
      handlers.handleJsonToTs();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('interface Root');
    });

    it('handles an array of objects', () => {
      const { handlers, setToolResults } = setup('[{"id":1,"name":"test"}]');
      handlers.handleJsonToTs();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('RootItem[]');
    });
  });

  describe('handleFormatSql', () => {
    it('formats valid SQL using the sql-formatter library', async () => {
      const { handlers, setToolResults, showAlert } = setup('SELECT * FROM users');
      await handlers.handleFormatSql();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('FORMATTED:');
      expect(showAlert).toHaveBeenCalledWith('SQL formatted', 'success');
    });

    it('alerts when sql-formatter throws', async () => {
      const { format } = await import('sql-formatter');
      vi.mocked(format).mockImplementationOnce(() => { throw new Error('bad sql'); });
      const { handlers, showAlert } = setup('BAD SQL!!!');
      await handlers.handleFormatSql();
      expect(showAlert).toHaveBeenCalledWith('Could not format SQL', 'danger');
    });

    it('does nothing on empty text', async () => {
      const { handlers, setToolResults } = setup('');
      await handlers.handleFormatSql();
      expect(setToolResults).not.toHaveBeenCalled();
    });
  });

  describe('handleQrFromText', () => {
    it('generates a QR code data URL from text', async () => {
      const { handlers, setToolResults, showAlert } = setup('https://example.com');
      await handlers.handleQrFromText();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toContain('QR Code Generated');
      expect(showAlert).toHaveBeenCalledWith('QR code generated', 'success');
    });

    it('does nothing on empty text', async () => {
      const { handlers, setToolResults } = setup('');
      await handlers.handleQrFromText();
      expect(setToolResults).not.toHaveBeenCalled();
    });
  });

  describe('handleWordsToNum multiplier branches', () => {
    it('converts using thousand multiplier (exercises the multiplier path)', () => {
      const { handlers, setToolResults, showAlert } = setup('one thousand');
      handlers.handleWordsToNum();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBeDefined();
      expect(showAlert).toHaveBeenCalledWith('Words converted to number', 'success');
    });

    it('converts using million multiplier', () => {
      const { handlers, setToolResults, showAlert } = setup('one million');
      handlers.handleWordsToNum();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).toBeDefined();
      expect(showAlert).toHaveBeenCalledWith('Words converted to number', 'success');
    });
  });

  describe('handleCronExplain 6-field expression', () => {
    it('accepts a 6-field cron without rejecting it', () => {
      const { handlers, setToolResults } = setup('0 */5 * * * *');
      handlers.handleCronExplain();
      const result = setToolResults.mock.calls[0]![0]!({});
      expect(result['ws-1']).not.toContain('(invalid');
    });

    it('shows count for multiple expressions', () => {
      const { handlers, showAlert } = setup('*/5 * * * *\n0 9 * * 1');
      handlers.handleCronExplain();
      expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('2/2'), 'success');
    });
  });
});
