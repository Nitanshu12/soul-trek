import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import AdminDashboard from "@/components/AdminDashboard";
import type { Profile } from "@/lib/auth";

export default async function AdminPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (profile?.role !== "admin") redirect("/");

  return <AdminDashboard adminName={profile.display_name || profile.username || "Admin"} />;
}
