import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/auth";

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

  const { username, password, displayName, busId } = await req.json();
  if (!username || !password || !busId) {
    return Response.json({ error: "username, password and busId are required" }, { status: 400 });
  }
  if (String(password).length < 6) {
    return Response.json({ error: "Password must be at least 6 characters" }, { status: 400 });
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
  const email = usernameToEmail(username);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return Response.json(
      { error: createError?.message ?? "Could not create volunteer login" },
      { status: 400 }
    );
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    username: username.trim().toLowerCase(),
    display_name: displayName?.trim() || username.trim(),
    role: "volunteer",
    bus_id: busId,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return Response.json({ error: profileError.message }, { status: 400 });
  }

  return Response.json({ ok: true });
}
