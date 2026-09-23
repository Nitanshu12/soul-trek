import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import VolunteerApp from "@/components/VolunteerApp";

export default async function BusPage({ params }: PageProps<"/bus/[id]">) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <VolunteerApp busId={id} />;
}
