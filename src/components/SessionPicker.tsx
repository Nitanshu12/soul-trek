"use client";

import { useState } from "react";
import type { Session } from "@/lib/types";

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export default function SessionPicker({
  sessions,
  selectedSessionId,
  onSelect,
  onAddSession,
}: {
  sessions: Session[];
  selectedSessionId: string | null;
  onSelect: (id: string) => void;
  onAddSession: (label: string, date: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState(`Day ${sessions.length + 1}`);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));

  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));

  return (
    <div className="border-b border-neutral-200 bg-orange-50/60 px-3 py-2">
      <div className="flex items-center gap-2 overflow-x-auto">
        <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-neutral-500">
          Session
        </span>
        {sorted.map((s) => {
          const active = s.id === selectedSessionId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium ${
                active ? "bg-neutral-900 text-white" : "bg-white text-neutral-700 border border-neutral-200"
              }`}
            >
              {s.label} <span className="opacity-60">· {formatDate(s.date)}</span>
            </button>
          );
        })}

        {!adding && (
          <button
            onClick={() => {
              setLabel(`Day ${sessions.length + 1}`);
              setAdding(true);
            }}
            className="shrink-0 whitespace-nowrap rounded-full border border-dashed border-orange-400 px-3 py-1.5 text-sm text-orange-700"
          >
            + New session
          </button>
        )}
      </div>

      {adding && (
        <form
          className="mt-2 flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = label.trim();
            if (trimmed) onAddSession(trimmed, date);
            setAdding(false);
          }}
        >
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Day 2"
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none"
          />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-neutral-300 px-2 py-2 text-sm outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-lg bg-orange-600 px-3 py-2 text-sm font-medium text-white"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="shrink-0 text-sm text-neutral-500"
          >
            Cancel
          </button>
        </form>
      )}

      {!sessions.length && !adding && (
        <p className="mt-1 text-xs text-neutral-500">
          No sessions yet — tap “+ New session” whenever you actually sit down to take feedback (it doesn&apos;t have to be every day).
        </p>
      )}
    </div>
  );
}
