import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import ComplaintsScreen from "@/components/ComplaintsScreen";

export default async function BusComplaintsPage({ params }: PageProps<"/bus/[id]/complaints">) {
  const { id } = await params;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <ComplaintsScreen busId={id} />;
}
