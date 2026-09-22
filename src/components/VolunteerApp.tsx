"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db, newId } from "@/lib/db";
import { pendingCount, syncDown, syncUp } from "@/lib/sync";
import { getVolunteerName, setVolunteerName } from "@/lib/auth";
import type { Session, Student, FeedbackEntry } from "@/lib/types";
import SessionPicker from "./SessionPicker";
import StudentList from "./StudentList";
import FeedbackSheet from "./FeedbackSheet";

const EMPTY_SESSIONS: Session[] = [];
const EMPTY_STUDENTS: Student[] = [];
const EMPTY_ENTRIES: FeedbackEntry[] = [];

export default function VolunteerApp({ busId }: { busId: string }) {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pending, setPending] = useState(0);
  const [volunteer, setVolunteer] = useState("");
  const [askingName, setAskingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");

  const bus = useLiveQuery(() => db.buses.get(busId), [busId]);
  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? EMPTY_SESSIONS;
  const students =
    useLiveQuery(
      () => db.students.where("bus_id").equals(busId).sortBy("created_at"),
      [busId]
    ) ?? EMPTY_STUDENTS;
  const entries =
    useLiveQuery(() => db.entries.where("bus_id").equals(busId).toArray(), [busId]) ??
    EMPTY_ENTRIES;

  // Default to the most recently created session until the volunteer picks another.
  const effectiveSessionId =
    selectedSessionId ?? (sessions.length ? sessions[sessions.length - 1].id : null);

  useEffect(() => {
    // Read after hydration, not as lazy state: localStorage is empty on the server
    // and would render a different first pass than the client.
    const saved = getVolunteerName();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (saved) setVolunteer(saved);
    else setAskingName(true);
  }, []);

  useEffect(() => {
    const run = async () => {
      await syncDown();
      await syncUp();
      setPending(await pendingCount());
    };
    run();
    const onOnline = () => {
      setOnline(true);
      run();
    };
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = setInterval(run, 20000);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, []);

  const sessionEntries = useMemo(
    () => entries.filter((e) => e.session_id === effectiveSessionId),
    [entries, effectiveSessionId]
  );

  const activeStudent = students.find((s) => s.id === activeStudentId) ?? null;
  const activeSession = sessions.find((s) => s.id === effectiveSessionId) ?? null;
  const existingEntry =
    activeStudent && activeSession
      ? entries.find(
          (e) => e.student_id === activeStudent.id && e.session_id === activeSession.id
        ) ?? null
      : null;

  const flushSync = () => syncUp().then(async () => setPending(await pendingCount()));

  async function addStudent(name: string) {
    await db.students.add({
      id: newId(),
      bus_id: busId,
      name,
      created_at: new Date().toISOString(),
      synced: 0,
    });
    flushSync();
  }

  async function addSession(label: string, date: string) {
    const id = newId();
    await db.sessions.add({
      id,
      label,
      date,
      created_at: new Date().toISOString(),
      synced: 0,
    });
    setSelectedSessionId(id);
    flushSync();
  }

  async function saveFeedback(payload: {
    id?: string;
    transcript: string;
    ai_summary: string | null;
    marks: number | null;
    notes: string;
  }) {
    if (!activeStudent || !activeSession) return;
    await db.entries.put({
      id: payload.id ?? newId(),
      student_id: activeStudent.id,
      bus_id: busId,
      session_id: activeSession.id,
      volunteer_name: volunteer,
      transcript: payload.transcript,
      ai_summary: payload.ai_summary,
      marks: payload.marks,
      notes: payload.notes,
      created_at: existingEntry?.created_at ?? new Date().toISOString(),
      synced: 0,
    });
    setActiveStudentId(null);
    flushSync();
  }

  if (askingName) {
    return (
      <div className="flex min-h-dvh flex-col justify-center px-5 py-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-xl font-semibold tracking-tight">Who&apos;s taking feedback?</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-dim">
            Your name is saved on this phone and tagged on the feedback you record.
          </p>
          <form
            className="mt-6 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = nameDraft.trim();
              if (!trimmed) return;
              setVolunteerName(trimmed);
              setVolunteer(trimmed);
              setAskingName(false);
            }}
          >
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base text-fg focus:border-accent"
            />
            <button
              type="submit"
              disabled={!nameDraft.trim()}
              className="w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-accent-ink transition-opacity active:opacity-80 disabled:opacity-30"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-dim transition-colors active:bg-surface"
          >
            ‹
          </Link>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">
              {bus?.name ?? "Bus"}
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${online ? "bg-ok" : "bg-danger"}`}
              />
              <p className="truncate text-xs text-muted">
                {volunteer}
                {pending > 0 && ` · ${pending} to sync`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <SessionPicker
        sessions={sessions}
        selectedSessionId={effectiveSessionId}
        onSelect={setSelectedSessionId}
        onAddSession={addSession}
      />

      <StudentList
        students={students}
        entries={sessionEntries}
        sessionSelected={Boolean(effectiveSessionId)}
        onAddStudent={addStudent}
        onOpenFeedback={(id) => {
          if (!effectiveSessionId) return;
          setActiveStudentId(id);
        }}
      />

      {activeStudent && activeSession && (
        <FeedbackSheet
          student={activeStudent}
          session={activeSession}
          volunteerName={volunteer}
          existingEntry={existingEntry}
          onClose={() => setActiveStudentId(null)}
          onSave={saveFeedback}
        />
      )}
    </div>
  );
}
