"use client";

import { db } from "./db";

export class RateLimitedError extends Error {
  constructor() {
    super("Transcription is rate limited right now");
    this.name = "RateLimitedError";
  }
}

export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  const extension = blob.type.includes("mp4") ? "mp4" : "webm";
  form.append("file", blob, `recording.${extension}`);

  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  if (res.status === 429) throw new RateLimitedError();
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Transcription failed");
  return (data.text ?? "").trim();
}

export async function summarizeTranscript(transcript: string): Promise<string> {
  const res = await fetch("/api/summarize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Failed to summarize");
  return (data.summary ?? "").trim();
}

/**
 * Drains recordings that couldn't be transcribed when they were made — because
 * the phone was offline, or Groq's hourly audio limit was hit. Runs on the same
 * loop as the data sync.
 */
export async function processPendingRecordings(): Promise<void> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const pending = await db.recordings.orderBy("created_at").toArray();
  for (const recording of pending) {
    try {
      const transcript = await transcribeAudio(recording.blob);
      const entry = await db.entries.get(recording.id);
      if (!entry) {
        // The entry was never saved; drop the orphaned audio.
        await db.recordings.delete(recording.id);
        continue;
      }

      let summary = entry.ai_summary;
      if (transcript && !summary) {
        try {
          summary = await summarizeTranscript(transcript);
        } catch {
          // A transcript with no summary is still useful; leave it for later.
        }
      }

      // Anything the volunteer typed while the audio sat queued is kept —
      // the transcription is appended to it rather than replacing it.
      const existing = entry.transcript?.trim() ?? "";
      const merged = existing ? `${existing} ${transcript}`.trim() : transcript;

      await db.entries.put({
        ...entry,
        transcript: merged || entry.transcript,
        ai_summary: summary,
        synced: 0,
      });
      await db.recordings.delete(recording.id);
    } catch (err) {
      // Rate limited or offline: stop here and keep everything queued for the
      // next pass rather than burning through the remaining quota.
      if (err instanceof RateLimitedError) return;
      return;
    }
  }
}

export async function pendingRecordingCount(): Promise<number> {
  return db.recordings.count();
}
