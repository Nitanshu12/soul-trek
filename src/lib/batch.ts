"use client";

import { db } from "./db";
import { supabase, supabaseConfigured } from "./supabase/client";

const VERSION_KEY = "soul-trek-data-version";
const VOLUNTEER_NAME_KEY = "soul-trek-volunteer-name";

/**
 * Detects when the admin has started a new batch (server data_version bumped)
 * and, if so, wipes this phone's cached data so old-batch students/feedback
 * never linger offline. Runs before every sync-down.
 *
 * Returns true if it cleared the cache, so the caller can force a reload.
 */
export async function checkBatchReset(): Promise<boolean> {
  if (!supabaseConfigured || !supabase) return false;
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;

  const { data, error } = await supabase
    .from("app_config")
    .select("data_version")
    .single();
  if (error || !data) return false;

  const serverVersion = String(data.data_version);
  const localVersion =
    typeof localStorage !== "undefined" ? localStorage.getItem(VERSION_KEY) : null;

  // First run on this phone: just record the version, nothing to clear.
  if (localVersion === null) {
    try {
      localStorage.setItem(VERSION_KEY, serverVersion);
    } catch {
      /* private mode — ignore */
    }
    return false;
  }

  if (localVersion === serverVersion) return false;

  // A new batch has started. Drop every cached table and the saved volunteer
  // name, then record the new version so this only happens once per batch.
  await Promise.all([
    db.buses.clear(),
    db.busVolunteers.clear(),
    db.sessions.clear(),
    db.students.clear(),
    db.entries.clear(),
    db.complaints.clear(),
    db.recordings.clear(),
    db.complaintPhotos.clear(),
  ]);
  try {
    localStorage.setItem(VERSION_KEY, serverVersion);
    localStorage.removeItem(VOLUNTEER_NAME_KEY);
  } catch {
    /* ignore */
  }
  return true;
}
