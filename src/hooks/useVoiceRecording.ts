import { useState, useRef, useCallback } from "react";

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

export function useVoiceRecording(onResult: (text: string) => void) {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const start = useCallback(() => {
    if (!isSupported) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const text = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join(" ")
        .trim();
      if (text) onResult(text);
    };

    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isSupported, onResult]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  return { isRecording, start, stop, isSupported };
}
