import { useState, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// Extend Window to add both SpeechRecognition and webkitSpeechRecognition
// Note: SpeechRecognition is defined in lib.dom but not on the Window interface
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SpeechRecognitionConstructor = new () => any;

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface UseSpeechReturn {
  listening: boolean;
  handleTts: () => void;
  handleSpeechToText: () => void;
}

export default function useSpeech(
  text: string,
  setText: Dispatch<SetStateAction<string>>,
  showAlert: (msg: string, variant: string) => void
): UseSpeechReturn {
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const handleTts = (): void => {
    const msg = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(msg);
    showAlert('Speaking\u2026', 'info');
  };

  const handleSpeechToText = (): void => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      showAlert('Speech recognition not supported in this browser', 'danger');
      return;
    }
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const recognition = new SpeechRec();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[])
        .map((r: any) => r[0].transcript)
        .join(' ');
      setText((prev) => (prev ? prev + ' ' + transcript : transcript));
    };
    recognition.onerror = (): void => {
      setListening(false);
      showAlert('Speech recognition error', 'danger');
    };
    recognition.onend = (): void => setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    showAlert('Listening\u2026 speak now', 'info');
  };

  return { listening, handleTts, handleSpeechToText };
}
