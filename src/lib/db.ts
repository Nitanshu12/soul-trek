import Dexie, { type Table } from "dexie";
import type {
  Bus,
  Session,
  Student,
  FeedbackEntry,
  PendingRecording,
  Complaint,
  PendingComplaintPhoto,
} from "./types";

class SoulTrekDB extends Dexie {
  buses!: Table<Bus, string>;
  sessions!: Table<Session, string>;
  students!: Table<Student, string>;
  entries!: Table<FeedbackEntry, string>;
  recordings!: Table<PendingRecording, string>;
  complaints!: Table<Complaint, string>;
  complaintPhotos!: Table<PendingComplaintPhoto, string>;

  constructor() {
    super("soul-trek-db");
    this.version(3).stores({
      // Buses are pull-only: the admin creates them, volunteers just read the cached list.
      buses: "id, name",
      sessions: "id, synced, date",
      students: "id, bus_id, synced",
      entries: "id, student_id, bus_id, session_id, synced",
      recordings: "id, created_at",
    });
    this.version(4).stores({
      complaints: "id, bus_id, student_id, synced",
      complaintPhotos: "id, created_at",
    });
  }
}

export const db = new SoulTrekDB();

export function newId(): string {
  return crypto.randomUUID();
}
