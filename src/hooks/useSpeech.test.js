import { renderHook, act } from '@testing-library/react';
import useSpeech from './useSpeech';

describe('useSpeech', () => {
  let setText, showAlert;

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
    delete window.SpeechRecognition;
    delete window.webkitSpeechRecognition;
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
    window.SpeechRecognition = vi.fn(function () { return mockRecognition; });

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
    window.SpeechRecognition = vi.fn(function () { return mockRecognition; });

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
    window.SpeechRecognition = vi.fn(function () { return mockRecognition; });

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
        [Symbol.iterator]: function* () {
          for (let i = 0; i < this.length; i++) yield this[i];
        },
      },
    };

    act(() => {
      mockRecognition.onresult(event);
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
    window.SpeechRecognition = vi.fn(function () { return mockRecognition; });

    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });
    act(() => {
      mockRecognition.onerror();
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
    window.SpeechRecognition = vi.fn(function () { return mockRecognition; });

    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });
    expect(result.current.listening).toBe(true);
    act(() => {
      mockRecognition.onend();
    });
    expect(result.current.listening).toBe(false);
  });

  it('uses webkitSpeechRecognition fallback', () => {
    delete window.SpeechRecognition;
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
    window.webkitSpeechRecognition = vi.fn(function () { return mockRecognition; });

    const { result } = renderHook(() => useSpeech('hello', setText, showAlert));
    act(() => {
      result.current.handleSpeechToText();
    });
    expect(mockRecognition.start).toHaveBeenCalled();
  });
});
