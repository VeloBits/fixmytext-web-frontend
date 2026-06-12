import { renderHook, act } from '@testing-library/react';
import useSpeech from './useSpeech';

// Shorthand to cast window for setting/deleting speech recognition props
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const win = window as any;

describe('useSpeech', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let setText: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let showAlert: any;

  beforeEach(() => {
    setText = vi.fn();
    showAlert = vi.fn();

    // Mock speechSynthesis
    vi.stubGlobal('speechSynthesis', { speak: vi.fn() });
    vi.stubGlobal('SpeechSynthesisUtterance', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('starts not listening', () => {
    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    expect(result.current.listening).toBe(false);
  });

  it('handleTts calls speechSynthesis.speak', () => {
    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleTts();
    });
    expect(window.speechSynthesis.speak).toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Speaking'), 'info');
  });

  it('handleSpeechToText shows alert when not supported', () => {
    delete win.SpeechRecognition;
    delete win.webkitSpeechRecognition;
    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });
    expect(showAlert).toHaveBeenCalledWith(
      'Speech recognition not supported in this browser',
      'danger'
    );
  });

  it('handleSpeechToText starts recognition when supported', () => {
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onerror: null,
      onend: null,
    };
    win.SpeechRecognition = vi.fn(function () {
      return mockRecognition;
    });

    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });
    expect(mockRecognition.start).toHaveBeenCalled();
    expect(result.current.listening).toBe(true);
    expect(mockRecognition.continuous).toBe(true);
    expect(mockRecognition.lang).toBe('en-US');
    expect(showAlert).toHaveBeenCalledWith(expect.stringContaining('Listening'), 'info');
  });

  it('stops recognition when already listening', () => {
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onerror: null,
      onend: null,
    };
    win.SpeechRecognition = vi.fn(function () {
      return mockRecognition;
    });

    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    }); // start
    act(() => {
      result.current.handleSpeechToText();
    }); // stop
    expect(mockRecognition.stop).toHaveBeenCalled();
    expect(result.current.listening).toBe(false);
  });

  it('handles recognition result', () => {
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onerror: null,
      onend: null,
    };
    win.SpeechRecognition = vi.fn(function () {
      return mockRecognition;
    });

    const { result } = renderHook(() => useSpeech('', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });

    // Simulate onresult with Array.from-compatible results
    const result1 = { 0: { transcript: 'hello world' }, length: 1 };
    const event = {
      results: {
        0: result1,
        length: 1,
        [Symbol.iterator]: function* (this: {
          length: number;
          [key: number]: unknown;
        }): Generator<unknown> {
          for (let i = 0; i < this.length; i++) yield (this as Record<number, unknown>)[i];
        },
      },
    };

    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRecognition.onresult as any)(event);
    });
    expect(setText).toHaveBeenCalled();
  });

  it('handles recognition error', () => {
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onerror: null,
      onend: null,
    };
    win.SpeechRecognition = vi.fn(function () {
      return mockRecognition;
    });

    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRecognition.onerror as any)();
    });
    expect(result.current.listening).toBe(false);
    expect(showAlert).toHaveBeenCalledWith('Speech recognition error', 'danger');
  });

  it('handles recognition end', () => {
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onerror: null,
      onend: null,
    };
    win.SpeechRecognition = vi.fn(function () {
      return mockRecognition;
    });

    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });
    expect(result.current.listening).toBe(true);
    act(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mockRecognition.onend as any)();
    });
    expect(result.current.listening).toBe(false);
  });

  it('uses webkitSpeechRecognition fallback', () => {
    delete win.SpeechRecognition;
    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null,
      onerror: null,
      onend: null,
    };
    win.webkitSpeechRecognition = vi.fn(function () {
      return mockRecognition;
    });

    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });
    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it('setText updater appends transcript to existing text (both branches)', () => {
    // Make setText actually invoke the functional updater so we cover
    // the (prev) => prev ? prev + ' ' + transcript : transcript branches
    const capturedUpdaters: Array<(prev: string) => string> = [];
    setText = vi.fn((updater: unknown) => {
      if (typeof updater === 'function') capturedUpdaters.push(updater as (prev: string) => string);
    });

    const mockRecognition = {
      start: vi.fn(),
      stop: vi.fn(),
      continuous: false,
      interimResults: false,
      lang: '',
      onresult: null as unknown,
      onerror: null,
      onend: null,
    };
    win.SpeechRecognition = vi.fn(function () {
      return mockRecognition;
    });

    const { result } = renderHook(() => useSpeech('', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });

    const resultObj = { 0: { transcript: 'hello' }, length: 1 };
    const event = {
      results: {
        0: resultObj,
        length: 1,
        [Symbol.iterator]: function* (this: Record<number, unknown> & { length: number }) {
          for (let i = 0; i < this.length; i++) yield this[i];
        },
      },
    };
    act(() => {
      (mockRecognition.onresult as (e: unknown) => void)(event);
    });

    expect(capturedUpdaters.length).toBeGreaterThan(0);
    // Branch 1: prev is empty string → returns just transcript
    expect(capturedUpdaters[0]!('')).toBe('hello');
    // Branch 2: prev is non-empty → appends with space
    expect(capturedUpdaters[0]!('existing')).toBe('existing hello');
  });
});
