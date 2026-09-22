"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Bus } from "@/lib/types";

interface Session {
  id: string;
  label: string;
  date: string;
}

interface FeedbackRow {
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
  students: { name: string } | null;
  buses: { name: string } | null;
  sessions: { label: string; date: string } | null;
}

type Tab = "feedback" | "buses";

const inputClass =
  "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg transition-colors focus:border-accent";

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("feedback");

  const [buses, setBuses] = useState<Bus[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refetchAll() {
    if (!supabase) return;
    setLoading(true);
    const [busesRes, sessionsRes, entriesRes] = await Promise.all([
      supabase.from("buses").select("*").order("name"),
      supabase.from("sessions").select("id, label, date").order("date"),
      supabase
        .from("feedback_entries")
        .select("*, students(name), buses(name), sessions(label, date)")
        .order("created_at", { ascending: false }),
    ]);
    setBuses(busesRes.data ?? []);
    setSessions(sessionsRes.data ?? []);
    setEntries((entriesRes.data as unknown as FeedbackRow[]) ?? []);
    setLoading(false);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch on mount
    refetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase?.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <div>
            <p className="text-base font-semibold tracking-tight">Soul Trek Admin</p>
            <p className="mt-0.5 text-xs text-muted">{adminName}</p>
          </div>
          <button
            onClick={signOut}
            className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-dim transition-colors active:bg-surface"
          >
            Sign out
          </button>
        </div>

        <nav className="mx-auto flex max-w-2xl gap-1.5 overflow-x-auto px-5 pb-3">
          {(
            [
              ["feedback", "Feedback"],
              ["buses", "Buses"],
            ] as [Tab, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-accent text-accent-ink"
                  : "bg-surface text-dim active:bg-surface-2"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-6 pb-16">
        {loading ? (
          <p className="py-12 text-center text-sm text-muted">Loading…</p>
        ) : tab === "buses" ? (
          <BusesTab buses={buses} onChange={refetchAll} supabase={supabase} />
        ) : (
          <FeedbackTab buses={buses} sessions={sessions} entries={entries} />
        )}
      </main>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="mb-4 text-sm font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="py-10 text-center text-sm text-muted">{children}</p>;
}

function BusesTab({
  buses,
  onChange,
  supabase,
}: {
  buses: Bus[];
  onChange: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  async function addBus(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !supabase) return;
    setSaving(true);
    await supabase.from("buses").insert({ name: trimmed });
    setName("");
    setSaving(false);
    onChange();
  }

  return (
    <div className="space-y-5">
      <SectionCard title="Add a bus">
        <form onSubmit={addBus} className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Bus name, e.g. Bus 9"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={saving || !name.trim()}
            className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-ink transition-opacity active:opacity-80 disabled:opacity-30"
          >
            Add
          </button>
        </form>
      </SectionCard>

      <div>
        <p className="mb-2.5 px-1 text-xs font-medium uppercase tracking-wider text-muted">
          {buses.length} {buses.length === 1 ? "bus" : "buses"}
        </p>
        {buses.length ? (
          <ul className="space-y-2">
            {buses.map((bus) => (
              <li
                key={bus.id}
                className="rounded-xl border border-line bg-surface px-4 py-3.5 text-sm font-medium"
              >
                {bus.name}
              </li>
            ))}
          </ul>
        ) : (
          <EmptyNote>No buses yet — add your first one above.</EmptyNote>
        )}
      </div>
    </div>
  );
}

function FeedbackTab({
  buses,
  sessions,
  entries,
}: {
  buses: Bus[];
  sessions: Session[];
  entries: FeedbackRow[];
}) {
  const [busFilter, setBusFilter] = useState("");
  const [sessionFilter, setSessionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = entries.filter((e) => {
    if (busFilter && e.bus_id !== busFilter) return false;
    if (sessionFilter && e.session_id !== sessionFilter) return false;
    if (search && !e.students?.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  function exportCsv() {
    const header = [
      "Learner",
      "Bus",
      "Session",
      "Date",
      "Volunteer",
      "Marks",
      "AI Summary",
      "Notes",
      "Transcript",
    ];
    const rows = filtered.map((e) => [
      e.students?.name ?? "",
      e.buses?.name ?? "",
      e.sessions?.label ?? "",
      e.sessions?.date ?? "",
      e.volunteer_name ?? "",
      e.marks?.toString() ?? "",
      e.ai_summary ?? "",
      e.notes ?? "",
      e.transcript ?? "",
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "soul-trek-feedback.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2.5 rounded-2xl border border-line bg-surface p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search learner name…"
          className={inputClass}
        />
        <div className="flex gap-2.5">
          <select
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">All buses</option>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <select
            value={sessionFilter}
            onChange={(e) => setSessionFilter(e.target.value)}
            className={inputClass}
          >
            <option value="">All sessions</option>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={exportCsv}
          disabled={!filtered.length}
          className="w-full rounded-lg border border-line py-2.5 text-sm font-medium text-dim transition-colors active:bg-surface-2 disabled:opacity-30"
        >
          Export {filtered.length} {filtered.length === 1 ? "row" : "rows"} to CSV
        </button>
      </div>

      {filtered.length ? (
        <ul className="space-y-2.5">
          {filtered.map((e) => {
            const isOpen = expanded === e.id;
            return (
              <li key={e.id} className="rounded-xl border border-line bg-surface p-4">
                <button
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                  className="flex w-full items-start justify-between gap-3 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {e.students?.name ?? "Unknown learner"}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {e.buses?.name} · {e.sessions?.label} · {e.volunteer_name}
                    </p>
                  </div>
                  {e.marks != null && (
                    <span className="shrink-0 rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold text-accent-soft">
                      {e.marks}/10
                    </span>
                  )}
                </button>

                {e.ai_summary && (
                  <p className="mt-3 rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm leading-relaxed text-dim">
                    {e.ai_summary}
                  </p>
                )}

                {isOpen && (
                  <div className="mt-3 space-y-3 border-t border-line pt-3">
                    {e.notes && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">
                          Volunteer notes
                        </p>
                        <p className="text-sm leading-relaxed text-dim">{e.notes}</p>
                      </div>
                    )}
                    {e.transcript && (
                      <div>
                        <p className="mb-1 text-xs font-medium uppercase tracking-wider text-muted">
                          Transcript
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                          {e.transcript}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyNote>
          {entries.length
            ? "No entries match these filters."
            : "No feedback recorded yet."}
        </EmptyNote>
      )}
    </div>
  );
}
