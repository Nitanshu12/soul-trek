"use client";

import { db, newId } from "./db";
import { supabase, supabaseConfigured } from "./supabase/client";
import type { Complaint } from "./types";

const PHOTO_BUCKET = "id-cards";

export async function addComplaint(input: {
  busId: string;
  studentId: string | null;
  name: string;
  notes: string;
  volunteerName: string;
  photo: Blob;
}): Promise<void> {
  const id = newId();
  const created_at = new Date().toISOString();

  // The complaint appears in the bus's list right away (with a local preview of
  // the photo); the actual upload happens in the background sync loop.
  await db.complaints.add({
    id,
    bus_id: input.busId,
    student_id: input.studentId,
    name: input.name,
    notes: input.notes,
    volunteer_name: input.volunteerName,
    photo_url: null,
    status: "open",
    created_at,
    synced: 0,
  });
  await db.complaintPhotos.add({ id, blob: input.photo, created_at });
}

/**
 * Uploads queued ID-card photos and, once a photo lands, pushes its complaint
 * row. A complaint is never pushed to Supabase without its photo — if the
 * photo upload fails (offline, etc.) both stay queued together.
 */
export async function processPendingComplaintPhotos(): Promise<void> {
  if (!supabaseConfigured || !supabase) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const pending = await db.complaintPhotos.orderBy("created_at").toArray();
  for (const photo of pending) {
    const complaint = await db.complaints.get(photo.id);
    if (!complaint) {
      await db.complaintPhotos.delete(photo.id);
      continue;
    }

    try {
      const path = `${complaint.bus_id}/${complaint.id}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, photo.blob, { contentType: photo.blob.type || "image/jpeg" });
      if (uploadError) return; // offline or transient — retry next pass

      const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
      await db.complaints.put({ ...complaint, photo_url: data.publicUrl, synced: 0 });
      await db.complaintPhotos.delete(photo.id);
    } catch {
      return;
    }
  }
}

export async function syncComplaintsUp(): Promise<void> {
  if (!supabaseConfigured || !supabase) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  // Only push complaints that already have their photo uploaded.
  const pending = (await db.complaints.where("synced").equals(0).toArray()).filter(
    (c) => c.photo_url !== null
  );
  if (!pending.length) return;

  const { error } = await supabase.from("complaints").upsert(
    pending.map((c) => ({
      id: c.id,
      bus_id: c.bus_id,
      student_id: c.student_id,
      name: c.name,
      photo_url: c.photo_url,
      notes: c.notes,
      volunteer_name: c.volunteer_name,
      status: c.status,
      created_at: c.created_at,
    }))
  );
  if (!error) {
    await db.complaints.bulkPut(pending.map((c) => ({ ...c, synced: 1 as const })));
  }
}

export async function syncComplaintsDown(): Promise<void> {
  if (!supabaseConfigured || !supabase) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const pendingIds = new Set(
    (await db.complaints.where("synced").equals(0).toArray()).map((c) => c.id)
  );
  const { data } = await supabase.from("complaints").select("*");
  if (!data) return;
  const rows = (data as Complaint[])
    .filter((row) => !pendingIds.has(row.id))
    .map((row) => ({ ...row, synced: 1 as const }));
  if (rows.length) await db.complaints.bulkPut(rows);
}

export async function complaintsPendingCount(): Promise<number> {
  const photos = await db.complaintPhotos.count();
  const rows = await db.complaints.where("synced").equals(0).count();
  return Math.max(photos, rows);
}
