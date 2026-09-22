"use client";

import { useEffect, useState } from "react";
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
  const [lang, setLang] = useState<"en-IN" | "hi-IN">("en-IN");
  const speech = useSpeechRecognition(lang);
  const [transcript, setTranscript] = useState(existingEntry?.transcript ?? "");
  const [aiSummary, setAiSummary] = useState(existingEntry?.ai_summary ?? "");
  const [summarizing, setSummarizing] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [marks, setMarks] = useState<number | null>(existingEntry?.marks ?? null);
  const [notes, setNotes] = useState(existingEntry?.notes ?? "");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mirrors the speech engine's running transcript
    if (speech.transcript) setTranscript(speech.transcript);
  }, [speech.transcript]);

  async function generateSummary() {
    if (!transcript.trim()) return;
    setSummarizing(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to summarize");
      setAiSummary(data.summary ?? "");
    } catch (err) {
      setSummaryError(err instanceof Error ? err.message : "Failed to summarize");
    } finally {
      setSummarizing(false);
    }
  }

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

        <section className="mb-6 rounded-2xl border border-line bg-surface px-5 py-6">
          <div className="mb-5 flex items-center justify-center gap-1.5">
            {(["en-IN", "hi-IN"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  lang === l ? "bg-surface-2 text-fg" : "text-muted"
                }`}
              >
                {l === "en-IN" ? "English" : "हिन्दी"}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={speech.listening ? speech.stop : speech.start}
              disabled={!speech.supported}
              className={`flex h-20 w-20 items-center justify-center rounded-full transition-all disabled:opacity-30 ${
                speech.listening
                  ? "bg-danger/15 ring-4 ring-danger/30"
                  : "bg-accent/15 ring-4 ring-accent/20 active:ring-accent/40"
              }`}
            >
              {speech.listening ? (
                <span className="h-6 w-6 rounded-md bg-danger" />
              ) : (
                <span className="h-7 w-7 rounded-full bg-accent" />
              )}
            </button>
            <p className="mt-4 text-xs text-muted">
              {speech.listening ? "Listening… tap to stop" : "Tap to start recording"}
            </p>
          </div>
        </section>

        <div className="space-y-5">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
              Transcript
            </label>
            <textarea
              value={transcript + (speech.interim ? " " + speech.interim : "")}
              onChange={(e) => setTranscript(e.target.value)}
              rows={7}
              placeholder="Feedback appears here as the learner speaks — you can edit it."
              className={fieldClass}
            />
            <button
              onClick={generateSummary}
              disabled={!transcript.trim() || summarizing}
              className="mt-2.5 w-full rounded-xl border border-accent/30 bg-accent/10 py-3 text-sm font-medium text-accent-soft transition-opacity active:opacity-80 disabled:opacity-30"
            >
              {summarizing ? "Summarizing…" : "Generate AI summary"}
            </button>
            {summaryError && (
              <p className="mt-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
                {summaryError}
              </p>
            )}
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
              AI summary
            </label>
            <textarea
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              rows={4}
              placeholder="Generate above, or write your own."
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
