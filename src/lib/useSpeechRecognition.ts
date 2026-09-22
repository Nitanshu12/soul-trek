"use client";

import { useCallback, useRef, useState } from "react";

function getSpeechRecognitionCtor() {
  return typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;
}

export function useSpeechRecognition(lang: string) {
  const [supported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTranscriptRef = useRef("");

  const start = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return;

    baseTranscriptRef.current = transcript ? transcript + " " : "";

    const recognition = new Ctor();
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) {
          finalChunk += text + " ";
        } else {
          interimChunk += text;
        }
      }
      if (finalChunk) {
        baseTranscriptRef.current = baseTranscriptRef.current + finalChunk;
        setTranscript(baseTranscriptRef.current.trim());
      }
      setInterim(interimChunk);
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognition.onend = () => {
      setListening(false);
      setInterim("");
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    baseTranscriptRef.current = "";
    setTranscript("");
    setInterim("");
  }, []);

  return { supported, listening, transcript, interim, start, stop, reset, setTranscript };
}
