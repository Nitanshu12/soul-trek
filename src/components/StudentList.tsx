"use client";

import { useState } from "react";
import type { FeedbackEntry, Student } from "@/lib/types";

export default function StudentList({
  students,
  entries,
  sessionSelected,
  onAddStudent,
  onOpenFeedback,
}: {
  students: Student[];
  entries: FeedbackEntry[];
  sessionSelected: boolean;
  onAddStudent: (name: string, enrollmentNumber: string) => void;
  onOpenFeedback: (studentId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [enrollmentNumber, setEnrollmentNumber] = useState("");

  const doneStudentIds = new Set(entries.map((e) => e.student_id));
  const doneCount = students.filter((s) => doneStudentIds.has(s.id)).length;

  return (
    <>
      <div className="flex-1 overflow-y-auto px-5 pb-32 pt-4">
        {!sessionSelected && students.length > 0 && (
          <p className="mb-4 rounded-lg border border-accent/25 bg-accent/10 px-3.5 py-2.5 text-xs text-accent-soft">
            Pick or create a session above before recording feedback.
          </p>
        )}

        {students.length > 0 && sessionSelected && (
          <p className="mb-3 px-1 text-xs font-medium uppercase tracking-wider text-muted">
            {doneCount} of {students.length} recorded
          </p>
        )}

        {students.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">
            No learners on this bus yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {students.map((student) => {
              const done = doneStudentIds.has(student.id);
              return (
                <li key={student.id}>
                  <button
                    onClick={() => onOpenFeedback(student.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-4 text-left transition-colors active:bg-surface-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{student.name}</p>
                      {student.enrollment_number && (
                        <p className="mt-0.5 truncate text-xs text-muted">
                          {student.enrollment_number}
                        </p>
                      )}
                    </div>
                    {sessionSelected && (
                      <span
                        className={`shrink-0 rounded-md px-2 py-1 text-xs font-medium ${
                          done ? "bg-ok/15 text-ok" : "bg-surface-2 text-muted"
                        }`}
                      >
                        {done ? "Recorded" : "Pending"}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-line bg-bg px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {adding ? (
          <form
            className="space-y-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = name.trim();
              if (trimmed) onAddStudent(trimmed, enrollmentNumber.trim());
              setName("");
              setEnrollmentNumber("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Learner's name"
              className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-base text-fg focus:border-accent"
            />
            <input
              value={enrollmentNumber}
              onChange={(e) => setEnrollmentNumber(e.target.value)}
              placeholder="Enrollment number (optional)"
              className="w-full rounded-xl border border-line bg-surface-2 px-4 py-3 text-base text-fg focus:border-accent"
            />
            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setName("");
                  setEnrollmentNumber("");
                }}
                className="flex-1 rounded-xl border border-line py-3 text-sm font-medium text-dim transition-colors active:bg-surface-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim()}
                className="flex-1 rounded-xl bg-accent py-3 text-sm font-semibold text-accent-ink transition-opacity active:opacity-80 disabled:opacity-30"
              >
                Add
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-xl bg-accent py-3.5 text-base font-semibold text-accent-ink transition-opacity active:opacity-80"
          >
            + Add learner
          </button>
        )}
      </div>
    </>
  );
}
