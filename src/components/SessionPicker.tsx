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
    <div className="border-b border-line bg-surface/40 px-5 py-3">
      <div className="flex items-center gap-2 overflow-x-auto">
        {sorted.map((s) => {
          const active = s.id === selectedSessionId;
          return (
            <button
              key={s.id}
              onClick={() => onSelect(s.id)}
              className={`shrink-0 whitespace-nowrap rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-accent/40 bg-accent/15 text-accent-soft"
                  : "border-line bg-surface text-dim"
              }`}
            >
              {s.label}
              <span className="ml-1.5 text-xs opacity-60">{formatDate(s.date)}</span>
            </button>
          );
        })}

        {!adding && (
          <button
            onClick={() => {
              setLabel(`Day ${sessions.length + 1}`);
              setAdding(true);
            }}
            className="shrink-0 whitespace-nowrap rounded-lg border border-dashed border-line px-3 py-1.5 text-sm text-muted transition-colors active:bg-surface"
          >
            + Session
          </button>
        )}
      </div>

      {adding && (
        <form
          className="mt-3 space-y-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = label.trim();
            if (trimmed) onAddSession(trimmed, date);
            setAdding(false);
          }}
        >
          <div className="flex gap-2.5">
            <input
              autoFocus
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Day 2"
              className="min-w-0 flex-1 rounded-lg border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-fg focus:border-accent"
            />
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="shrink-0 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-fg focus:border-accent"
            />
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 rounded-lg border border-line py-2.5 text-sm font-medium text-dim transition-colors active:bg-surface-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition-opacity active:opacity-80"
            >
              Add session
            </button>
          </div>
        </form>
      )}

      {!sessions.length && !adding && (
        <p className="mt-2.5 text-xs leading-relaxed text-muted">
          Create a session whenever you actually sit down to take feedback — it doesn&apos;t
          have to be every day.
        </p>
      )}
    </div>
  );
}
