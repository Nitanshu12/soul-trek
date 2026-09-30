import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

const NONEXISTENT_ID = "00000000-0000-0000-0000-000000000000";

// Removes every ID-card photo from storage. Paths are `${busId}/${complaintId}.jpg`,
// so we list each bus folder and delete its files. Best-effort: orphaned photos
// aren't linked to anything after the row wipe, so a failure here isn't fatal.
async function clearIdCardPhotos(admin: SupabaseClient): Promise<void> {
  const bucket = admin.storage.from("id-cards");
  const { data: folders } = await bucket.list("", { limit: 1000 });
  if (!folders?.length) return;

  const paths: string[] = [];
  for (const folder of folders) {
    const { data: files } = await bucket.list(folder.name, { limit: 1000 });
    for (const file of files ?? []) {
      paths.push(`${folder.name}/${file.name}`);
    }
  }
  if (paths.length) await bucket.remove(paths);
}

export async function POST(req: Request) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not signed in" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return Response.json({ error: "Admins only" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (body?.confirm !== true) {
    return Response.json({ error: "Confirmation required" }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Server is missing its service role key" },
      { status: 500 }
    );
  }

  // 1. Storage photos (best-effort, before the rows that reference them are gone).
  try {
    await clearIdCardPhotos(admin);
  } catch {
    /* non-fatal — continue with the row wipe */
  }

  // 2. Wipe all batch data. Children before parents; every table keyed by uuid id.
  const tablesInOrder = [
    "feedback_entries",
    "complaints",
    "bus_volunteers",
    "sessions",
    "students",
    "buses",
  ];
  for (const table of tablesInOrder) {
    const { error } = await admin.from(table).delete().neq("id", NONEXISTENT_ID);
    if (error) {
      return Response.json(
        { error: `Failed clearing ${table}: ${error.message}` },
        { status: 500 }
      );
    }
  }

  // 3. Remove all volunteer logins (admin's own account is left untouched).
  const { data: volunteers } = await admin
    .from("profiles")
    .select("id")
    .eq("role", "volunteer");
  for (const v of volunteers ?? []) {
    // Deleting the auth user cascades its profile row (on delete cascade).
    await admin.auth.admin.deleteUser(v.id);
  }

  // 4. Bump the data version so every phone clears its cache on next open.
  const { data: cfg } = await admin
    .from("app_config")
    .select("data_version")
    .eq("id", true)
    .single();
  const nextVersion = (cfg?.data_version ?? 1) + 1;
  const { error: versionError } = await admin
    .from("app_config")
    .update({ data_version: nextVersion })
    .eq("id", true);
  if (versionError) {
    return Response.json({ error: versionError.message }, { status: 500 });
  }

  return Response.json({ ok: true });
}
