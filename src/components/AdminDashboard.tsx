"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Bus } from "@/lib/types";

interface VolunteerProfile {
  id: string;
  username: string | null;
  display_name: string | null;
  bus_id: string | null;
  created_at: string;
}

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

type Tab = "feedback" | "buses" | "volunteers";

export default function AdminDashboard({ adminName }: { adminName: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<Tab>("feedback");

  const [buses, setBuses] = useState<Bus[]>([]);
  const [volunteers, setVolunteers] = useState<VolunteerProfile[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [entries, setEntries] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function refetchAll() {
    if (!supabase) return;
    setLoading(true);
    const [busesRes, volunteersRes, sessionsRes, entriesRes] = await Promise.all([
      supabase.from("buses").select("*").order("name"),
      supabase
        .from("profiles")
        .select("id, username, display_name, bus_id, created_at")
        .eq("role", "volunteer")
        .order("created_at"),
      supabase.from("sessions").select("id, label, date").order("date"),
      supabase
        .from("feedback_entries")
        .select(
          "*, students(name), buses(name), sessions(label, date)"
        )
        .order("created_at", { ascending: false }),
    ]);
    setBuses(busesRes.data ?? []);
    setVolunteers(volunteersRes.data ?? []);
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
    <div className="min-h-dvh bg-neutral-50 pb-10">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div>
          <p className="font-bold text-neutral-900">Soul Trek Admin</p>
          <p className="text-xs text-neutral-500">{adminName}</p>
        </div>
        <button onClick={signOut} className="text-xs font-medium text-neutral-400">
          Sign out
        </button>
      </header>

      <nav className="flex gap-2 overflow-x-auto border-b border-neutral-200 bg-white px-3 py-2">
        {(
          [
            ["feedback", "Feedback"],
            ["buses", "Buses"],
            ["volunteers", "Volunteers"],
          ] as [Tab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
              tab === key ? "bg-orange-600 text-white" : "bg-neutral-100 text-neutral-700"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <main className="px-3 py-4">
        {loading ? (
          <p className="text-center text-sm text-neutral-400">Loading...</p>
        ) : tab === "buses" ? (
          <BusesTab buses={buses} onChange={refetchAll} supabase={supabase} />
        ) : tab === "volunteers" ? (
          <VolunteersTab
            buses={buses}
            volunteers={volunteers}
            onChange={refetchAll}
          />
        ) : (
          <FeedbackTab buses={buses} sessions={sessions} entries={entries} />
        )}
      </main>
    </div>
  );
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
    <div>
      <form onSubmit={addBus} className="mb-4 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New bus name (e.g. Bus 9)"
          className="flex-1 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none"
        />
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="shrink-0 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          Add bus
        </button>
      </form>

      <ul className="space-y-2">
        {buses.map((bus) => (
          <li
            key={bus.id}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm font-medium text-neutral-900"
          >
            {bus.name}
          </li>
        ))}
        {!buses.length && (
          <p className="text-center text-sm text-neutral-400">No buses yet.</p>
        )}
      </ul>
    </div>
  );
}

function VolunteersTab({
  buses,
  volunteers,
  onChange,
}: {
  buses: Bus[];
  volunteers: VolunteerProfile[];
  onChange: () => void;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [busId, setBusId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const busName = (id: string | null) => buses.find((b) => b.id === id)?.name ?? "—";

  async function addVolunteer(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password || !busId) {
      setError("Username, password and bus are required.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/create-volunteer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, displayName, busId }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Failed to create volunteer");
      return;
    }
    setUsername("");
    setDisplayName("");
    setPassword("");
    setBusId("");
    onChange();
  }

  async function resetPassword(volunteerId: string) {
    const newPassword = prompt("New password for this volunteer (min 6 characters):");
    if (!newPassword) return;
    const res = await fetch("/api/admin/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerId, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error ?? "Failed to reset password");
    else alert("Password updated.");
  }

  async function removeVolunteer(volunteerId: string, label: string) {
    if (!confirm(`Remove login for "${label}"? This can't be undone.`)) return;
    const res = await fetch("/api/admin/delete-volunteer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ volunteerId }),
    });
    const data = await res.json();
    if (!res.ok) alert(data.error ?? "Failed to remove volunteer");
    else onChange();
  }

  return (
    <div>
      <form onSubmit={addVolunteer} className="mb-4 space-y-2 rounded-xl border border-neutral-200 bg-white p-3">
        <p className="text-sm font-semibold text-neutral-900">Add volunteer login</p>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username (e.g. rahul.bus1)"
          autoCapitalize="none"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
        />
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display name (optional, e.g. Rahul)"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 characters)"
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
        />
        <select
          value={busId}
          onChange={(e) => setBusId(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
        >
          <option value="">Assign to bus...</option>
          {buses.map((bus) => (
            <option key={bus.id} value={bus.id}>
              {bus.name}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-full rounded-lg bg-orange-600 py-2 text-sm font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Creating..." : "Create login"}
        </button>
      </form>

      <ul className="space-y-2">
        {volunteers.map((v) => (
          <li
            key={v.id}
            className="rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900">
                  {v.display_name || v.username}
                </p>
                <p className="text-xs text-neutral-500">
                  @{v.username} · {busName(v.bus_id)}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <button
                  onClick={() => resetPassword(v.id)}
                  className="text-xs font-medium text-orange-600"
                >
                  Reset password
                </button>
                <button
                  onClick={() => removeVolunteer(v.id, v.display_name || v.username || "")}
                  className="text-xs font-medium text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
        {!volunteers.length && (
          <p className="text-center text-sm text-neutral-400">No volunteers yet.</p>
        )}
      </ul>
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
      .map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      )
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
    <div>
      <div className="mb-3 flex flex-col gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search learner name..."
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm outline-none"
        />
        <div className="flex gap-2">
          <select
            value={busFilter}
            onChange={(e) => setBusFilter(e.target.value)}
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm outline-none"
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
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-2 py-2 text-sm outline-none"
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
          className="rounded-lg border border-orange-300 bg-orange-50 py-2 text-sm font-medium text-orange-700 disabled:opacity-40"
        >
          Export {filtered.length} rows to CSV
        </button>
      </div>

      <ul className="space-y-2">
        {filtered.map((e) => {
          const isOpen = expanded === e.id;
          return (
            <li key={e.id} className="rounded-xl border border-neutral-200 bg-white p-3">
              <button
                onClick={() => setExpanded(isOpen ? null : e.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <div>
                  <p className="font-medium text-neutral-900">{e.students?.name ?? "Unknown"}</p>
                  <p className="text-xs text-neutral-500">
                    {e.buses?.name} · {e.sessions?.label} · by {e.volunteer_name}
                  </p>
                </div>
                {e.marks != null && (
                  <span className="shrink-0 rounded-full bg-neutral-900 px-2 py-0.5 text-xs font-medium text-white">
                    {e.marks}/10
                  </span>
                )}
              </button>

              {e.ai_summary && (
                <p className="mt-2 rounded-lg bg-orange-50 px-3 py-2 text-sm text-neutral-700">
                  {e.ai_summary}
                </p>
              )}

              {isOpen && (
                <div className="mt-2 space-y-2 border-t border-neutral-100 pt-2">
                  {e.notes && (
                    <p className="text-sm text-neutral-700">
                      <span className="font-medium">Volunteer notes: </span>
                      {e.notes}
                    </p>
                  )}
                  {e.transcript && (
                    <p className="whitespace-pre-wrap text-sm text-neutral-500">
                      <span className="font-medium text-neutral-700">Transcript: </span>
                      {e.transcript}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
        {!filtered.length && (
          <p className="text-center text-sm text-neutral-400">No feedback entries match.</p>
        )}
      </ul>
    </div>
  );
}
