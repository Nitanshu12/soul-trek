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

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <button onClick={onClose} className="text-sm font-medium text-neutral-500">
          Close
        </button>
        <div className="text-center">
          <p className="font-semibold text-neutral-900">{student.name}</p>
          <p className="text-xs text-neutral-500">{session.label}</p>
        </div>
        <button
          onClick={handleSave}
          className="rounded-lg bg-orange-600 px-3 py-1.5 text-sm font-semibold text-white"
        >
          Save
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!speech.supported && (
          <p className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-800">
            Live transcription isn&apos;t supported in this browser — use Chrome on Android,
            or just type the feedback below.
          </p>
        )}

        <div className="mb-3 flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-500">Language:</span>
          {(["en-IN", "hi-IN"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                lang === l ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-600"
              }`}
            >
              {l === "en-IN" ? "English" : "Hindi"}
            </button>
          ))}
        </div>

        <div className="mb-4 flex justify-center">
          {speech.listening ? (
            <button
              onClick={speech.stop}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600 text-white shadow-lg"
            >
              <span className="h-4 w-4 rounded-sm bg-white" />
            </button>
          ) : (
            <button
              onClick={speech.start}
              disabled={!speech.supported}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-600 text-white shadow-lg disabled:opacity-40"
            >
              <span className="h-5 w-5 rounded-full bg-white" />
            </button>
          )}
        </div>
        <p className="mb-3 text-center text-xs text-neutral-500">
          {speech.listening ? "Listening... tap to stop" : "Tap to start recording"}
        </p>

        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Transcript (editable)
        </label>
        <textarea
          value={transcript + (speech.interim ? " " + speech.interim : "")}
          onChange={(e) => setTranscript(e.target.value)}
          rows={6}
          placeholder="Feedback will appear here as the learner speaks, or type it directly."
          className="mb-3 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none"
        />

        <button
          onClick={generateSummary}
          disabled={!transcript.trim() || summarizing}
          className="mb-3 w-full rounded-xl border border-orange-300 bg-orange-50 py-2 text-sm font-medium text-orange-700 disabled:opacity-40"
        >
          {summarizing ? "Summarizing..." : "✨ Generate AI summary"}
        </button>
        {summaryError && (
          <p className="mb-3 text-xs text-red-600">{summaryError}</p>
        )}

        <label className="mb-1 block text-xs font-medium text-neutral-500">AI summary</label>
        <textarea
          value={aiSummary}
          onChange={(e) => setAiSummary(e.target.value)}
          rows={3}
          placeholder="Tap 'Generate AI summary' above, or write your own."
          className="mb-3 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none"
        />

        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Marks (1-10)
        </label>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              onClick={() => setMarks(n === marks ? null : n)}
              className={`h-9 w-9 rounded-lg text-sm font-medium ${
                marks === n ? "bg-neutral-900 text-white" : "bg-neutral-200 text-neutral-700"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <label className="mb-1 block text-xs font-medium text-neutral-500">
          Additional notes (volunteer)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Anything else worth noting..."
          className="mb-6 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none"
        />

        <p className="mb-6 text-center text-xs text-neutral-400">
          Volunteer: {volunteerName}
        </p>
      </div>
    </div>
  );
}
