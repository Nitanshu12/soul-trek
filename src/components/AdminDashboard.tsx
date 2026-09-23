"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Bus, BusVolunteer, Satisfaction } from "@/lib/types";

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
  satisfaction: Satisfaction | null;
  notes: string;
  created_at: string;
  students: { name: string; enrollment_number: string | null } | null;
  buses: { name: string } | null;
  sessions: { label: string; date: string } | null;
}

interface ComplaintRow {
  id: string;
  bus_id: string;
  student_id: string | null;
  name: string;
  photo_url: string | null;
  notes: string;
  volunteer_name: string;
  status: "open" | "resolved";
  created_at: string;
  buses: { name: string } | null;
}

type Tab = "feedback" | "complaints" | "buses";

const inputClass =
  "w-full rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg transition-colors focus:border-accent";

function SatisfactionBadge({ value }: { value: Satisfaction | null }) {
  if (!value) return null;
  const ok = value === "satisfactory";
  return (
    <span
      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${
        ok ? "bg-ok/15 text-ok" : "bg-danger/15 text-danger"
      }`}
    >
      {ok ? "Satisfactory" : "Unsatisfactory"}
    </span>
  );
}

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("feedback");

  const [buses, setBuses] = useState<Bus[]>([]);
  const [busVolunteers, setBusVolunteers] = useState<BusVolunteer[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<FeedbackRow[]>([]);
  const [complaints, setComplaints] = useState<ComplaintRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [profileStudent, setProfileStudent] = useState<{
    id: string;
    name: string;
  } | null>(null);

  async function refetchAll() {
    if (!supabase) return;
    setLoading(true);
    const [busesRes, volunteersRes, sessionsRes, entriesRes, complaintsRes] = await Promise.all([
      supabase.from("buses").select("*").order("name"),
      supabase.from("bus_volunteers").select("*").order("created_at"),
      supabase.from("sessions").select("id, label, date").order("date"),
      supabase
        .from("feedback_entries")
        .select("*, students(name, enrollment_number), buses(name), sessions(label, date)")
        .order("created_at", { ascending: false }),
      supabase
        .from("complaints")
        .select("*, buses(name)")
        .order("created_at", { ascending: false }),
    ]);
    setBuses(busesRes.data ?? []);
    setBusVolunteers(volunteersRes.data ?? []);
    setSessions(sessionsRes.data ?? []);
    setEntries((entriesRes.data as unknown as FeedbackRow[]) ?? []);
    setComplaints((complaintsRes.data as unknown as ComplaintRow[]) ?? []);
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

  const openComplaintCount = complaints.filter((c) => c.status === "open").length;

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
              ["complaints", `Complaints${openComplaintCount ? ` (${openComplaintCount})` : ""}`],
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
          <BusesTab
            buses={buses}
            busVolunteers={busVolunteers}
            onChange={refetchAll}
            supabase={supabase}
          />
        ) : tab === "complaints" ? (
          <ComplaintsTab
            buses={buses}
            complaints={complaints}
            supabase={supabase}
            onChange={refetchAll}
            onViewProfile={(id, name) => setProfileStudent({ id, name })}
          />
        ) : (
          <FeedbackTab
            buses={buses}
            sessions={sessions}
            entries={entries}
            onViewProfile={(id, name) => setProfileStudent({ id, name })}
          />
        )}
      </main>

      {profileStudent && (
        <StudentProfile
          studentName={profileStudent.name}
          entries={entries.filter((e) => e.student_id === profileStudent.id)}
          complaints={complaints.filter((c) => c.student_id === profileStudent.id)}
          onClose={() => setProfileStudent(null)}
        />
      )}
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
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
  busVolunteers,
  onChange,
  supabase,
}: {
  buses: Bus[];
  busVolunteers: BusVolunteer[];
  onChange: () => void;
  supabase: ReturnType<typeof createClient>;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedBusId, setExpandedBusId] = useState<string | null>(null);

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
            {buses.map((bus) => {
              const roster = busVolunteers.filter((v) => v.bus_id === bus.id);
              const isOpen = expandedBusId === bus.id;
              return (
                <li key={bus.id} className="rounded-xl border border-line bg-surface p-4">
                  <button
                    onClick={() => setExpandedBusId(isOpen ? null : bus.id)}
                    className="flex w-full items-center justify-between gap-3 text-left"
                  >
                    <span className="text-sm font-medium">{bus.name}</span>
                    <span className="shrink-0 text-xs text-muted">
                      {roster.length
                        ? roster.map((v) => v.name).join(", ")
                        : "No volunteers assigned"}
                    </span>
                  </button>
                  {isOpen && (
                    <BusVolunteerRoster
                      bus={bus}
                      roster={roster}
                      supabase={supabase}
                      onChange={onChange}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyNote>No buses yet — add your first one above.</EmptyNote>
        )}
      </div>
    </div>
  );
}

function BusVolunteerRoster({
  bus,
  roster,
  supabase,
  onChange,
}: {
  bus: Bus;
  roster: BusVolunteer[];
  supabase: ReturnType<typeof createClient>;
  onChange: () => void;
}) {
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addVolunteer(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !supabase) return;
    setSaving(true);
    setError(null);
    const { error: insertError } = await supabase
      .from("bus_volunteers")
      .insert({ bus_id: bus.id, name: trimmed });
    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setName("");
    onChange();
  }

  async function removeVolunteer(id: string) {
    if (!supabase) return;
    const { error: deleteError } = await supabase.from("bus_volunteers").delete().eq("id", id);
    if (deleteError) {
      setError(deleteError.message);
      return;
    }
    onChange();
  }

  return (
    <div className="mt-3 border-t border-line pt-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted">
        Volunteers on this bus
      </p>
      {roster.length ? (
        <ul className="mb-3 flex flex-wrap gap-1.5">
          {roster.map((v) => (
            <li
              key={v.id}
              className="flex items-center gap-1.5 rounded-full bg-surface-2 py-1 pl-3 pr-1.5 text-xs"
            >
              {v.name}
              <button
                onClick={() => removeVolunteer(v.id)}
                className="flex h-4 w-4 items-center justify-center rounded-full text-muted transition-colors active:bg-danger/15 active:text-danger"
                aria-label={`Remove ${v.name}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-muted">No one assigned yet.</p>
      )}
      {error && (
        <p className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-xs text-danger">
          {error}
        </p>
      )}
      <form onSubmit={addVolunteer} className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Volunteer's name"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="shrink-0 rounded-lg border border-line px-3 py-2.5 text-xs font-medium text-dim transition-colors active:bg-surface-2 disabled:opacity-30"
        >
          Add
        </button>
      </form>
    </div>
  );
}

function FeedbackTab({
  buses,
  sessions,
  entries,
  onViewProfile,
}: {
  buses: Bus[];
  sessions: Session[];
  entries: FeedbackRow[];
  onViewProfile: (studentId: string, name: string) => void;
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
      "Enrollment No.",
      "Bus",
      "Session",
      "Date",
      "Volunteer",
      "Marks",
      "Satisfaction",
      "AI Summary",
      "Notes",
      "Transcript",
    ];
    const rows = filtered.map((e) => [
      e.students?.name ?? "",
      e.students?.enrollment_number ?? "",
      e.buses?.name ?? "",
      e.sessions?.label ?? "",
      e.sessions?.date ?? "",
      e.volunteer_name ?? "",
      e.marks?.toString() ?? "",
      e.satisfaction ?? "",
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
                <div className="flex items-start justify-between gap-3">
                  <button
                    onClick={() =>
                      onViewProfile(e.student_id, e.students?.name ?? "Unknown learner")
                    }
                    className="min-w-0 text-left"
                  >
                    <p className="truncate text-sm font-medium underline decoration-line decoration-dotted underline-offset-4">
                      {e.students?.name ?? "Unknown learner"}
                      {e.students?.enrollment_number && (
                        <span className="ml-1.5 font-normal text-muted">
                          · {e.students.enrollment_number}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted">
                      {e.buses?.name} · {e.sessions?.label} · {e.volunteer_name}
                    </p>
                  </button>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <SatisfactionBadge value={e.satisfaction} />
                    {e.marks != null && (
                      <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold text-accent-soft">
                        {e.marks}/10
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => setExpanded(isOpen ? null : e.id)}
                  className="mt-3 block w-full text-left"
                >
                  {e.ai_summary && (
                    <p className="rounded-lg border border-line bg-surface-2 px-3.5 py-3 text-sm leading-relaxed text-dim">
                      {e.ai_summary}
                    </p>
                  )}
                </button>

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
          {entries.length ? "No entries match these filters." : "No feedback recorded yet."}
        </EmptyNote>
      )}
    </div>
  );
}

function ComplaintsTab({
  buses,
  complaints,
  supabase,
  onChange,
  onViewProfile,
}: {
  buses: Bus[];
  complaints: ComplaintRow[];
  supabase: ReturnType<typeof createClient>;
  onChange: () => void;
  onViewProfile: (studentId: string, name: string) => void;
}) {
  const [busFilter, setBusFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | "open" | "resolved">("");
  const [lightbox, setLightbox] = useState<string | null>(null);

  const filtered = complaints.filter((c) => {
    if (busFilter && c.bus_id !== busFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  async function toggleStatus(complaint: ComplaintRow) {
    if (!supabase) return;
    const next = complaint.status === "open" ? "resolved" : "open";
    await supabase.from("complaints").update({ status: next }).eq("id", complaint.id);
    onChange();
  }

  return (
    <div className="space-y-5">
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "" | "open" | "resolved")}
          className={inputClass}
        >
          <option value="">All statuses</option>
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
        </select>
      </div>

      {filtered.length ? (
        <ul className="space-y-2.5">
          {filtered.map((c) => (
            <li key={c.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex gap-3">
                {c.photo_url ? (
                  <button
                    onClick={() => setLightbox(c.photo_url)}
                    className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-line"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.photo_url}
                      alt={`${c.name}'s ID card`}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ) : (
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-surface-2" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => onViewProfile(c.student_id ?? "", c.name)}
                      disabled={!c.student_id}
                      className="min-w-0 text-left disabled:cursor-default"
                    >
                      <p
                        className={`truncate text-sm font-medium ${
                          c.student_id ? "underline decoration-line decoration-dotted underline-offset-4" : ""
                        }`}
                      >
                        {c.name}
                      </p>
                    </button>
                    <button
                      onClick={() => toggleStatus(c)}
                      className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        c.status === "open"
                          ? "bg-accent/15 text-accent-soft"
                          : "bg-ok/15 text-ok"
                      }`}
                    >
                      {c.status === "open" ? "Open" : "Resolved"}
                    </button>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {c.buses?.name} · {c.volunteer_name}
                  </p>
                  {c.notes && (
                    <p className="mt-1.5 text-sm leading-relaxed text-dim">{c.notes}</p>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyNote>
          {complaints.length
            ? "No complaints match these filters."
            : "No complaints filed yet."}
        </EmptyNote>
      )}

      {lightbox && (
        <button
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="ID card" className="max-h-full max-w-full rounded-lg object-contain" />
        </button>
      )}
    </div>
  );
}

function StudentProfile({
  studentName,
  entries,
  complaints,
  onClose,
}: {
  studentName: string;
  entries: FeedbackRow[];
  complaints: ComplaintRow[];
  onClose: () => void;
}) {
  const marksGiven = entries.filter((e) => e.marks != null).map((e) => e.marks as number);
  const avgMarks = marksGiven.length
    ? (marksGiven.reduce((a, b) => a + b, 0) / marksGiven.length).toFixed(1)
    : null;
  const satisfactoryCount = entries.filter((e) => e.satisfaction === "satisfactory").length;
  const unsatisfactoryCount = entries.filter((e) => e.satisfaction === "unsatisfactory").length;
  const enrollmentNumber = entries.find((e) => e.students?.enrollment_number)?.students
    ?.enrollment_number;

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{studentName}</p>
          <p className="mt-0.5 text-xs text-muted">
            {enrollmentNumber && `${enrollmentNumber} · `}
            {entries.length} feedback · {complaints.length} complaint
            {complaints.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-dim transition-colors active:bg-surface"
        >
          Close
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-6 grid grid-cols-3 gap-2.5">
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <p className="text-lg font-semibold">{avgMarks ?? "—"}</p>
            <p className="mt-0.5 text-[11px] text-muted">Avg marks</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <p className="text-lg font-semibold text-ok">{satisfactoryCount}</p>
            <p className="mt-0.5 text-[11px] text-muted">Satisfactory</p>
          </div>
          <div className="rounded-xl border border-line bg-surface p-3 text-center">
            <p className="text-lg font-semibold text-danger">{unsatisfactoryCount}</p>
            <p className="mt-0.5 text-[11px] text-muted">Unsatisfactory</p>
          </div>
        </div>

        <p className="mb-2.5 px-1 text-xs font-medium uppercase tracking-wider text-muted">
          Feedback history
        </p>
        <ul className="mb-6 space-y-2.5">
          {entries.map((e) => (
            <li key={e.id} className="rounded-xl border border-line bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium">{e.sessions?.label ?? "Session"}</p>
                <div className="flex shrink-0 items-center gap-1.5">
                  <SatisfactionBadge value={e.satisfaction} />
                  {e.marks != null && (
                    <span className="rounded-md bg-surface-2 px-2 py-1 text-xs font-semibold text-accent-soft">
                      {e.marks}/10
                    </span>
                  )}
                </div>
              </div>
              {e.ai_summary && (
                <p className="mt-2 text-sm leading-relaxed text-dim">{e.ai_summary}</p>
              )}
              {e.notes && (
                <p className="mt-2 text-xs leading-relaxed text-muted">Note: {e.notes}</p>
              )}
            </li>
          ))}
          {!entries.length && <EmptyNote>No feedback recorded for this learner.</EmptyNote>}
        </ul>

        <p className="mb-2.5 px-1 text-xs font-medium uppercase tracking-wider text-muted">
          Complaints
        </p>
        <ul className="space-y-2.5">
          {complaints.map((c) => (
            <li key={c.id} className="flex gap-3 rounded-xl border border-line bg-surface p-4">
              {c.photo_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={c.photo_url}
                  alt="ID card"
                  className="h-14 w-14 shrink-0 rounded-lg border border-line object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs text-muted">
                  {c.buses?.name} · {c.volunteer_name}
                </p>
                {c.notes && <p className="mt-1 text-sm text-dim">{c.notes}</p>}
              </div>
            </li>
          ))}
          {!complaints.length && (
            <EmptyNote>No complaints filed for this learner.</EmptyNote>
          )}
        </ul>
      </div>
    </div>
  );
}
