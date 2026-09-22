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
  onAddStudent: (name: string) => void;
  onOpenFeedback: (studentId: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");

  const doneStudentIds = new Set(entries.map((e) => e.student_id));

  return (
    <div className="flex-1 overflow-y-auto px-3 pb-24 pt-3">
      {!sessionSelected && students.length > 0 && (
        <p className="mb-3 rounded-lg bg-yellow-50 px-3 py-2 text-center text-xs text-yellow-800">
          Pick or create a session above before recording feedback.
        </p>
      )}

      {students.length === 0 && (
        <p className="mt-8 text-center text-sm text-neutral-400">
          No learners added for this bus yet.
        </p>
      )}

      <ul className="space-y-2">
        {students.map((student) => {
          const done = doneStudentIds.has(student.id);
          return (
            <li key={student.id}>
              <button
                onClick={() => onOpenFeedback(student.id)}
                className="flex w-full items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3 text-left shadow-sm active:bg-neutral-50"
              >
                <span className="font-medium text-neutral-900">{student.name}</span>
                {sessionSelected && (
                  <span
                    className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                      done
                        ? "bg-green-100 text-green-700"
                        : "bg-neutral-100 text-neutral-400"
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

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-3">
        {adding ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const trimmed = name.trim();
              if (trimmed) onAddStudent(trimmed);
              setName("");
              setAdding(false);
            }}
          >
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Learner's name"
              className="flex-1 rounded-xl border border-neutral-300 px-4 py-3 text-base outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-xl bg-orange-600 px-4 py-3 font-medium text-white"
            >
              Add
            </button>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="w-full rounded-xl bg-orange-600 py-3 text-base font-semibold text-white"
          >
            + Add learner
          </button>
        )}
      </div>
    </div>
  );
}
