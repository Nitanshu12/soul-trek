"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/lib/db";
import { pendingCount, syncDown, syncUp } from "@/lib/sync";
import { processPendingRecordings } from "@/lib/transcription";
import { useOnline } from "@/lib/useOnline";
import type { Bus, BusVolunteer } from "@/lib/types";

const EMPTY_BUSES: Bus[] = [];
const EMPTY_VOLUNTEERS: BusVolunteer[] = [];

export default function BusPicker() {
  const online = useOnline();
  const [pending, setPending] = useState(0);
  const [loaded, setLoaded] = useState(false);

  const buses = useLiveQuery(() => db.buses.orderBy("name").toArray(), []) ?? EMPTY_BUSES;
  const students = useLiveQuery(() => db.students.toArray(), []) ?? [];
  const volunteers = useLiveQuery(() => db.busVolunteers.toArray(), []) ?? EMPTY_VOLUNTEERS;

  useEffect(() => {
    const run = async () => {
      await syncDown();
      await processPendingRecordings();
      await syncUp();
      setPending(await pendingCount());
      setLoaded(true);
    };
    run();
    window.addEventListener("online", run);
    const interval = setInterval(run, 20000);
    return () => {
      window.removeEventListener("online", run);
      clearInterval(interval);
    };
  }, []);

  const countFor = (busId: string) => students.filter((s) => s.bus_id === busId).length;
  const volunteersFor = (busId: string) =>
    volunteers.filter((v) => v.bus_id === busId).map((v) => v.name);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Soul Trek 2026</h1>
        <div className="mt-1.5 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${online ? "bg-ok" : "bg-danger"}`}
          />
          <p className="text-sm text-dim">
            {online ? "Online" : "Offline"}
            {pending > 0 && ` · ${pending} to sync`}
          </p>
        </div>
      </header>

      <p className="mb-4 text-xs font-medium uppercase tracking-wider text-muted">
        Select your bus
      </p>

      {buses.length ? (
        <ul className="space-y-2.5">
          {buses.map((bus) => {
            const count = countFor(bus.id);
            const names = volunteersFor(bus.id);
            return (
              <li key={bus.id}>
                <Link
                  href={`/bus/${bus.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-5 py-5 transition-colors active:bg-surface-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold">{bus.name}</p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {count} {count === 1 ? "learner" : "learners"}
                      {names.length > 0 && ` · ${names.join(", ")}`}
                    </p>
                  </div>
                  <span className="shrink-0 text-lg text-muted">›</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="py-16 text-center text-sm leading-relaxed text-muted">
          {loaded
            ? "No buses set up yet. Ask the admin to add them."
            : "Loading buses…"}
        </p>
      )}

      <div className="mt-auto pt-10 text-center">
        <Link href="/admin" className="text-xs text-muted underline-offset-4 hover:underline">
          Made with Soul
        </Link>
      </div>
    </div>
  );
}
