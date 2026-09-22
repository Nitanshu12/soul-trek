"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedbackEntry, Session, Student } from "@/lib/types";
import { useSpeechRecognition } from "@/lib/useSpeechRecognition";

export default function FeedbackSheet({
  student,
  session,
  volunteerName,
  existingEntry,
  onClose,
  onSave,
}: {
  student: Student;
  session: Session;
  volunteerName: string;
  existingEntry: FeedbackEntry | null;
  onClose: () => void;
  onSave: (entry: {
    id?: string;
    transcript: string;
    ai_summary: string | null;
    marks: number | null;
    notes: string;
  }) => void;
}) {
  const speech = useSpeechRecognition(existingEntry?.transcript ?? "");
  const [transcript, setTranscript] = useState(existingEntry?.transcript ?? "");
  const [aiSummary, setAiSummary] = useState(existingEntry?.ai_summary ?? "");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [marks, setMarks] = useState<number | null>(existingEntry?.marks ?? null);
  const [notes, setNotes] = useState(existingEntry?.notes ?? "");

  const transcriptRef = useRef(transcript);
  const wasListeningRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the speech engine's running transcript
    if (speech.transcript) setTranscript(speech.transcript);
  }, [speech.transcript]);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const generateSummary = useCallback(async () => {
    const text = transcriptRef.current.trim();
    if (!text) return;
    setSummarizing(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to summarize");
      setAiSummary(data.summary ?? "");
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setSummarizing(false);
    }
  }, []);

  // Stopping the recording is the volunteer's "done" signal, so summarize right then.
  useEffect(() => {
    if (speech.listening) {
      wasListeningRef.current = true;
      return;
    }
    if (wasListeningRef.current) {
      wasListeningRef.current = false;
      generateSummary();
    }
  }, [speech.listening, generateSummary]);

  function handleSave() {
    if (speech.listening) speech.stop();
    onSave({
      id: existingEntry?.id,
      transcript,
      ai_summary: aiSummary || null,
      marks,
      notes,
    });
  }

  const fieldClass =
    "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-fg focus:border-accent";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-dim transition-colors active:bg-surface"
        >
          Close
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold">{student.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{session.label}</p>
        </div>
        <button
          onClick={handleSave}
          className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink transition-opacity active:opacity-80"
        >
          Save
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        {!speech.supported && (
          <p className="mb-5 rounded-lg border border-accent/25 bg-accent/10 px-3.5 py-2.5 text-xs leading-relaxed text-accent-soft">
            Live transcription isn&apos;t supported in this browser — use Chrome on Android,
            or type the feedback in directly.
          </p>
        )}

        <section className="mb-6 rounded-2xl border border-line bg-surface px-5 py-7">
          <div className="flex flex-col items-center">
            <button
              onClick={speech.listening ? speech.stop : speech.start}
              disabled={!speech.supported || summarizing}
              className={`flex h-20 w-20 items-center justify-center rounded-full transition-all disabled:opacity-30 ${
                speech.listening
                  ? "animate-pulse bg-danger/15 ring-4 ring-danger/30"
                  : "bg-accent/15 ring-4 ring-accent/20 active:ring-accent/40"
              }`}
            >
              {speech.listening ? (
                <span className="h-6 w-6 rounded-md bg-danger" />
              ) : (
                <span className="h-7 w-7 rounded-full bg-accent" />
              )}
            </button>
            <p className="mt-4 text-center text-xs leading-relaxed text-muted">
              {speech.listening
                ? "Listening… pauses are fine. Tap to finish."
                : summarizing
                  ? "Finishing up…"
                  : transcript
                    ? "Tap to continue recording"
                    : "Tap to start · speak in Hinglish"}
            </p>
            {speech.error && (
              <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-center text-xs text-danger">
                {speech.error}
              </p>
            )}
          </div>
        </section>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
              Transcript
            </label>
            <textarea
              value={transcript + (speech.interim ? " " + speech.interim : "")}
              onChange={(e) => {
                // Keep the speech engine's copy in step, so resuming a recording
                // appends to the edited text instead of reverting it.
                setTranscript(e.target.value);
                speech.setTranscript(e.target.value);
              }}
              rows={7}
              placeholder="Feedback appears here as the learner speaks — you can edit it."
              className={fieldClass}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-medium uppercase tracking-wider text-muted">
                AI summary
              </label>
              <button
                onClick={generateSummary}
                disabled={!transcript.trim() || summarizing || speech.listening}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-dim transition-colors active:bg-surface-2 disabled:opacity-30"
              >
                {summarizing ? "Summarizing…" : "Regenerate"}
              </button>
            </div>
            {summaryError && (
              <p className="mb-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {summaryError}
              </p>
            )}
            <textarea
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              rows={4}
              placeholder={
                summarizing
                  ? "Generating summary…"
                  : "Generated automatically when you stop recording."
              }
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
              Marks
            </label>
            <div className="grid grid-cols-10 gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setMarks(n === marks ? null : n)}
                  className={`aspect-square rounded-lg text-sm font-medium transition-colors ${
                    marks === n
                      ? "bg-accent text-accent-ink"
                      : "border border-line bg-surface text-dim"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
              Volunteer notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              placeholder="Anything else worth noting…"
              className={fieldClass}
            />
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted">Recorded by {volunteerName}</p>
      </div>
    </div>
  );
}
