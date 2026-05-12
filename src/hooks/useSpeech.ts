import { useState, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';

// Extend Window to add webkitSpeechRecognition fallback
declare global {
  interface Window {
    webkitSpeechRecognition?: typeof SpeechRecognition;
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
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((r) => r[0].transcript)
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
