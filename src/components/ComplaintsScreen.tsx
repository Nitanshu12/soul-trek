"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { getVolunteerName } from "@/lib/auth";
import { useOnline } from "@/lib/useOnline";
import {
  addComplaint,
  complaintsPendingCount,
  processPendingComplaintPhotos,
  syncComplaintsDown,
  syncComplaintsUp,
} from "@/lib/complaints";
import type { Complaint, Student } from "@/lib/types";
import ComplaintsList from "./ComplaintsList";
import ComplaintForm from "./ComplaintForm";

const EMPTY_STUDENTS: Student[] = [];
const EMPTY_COMPLAINTS: Complaint[] = [];

export default function ComplaintsScreen({ busId }: { busId: string }) {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [volunteer, setVolunteer] = useState("");

  const bus = useLiveQuery(() => db.buses.get(busId), [busId]);
  const students =
    useLiveQuery(() => db.students.where("bus_id").equals(busId).toArray(), [busId]) ??
    EMPTY_STUDENTS;
  const complaints =
    useLiveQuery(
      () =>
        db.complaints
          .where("bus_id")
          .equals(busId)
          .reverse()
          .sortBy("created_at"),
      [busId]
    ) ?? EMPTY_COMPLAINTS;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read after hydration, see VolunteerApp
    setVolunteer(getVolunteerName());
  }, []);

  useEffect(() => {
    const run = async () => {
      await syncComplaintsDown();
      await processPendingComplaintPhotos();
      await syncComplaintsUp();
      setPending(await complaintsPendingCount());
    };
    run();
    window.addEventListener("online", run);
    const interval = setInterval(run, 20000);
    return () => {
      window.removeEventListener("online", run);
      clearInterval(interval);
    };
  }, []);

  async function handleSubmit(input: {
    name: string;
    studentId: string | null;
    notes: string;
    photo: Blob;
  }) {
    await addComplaint({
      busId,
      studentId: input.studentId,
      name: input.name,
      notes: input.notes,
      volunteerName: volunteer,
      photo: input.photo,
    });
    setShowForm(false);
    processPendingComplaintPhotos()
      .then(syncComplaintsUp)
      .then(async () => setPending(await complaintsPendingCount()));
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href={`/bus/${busId}`}
            className="shrink-0 rounded-lg border border-line px-2.5 py-1.5 text-sm text-dim transition-colors active:bg-surface"
          >
            ‹
          </Link>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight">
              {bus?.name ?? "Bus"} · Complaints
            </p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${online ? "bg-ok" : "bg-danger"}`}
              />
              <p className="truncate text-xs text-muted">
                {pending > 0 ? `${pending} to sync` : "Up to date"}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <ComplaintsList complaints={complaints} />
      </div>

      <div className="border-t border-line bg-bg px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-accent-ink transition-opacity active:opacity-80"
        >
          + Complaint
        </button>
      </div>

      {showForm && (
        <ComplaintForm
          students={students}
          onClose={() => setShowForm(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
