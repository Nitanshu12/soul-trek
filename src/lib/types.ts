// synced is 0/1 (not boolean) because IndexedDB cannot index boolean key paths

// Buses are admin-managed (created in the /admin dashboard) and always fetched live —
// they are not cached in the offline queue below.
export interface Bus {
  id: string;
  name: string;
  created_at: string;
}

// Who's assigned to a bus, for accountability only — admin-managed, read by
// anyone, cached locally like Bus since it's pull-only from the client.
export interface BusVolunteer {
  id: string;
  bus_id: string;
  name: string;
  created_at: string;
}

export interface Session {
  id: string;
  label: string; // e.g. "Day 1", "Day 2 - Evening" — free text, volunteer chooses
  date: string; // ISO date, defaults to when the session was created
  created_at: string;
  synced: 0 | 1;
}

export interface Student {
  id: string;
  bus_id: string;
  name: string;
  enrollment_number: string | null;
  created_at: string;
  synced: 0 | 1;
}

// Audio waiting to be transcribed. Keyed by the feedback entry it belongs to and
// held locally until Whisper returns a transcript, so a recording is never lost
// to bad signal or a rate limit.
export interface PendingRecording {
  id: string;
  blob: Blob;
  created_at: string;
}

export type Satisfaction = "satisfactory" | "unsatisfactory";

export interface FeedbackEntry {
  id: string;
  student_id: string;
  bus_id: string;
  session_id: string;
  volunteer_name: string;
  transcript: string;
  ai_summary: string | null;
  marks: number | null;
  satisfaction: Satisfaction | null;
  notes: string;
  created_at: string;
  synced: 0 | 1;
}

export type ComplaintStatus = "open" | "resolved";

export interface Complaint {
  id: string;
  bus_id: string;
  student_id: string | null;
  name: string;
  photo_url: string | null;
  notes: string;
  volunteer_name: string;
  status: ComplaintStatus;
  created_at: string;
  synced: 0 | 1;
}

// An ID-card photo waiting to be uploaded to storage. Keyed by the complaint it
// belongs to, mirroring PendingRecording's offline-queue pattern.
export interface PendingComplaintPhoto {
  id: string;
  blob: Blob;
  created_at: string;
}
