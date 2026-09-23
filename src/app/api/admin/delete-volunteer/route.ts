import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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

  const { volunteerId } = await req.json();
  if (!volunteerId) return Response.json({ error: "volunteerId is required" }, { status: 400 });

  let admin;
  try {
    admin = createAdminClient();
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "Server is missing its service role key" },
      { status: 500 }
    );
  }
  const { error } = await admin.auth.admin.deleteUser(volunteerId);
  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ ok: true });
}
