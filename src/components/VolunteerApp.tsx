"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRouter } from "next/navigation";
import { db, newId } from "@/lib/db";
import { pendingCount, syncDown, syncUp } from "@/lib/sync";
import { createClient } from "@/lib/supabase/client";
import type { Bus } from "@/lib/types";
import SessionPicker from "./SessionPicker";
import StudentList from "./StudentList";
import FeedbackSheet from "./FeedbackSheet";
import type { Session, Student, FeedbackEntry } from "@/lib/types";

const EMPTY_SESSIONS: Session[] = [];
const EMPTY_STUDENTS: Student[] = [];
const EMPTY_ENTRIES: FeedbackEntry[] = [];

export default function VolunteerApp({
  bus,
  volunteerName,
}: {
  bus: Bus;
  volunteerName: string;
}) {
  const router = useRouter();
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [pending, setPending] = useState(0);

  const sessions = useLiveQuery(() => db.sessions.toArray(), []) ?? EMPTY_SESSIONS;
  const students =
    useLiveQuery(
      () => db.students.where("bus_id").equals(bus.id).sortBy("created_at"),
      [bus.id]
    ) ?? EMPTY_STUDENTS;
  const entries =
    useLiveQuery(() => db.entries.where("bus_id").equals(bus.id).toArray(), [bus.id]) ??
    EMPTY_ENTRIES;

  // Default to the most recently created session until the volunteer picks a different one.
  const effectiveSessionId =
    selectedSessionId ?? (sessions.length ? sessions[sessions.length - 1].id : null);

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

  async function addStudent(name: string) {
    await db.students.add({
      id: newId(),
      bus_id: bus.id,
      name,
      created_at: new Date().toISOString(),
      synced: 0,
    });
    syncUp().then(async () => setPending(await pendingCount()));
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
    syncUp().then(async () => setPending(await pendingCount()));
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
      bus_id: bus.id,
      session_id: activeSession.id,
      volunteer_name: volunteerName,
      transcript: payload.transcript,
      ai_summary: payload.ai_summary,
      marks: payload.marks,
      notes: payload.notes,
      created_at: existingEntry?.created_at ?? new Date().toISOString(),
      synced: 0,
    });
    setActiveStudentId(null);
    syncUp().then(async () => setPending(await pendingCount()));
  }

  async function signOut() {
    const supabase = createClient();
    await supabase?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div>
          <p className="font-bold text-neutral-900">{bus.name}</p>
          <p className="text-xs text-neutral-500">{volunteerName}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${online ? "bg-green-500" : "bg-red-500"}`}
            title={online ? "Online" : "Offline"}
          />
          {pending > 0 && (
            <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
              {pending} pending
            </span>
          )}
          <button onClick={signOut} className="text-xs font-medium text-neutral-400">
            Sign out
          </button>
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
          volunteerName={volunteerName}
          existingEntry={existingEntry}
          onClose={() => setActiveStudentId(null)}
          onSave={saveFeedback}
        />
      )}
    </div>
  );
}
