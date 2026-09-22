"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Learners speak Hinglish, so recognition runs in Hindi — Google's hi-IN model
// handles Hindi/English code-mixing, where en-IN mangles the Hindi words.
const LANG = "hi-IN";

// Errors that mean recognition genuinely cannot continue. Everything else
// (notably "no-speech" and "aborted") is transient and gets auto-restarted.
const FATAL_ERRORS = new Set(["not-allowed", "service-not-allowed", "audio-capture"]);

function getSpeechRecognitionCtor() {
  return typeof window !== "undefined"
    ? window.SpeechRecognition || window.webkitSpeechRecognition
    : undefined;
}

export function useSpeechRecognition(initialTranscript = "") {
  const [supported] = useState(() => Boolean(getSpeechRecognitionCtor()));
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState(initialTranscript);
  const [interim, setInterim] = useState("");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTranscriptRef = useRef("");
  // The browser ends recognition on its own after a silence. This tracks whether
  // the volunteer actually asked to stop, so a silent pause resumes instead of ending.
  const shouldListenRef = useRef(false);

  const buildRecognition = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return null;

    const recognition = new Ctor();
    recognition.lang = LANG;
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalChunk = "";
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalChunk += text + " ";
        else interimChunk += text;
      }
      if (finalChunk) {
        baseTranscriptRef.current += finalChunk;
        setTranscript(baseTranscriptRef.current.trim());
      }
      setInterim(interimChunk);
    };

    recognition.onerror = (event) => {
      if (FATAL_ERRORS.has(event.error)) {
        shouldListenRef.current = false;
        setError(
          event.error === "not-allowed" || event.error === "service-not-allowed"
            ? "Microphone access was blocked. Allow it in your browser settings."
            : "No microphone available."
        );
        setListening(false);
      }
    };

    recognition.onend = () => {
      setInterim("");
      if (shouldListenRef.current) {
        // Silence ended the session, not the volunteer — pick straight back up.
        try {
          recognition.start();
        } catch {
          shouldListenRef.current = false;
          setListening(false);
        }
      } else {
        setListening(false);
      }
    };

    return recognition;
  }, []);

  const start = useCallback(() => {
    if (!getSpeechRecognitionCtor()) return;
    setError(null);
    baseTranscriptRef.current = transcript ? transcript + " " : "";
    shouldListenRef.current = true;

    const recognition = buildRecognition();
    if (!recognition) return;
    recognitionRef.current = recognition;
    try {
      recognition.start();
      setListening(true);
    } catch {
      shouldListenRef.current = false;
      setListening(false);
    }
  }, [buildRecognition, transcript]);

  const stop = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
  }, []);

  // Never leave the mic running if the screen is closed mid-recording.
  useEffect(() => {
    return () => {
      shouldListenRef.current = false;
      recognitionRef.current?.abort();
    };
  }, []);

  return { supported, listening, transcript, interim, error, start, stop, setTranscript };
}
