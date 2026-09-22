import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import VolunteerApp from "@/components/VolunteerApp";
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

  if (!profile.bus_id) {
    return (
      <div className="flex h-dvh items-center justify-center px-6 text-center">
        <p className="text-neutral-500">
          Your account isn&apos;t assigned to a bus yet. Please ask your admin to assign one.
        </p>
      </div>
    );
  }

  const { data: bus } = await supabase
    .from("buses")
    .select("*")
    .eq("id", profile.bus_id)
    .single();

  if (!bus) {
    return (
      <div className="flex h-dvh items-center justify-center px-6 text-center">
        <p className="text-neutral-500">Your assigned bus could not be found.</p>
      </div>
    );
  }

  return (
    <VolunteerApp
      bus={bus}
      volunteerName={profile.display_name || profile.username || "Volunteer"}
    />
  );
}
