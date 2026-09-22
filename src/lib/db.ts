import Dexie, { type Table } from "dexie";
import type { Session, Student, FeedbackEntry } from "./types";

class SoulTrekDB extends Dexie {
  sessions!: Table<Session, string>;
  students!: Table<Student, string>;
  entries!: Table<FeedbackEntry, string>;

  constructor() {
    super("soul-trek-db");
    this.version(1).stores({
      sessions: "id, synced, date",
      students: "id, bus_id, synced",
      entries: "id, student_id, bus_id, session_id, synced",
    });
  }
}

export const db = new SoulTrekDB();

export function newId(): string {
  return crypto.randomUUID();
}
