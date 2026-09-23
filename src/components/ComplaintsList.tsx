"use client";

import { useEffect, useState } from "react";
import type { Complaint } from "@/lib/types";
import { db } from "@/lib/db";

function ComplaintThumb({ complaint }: { complaint: Complaint }) {
  const [localUrl, setLocalUrl] = useState<string | null>(null);

  useEffect(() => {
    if (complaint.photo_url) return;
    let objectUrl: string | null = null;
    db.complaintPhotos.get(complaint.id).then((photo) => {
      if (photo) {
        objectUrl = URL.createObjectURL(photo.blob);
        setLocalUrl(objectUrl);
      }
    });
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [complaint.id, complaint.photo_url]);

  const src = complaint.photo_url ?? localUrl;
  if (!src) {
    return <div className="h-16 w-16 shrink-0 rounded-lg bg-surface-2" />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`${complaint.name}'s ID card`}
      className="h-16 w-16 shrink-0 rounded-lg border border-line object-cover"
    />
  );
}

export default function ComplaintsList({ complaints }: { complaints: Complaint[] }) {
  if (!complaints.length) {
    return (
      <p className="px-5 py-16 text-center text-sm leading-relaxed text-muted">
        No complaints filed for this bus yet.
      </p>
    );
  }

  return (
    <ul className="space-y-2.5 px-5 pb-32 pt-4">
      {complaints.map((c) => (
        <li
          key={c.id}
          className="flex gap-3 rounded-xl border border-line bg-surface p-3.5"
        >
          <ComplaintThumb complaint={c} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{c.name}</p>
              {!c.photo_url && (
                <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent-soft">
                  Uploading…
                </span>
              )}
            </div>
            {c.notes && (
              <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-dim">{c.notes}</p>
            )}
            <p className="mt-1 text-[11px] text-muted">
              {c.volunteer_name} · {new Date(c.created_at).toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
              })}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
