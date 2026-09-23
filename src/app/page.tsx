import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth";

export default async function HomePage() {
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

  if (!profile) redirect("/login");
  if (profile.role === "admin") redirect("/admin");
  if (profile.bus_id) redirect(`/bus/${profile.bus_id}`);

  return (
    <div className="flex h-dvh items-center justify-center px-8 text-center">
      <p className="max-w-xs text-sm leading-relaxed text-dim">
        Your account isn&apos;t assigned to a bus yet. Please ask your admin to assign one.
      </p>
    </div>
  );
}
