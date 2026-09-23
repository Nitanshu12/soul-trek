import ComplaintsScreen from "@/components/ComplaintsScreen";

export default async function BusComplaintsPage({ params }: PageProps<"/bus/[id]/complaints">) {
  const { id } = await params;
  return <ComplaintsScreen busId={id} />;
}
