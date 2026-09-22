// synced is 0/1 (not boolean) because IndexedDB cannot index boolean key paths

// Buses are admin-managed (created in the /admin dashboard) and always fetched live —
// they are not cached in the offline queue below.
export interface Bus {
  id: string;
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
  created_at: string;
  synced: 0 | 1;
}

export interface FeedbackEntry {
  id: string;
  student_id: string;
  bus_id: string;
  session_id: string;
  volunteer_name: string;
  transcript: string;
  ai_summary: string | null;
  marks: number | null;
  notes: string;
  created_at: string;
  synced: 0 | 1;
}
