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

  const { volunteerId, newPassword } = await req.json();
  if (!volunteerId || !newPassword || String(newPassword).length < 6) {
    return Response.json(
      { error: "volunteerId and a newPassword (6+ chars) are required" },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(volunteerId, {
    password: newPassword,
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });

  return Response.json({ ok: true });
}
