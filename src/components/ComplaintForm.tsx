"use client";

import { useMemo, useRef, useState } from "react";
import type { Student } from "@/lib/types";

export default function ComplaintForm({
  students,
  onClose,
  onSubmit,
}: {
  students: Student[];
  onClose: () => void;
  onSubmit: (input: { name: string; studentId: string | null; notes: string; photo: Blob }) => void;
}) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const matchedStudent = useMemo(() => {
    const trimmed = name.trim().toLowerCase();
    if (!trimmed) return null;
    return students.find((s) => s.name.trim().toLowerCase() === trimmed) ?? null;
  }, [name, students]);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoUrl(URL.createObjectURL(file));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !photo) return;
    onSubmit({
      name: name.trim(),
      studentId: matchedStudent?.id ?? null,
      notes,
      photo,
    });
  }

  const canSubmit = name.trim().length > 0 && photo !== null;
  const fieldClass =
    "w-full rounded-xl border border-line bg-surface px-3.5 py-3 text-sm leading-relaxed text-fg focus:border-accent";

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-bg">
      <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3.5">
        <button
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-dim transition-colors active:bg-surface"
        >
          Close
        </button>
        <p className="text-sm font-semibold">New complaint</p>
        <button
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="shrink-0 rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-accent-ink transition-opacity active:opacity-80 disabled:opacity-30"
        >
          Submit
        </button>
      </header>

      <form
        onSubmit={handleSubmit}
        className="flex-1 space-y-5 overflow-y-auto px-5 py-5 pb-[max(2rem,env(safe-area-inset-bottom))]"
      >
        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
            Name
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            list="complaint-student-names"
            placeholder="Learner's name"
            className={fieldClass}
          />
          <datalist id="complaint-student-names">
            {students.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>
          {matchedStudent && (
            <p className="mt-1.5 text-xs text-ok">
              Linked to {matchedStudent.name}&apos;s profile
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
            ID card photo
          </label>
          {/* Two separate inputs so the choice is explicit: "capture" forces the
              camera on mobile, while a plain file input opens the gallery/Files picker. */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handlePhotoChange}
            className="hidden"
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            className="hidden"
          />

          {photoUrl && (
            <div className="mb-2.5 overflow-hidden rounded-xl border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl}
                alt="ID card"
                className="max-h-72 w-full object-contain bg-surface-2"
              />
            </div>
          )}

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface py-8 text-sm text-dim transition-colors active:bg-surface-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                <span className="h-4 w-4 rounded-sm border-2 border-accent" />
              </span>
              {photoUrl ? "Retake" : "Take photo"}
            </button>
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-line bg-surface py-8 text-sm text-dim transition-colors active:bg-surface-2"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/15">
                <span className="h-4 w-4 rounded-full border-2 border-accent" />
              </span>
              {photoUrl ? "Choose again" : "Choose from gallery"}
            </button>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted">
            Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={5}
            placeholder="What happened…"
            className={fieldClass}
          />
        </div>
      </form>
    </div>
  );
}
