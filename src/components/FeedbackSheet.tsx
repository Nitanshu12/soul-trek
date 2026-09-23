"use client";

import { useState } from "react";
import type { FeedbackEntry, Satisfaction, Session, Student } from "@/lib/types";
import { useAudioRecorder } from "@/lib/useAudioRecorder";
import {
  RateLimitedError,
  summarizeTranscript,
  transcribeAudio,
} from "@/lib/transcription";

type Stage = "idle" | "transcribing" | "summarizing";

function formatDuration(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

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
    satisfaction: Satisfaction | null;
    notes: string;
    pendingAudio: Blob | null;
  }) => void;
}) {
  const recorder = useAudioRecorder();
  const [transcript, setTranscript] = useState(existingEntry?.transcript ?? "");
  const [aiSummary, setAiSummary] = useState(existingEntry?.ai_summary ?? "");
  const [marks, setMarks] = useState<number | null>(existingEntry?.marks ?? null);
  const [satisfaction, setSatisfaction] = useState<Satisfaction | null>(
    existingEntry?.satisfaction ?? null
  );
  const [notes, setNotes] = useState(existingEntry?.notes ?? "");

  const [stage, setStage] = useState<Stage>("idle");
  const [notice, setNotice] = useState<string | null>(null);
  // Audio that still needs transcribing — saved with the entry and retried later.
  const [pendingAudio, setPendingAudio] = useState<Blob | null>(null);

  const busy = stage !== "idle";

  async function runSummary(text: string) {
    if (!text.trim()) return;
    setStage("summarizing");
    try {
      setAiSummary(await summarizeTranscript(text));
    } catch {
      setNotice("Transcript saved, but the AI summary failed. Tap Regenerate to retry.");
    } finally {
      setStage("idle");
    }
  }

  async function handleStop() {
    const blob = await recorder.stop();
    if (!blob) return;

    setNotice(null);
    setStage("transcribing");
    try {
      const text = await transcribeAudio(blob);
      setPendingAudio(null);
      const combined = transcript ? `${transcript} ${text}`.trim() : text;
      setTranscript(combined);
      setStage("idle");
      await runSummary(combined);
    } catch (err) {
      // Keep the audio so nothing is lost; the sync loop retries it.
      setPendingAudio(blob);
      setStage("idle");
      setNotice(
        err instanceof RateLimitedError
          ? "Transcription is busy right now. The recording is saved and will transcribe automatically — just save this entry."
          : "No connection. The recording is saved and will transcribe automatically once you're back online."
      );
    }
  }

  function handleSave() {
    onSave({
      id: existingEntry?.id,
      transcript,
      ai_summary: aiSummary || null,
      marks,
      satisfaction,
      notes,
      pendingAudio,
    });
  }

  const fieldClass =
    "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-fg focus:border-accent";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <button
          onClick={onClose}
          disabled={recorder.recording}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-dim transition-colors active:bg-surface disabled:opacity-30"
        >
          Close
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-semibold">{student.name}</p>
          <p className="mt-0.5 truncate text-xs text-muted">{session.label}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={recorder.recording}
          className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink transition-opacity active:opacity-80 disabled:opacity-30"
        >
          Save
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <section className="mb-6 rounded-2xl border border-line bg-surface px-5 py-7">
          <div className="flex flex-col items-center">
            <button
              onClick={recorder.recording ? handleStop : recorder.start}
              disabled={busy}
              className={`flex h-20 w-20 items-center justify-center rounded-full transition-all disabled:opacity-40 ${
                recorder.recording
                  ? "animate-pulse bg-danger/15 ring-4 ring-danger/30"
                  : "bg-accent/15 ring-4 ring-accent/20 active:ring-accent/40"
              }`}
            >
              {recorder.recording ? (
                <span className="h-6 w-6 rounded-md bg-danger" />
              ) : (
                <span className="h-7 w-7 rounded-full bg-accent" />
              )}
            </button>

            {recorder.recording ? (
              <p className="mt-4 font-mono text-lg tabular-nums text-fg">
                {formatDuration(recorder.seconds)}
              </p>
            ) : null}

            <p className="mt-2 text-center text-xs leading-relaxed text-muted">
              {recorder.recording
                ? "Recording — take as long as the learner needs"
                : stage === "transcribing"
                  ? "Transcribing…"
                  : stage === "summarizing"
                    ? "Writing summary…"
                    : transcript
                      ? "Tap to record more"
                      : "Tap to record · speak in Hinglish"}
            </p>

            {recorder.error && (
              <p className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-center text-xs text-danger">
                {recorder.error}
              </p>
            )}
            {notice && (
              <p className="mt-3 rounded-lg border border-accent/25 bg-accent/10 px-3 py-2 text-center text-xs leading-relaxed text-accent-soft">
                {notice}
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
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={7}
              placeholder={
                stage === "transcribing"
                  ? "Transcribing the recording…"
                  : "The transcript appears here after you stop recording. You can edit it."
              }
              className={fieldClass}
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label className="text-xs font-medium uppercase tracking-wider text-muted">
                AI summary
              </label>
              <button
                onClick={() => runSummary(transcript)}
                disabled={!transcript.trim() || busy || recorder.recording}
                className="rounded-md border border-line px-2.5 py-1 text-xs font-medium text-dim transition-colors active:bg-surface-2 disabled:opacity-30"
              >
                {stage === "summarizing" ? "Summarizing…" : "Regenerate"}
              </button>
            </div>
            <textarea
              value={aiSummary}
              onChange={(e) => setAiSummary(e.target.value)}
              rows={4}
              placeholder="Written automatically once the recording is transcribed."
              className={fieldClass}
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
              Marks
            </label>
            <div className="mb-2.5 grid grid-cols-2 gap-2">
              <button
                onClick={() =>
                  setSatisfaction(satisfaction === "satisfactory" ? null : "satisfactory")
                }
                className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                  satisfaction === "satisfactory"
                    ? "bg-ok/20 text-ok ring-1 ring-ok/40"
                    : "border border-line bg-surface text-dim"
                }`}
              >
                Satisfactory
              </button>
              <button
                onClick={() =>
                  setSatisfaction(satisfaction === "unsatisfactory" ? null : "unsatisfactory")
                }
                className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
                  satisfaction === "unsatisfactory"
                    ? "bg-danger/20 text-danger ring-1 ring-danger/40"
                    : "border border-line bg-surface text-dim"
                }`}
              >
                Unsatisfactory
              </button>
            </div>
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
