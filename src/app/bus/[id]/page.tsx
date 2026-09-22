import VolunteerApp from "@/components/VolunteerApp";

export default async function BusPage({ params }: PageProps<"/bus/[id]">) {
  const { id } = await params;
  return <VolunteerApp busId={id} />;
}
