import { db } from "./db";
import { supabase, supabaseConfigured } from "./supabase/client";
import type { Bus, BusVolunteer, Session, Student, FeedbackEntry } from "./types";

let syncing = false;

async function pushTable<T extends { id: string; synced: 0 | 1 }>(
  table: "sessions" | "students" | "entries",
  supabaseTable: string,
  toRow: (item: T) => Record<string, unknown>
) {
  if (!supabase) return;
  const dexieTable = db[table] as unknown as import("dexie").Table<T, string>;
  const pending = await dexieTable.where("synced").equals(0).toArray();
  if (!pending.length) return;
  const { error } = await supabase.from(supabaseTable).upsert(pending.map(toRow));
  if (!error) {
    await dexieTable.bulkPut(pending.map((item) => ({ ...item, synced: 1 as const })));
  }
}

export async function syncUp(): Promise<void> {
  if (!supabaseConfigured || !supabase || syncing) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  syncing = true;
  try {
    await pushTable<Session>("sessions", "sessions", (s) => ({
      id: s.id,
      label: s.label,
      date: s.date,
      created_at: s.created_at,
    }));
    await pushTable<Student>("students", "students", (s) => ({
      id: s.id,
      bus_id: s.bus_id,
      name: s.name,
      enrollment_number: s.enrollment_number,
      created_at: s.created_at,
    }));
    await pushTable<FeedbackEntry>("entries", "feedback_entries", (e) => ({
      id: e.id,
      student_id: e.student_id,
      bus_id: e.bus_id,
      session_id: e.session_id,
      volunteer_name: e.volunteer_name,
      transcript: e.transcript,
      ai_summary: e.ai_summary,
      marks: e.marks,
      satisfaction: e.satisfaction,
      notes: e.notes,
      created_at: e.created_at,
    }));
  } finally {
    syncing = false;
  }
}

async function pullTable<T extends { id: string; synced: 0 | 1 }>(
  table: "sessions" | "students" | "entries",
  supabaseTable: string
) {
  if (!supabase) return;
  const dexieTable = db[table] as unknown as import("dexie").Table<T, string>;
  const pendingIds = new Set(
    (await dexieTable.where("synced").equals(0).toArray()).map((item) => item.id)
  );
  const { data } = await supabase.from(supabaseTable).select("*");
  if (!data) return;
  const rows = (data as T[])
    .filter((row) => !pendingIds.has(row.id))
    .map((row) => ({ ...row, synced: 1 as const }));
  if (rows.length) await dexieTable.bulkPut(rows);
}

export async function syncDown(): Promise<void> {
  if (!supabaseConfigured || !supabase) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const { data: remoteBuses } = await supabase.from("buses").select("*");
  if (remoteBuses) await db.buses.bulkPut(remoteBuses as Bus[]);

  const { data: remoteVolunteers } = await supabase.from("bus_volunteers").select("*");
  if (remoteVolunteers) await db.busVolunteers.bulkPut(remoteVolunteers as BusVolunteer[]);

  await pullTable<Session>("sessions", "sessions");
  await pullTable<Student>("students", "students");
  await pullTable<FeedbackEntry>("entries", "feedback_entries");
}

export async function pendingCount(): Promise<number> {
  const se = await db.sessions.where("synced").equals(0).count();
  const st = await db.students.where("synced").equals(0).count();
  const e = await db.entries.where("synced").equals(0).count();
  const rec = await db.recordings.count();
  return se + st + e + rec;
}
