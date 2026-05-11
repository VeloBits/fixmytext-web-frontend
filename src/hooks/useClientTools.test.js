import { renderHook } from '@testing-library/react';
import useClientTools from './useClientTools';

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
      expect(typeof handlers[key]).toBe('function');
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
        const updater = setToolResults.mock.calls[0][0];
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

      const updater = setToolResults.mock.calls[0][0];
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

      const updater = setToolResults.mock.calls[0][0];
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

      const updater = setToolResults.mock.calls[0][0];
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

      const updater = setToolResults.mock.calls[0][0];
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

      const updater = setToolResults.mock.calls[0][0];
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

      const updater = setToolResults.mock.calls[0][0];
      const result = updater({});
      const output = result['ws-1'];

      expect(output).toContain('Total letters: 5');
      expect(output).toMatch(/A\s+2/);
      expect(output).toMatch(/B\s+2/);
      expect(output).toMatch(/C\s+1/);
      expect(showAlert).toHaveBeenCalledWith('Frequency analysis complete', 'success');
    });
  });
});
