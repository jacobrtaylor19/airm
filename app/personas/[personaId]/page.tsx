import { getPersonaDetail, getAllSimpleUsers, getAllSimpleTargetRoles } from "@/lib/queries";
import { notFound } from "next/navigation";
import { PersonaDetailClient } from "./persona-detail-client";

export const dynamic = "force-dynamic";

export default async function PersonaDetailPage({ params }: { params: Promise<{ personaId: string }> }) {
  const { personaId } = await params;
  const persona = getPersonaDetail(Number(personaId));
  if (!persona) return notFound();

  const allUsers = getAllSimpleUsers();
  const allTargetRoles = getAllSimpleTargetRoles();

  return (
    <PersonaDetailClient
      persona={persona}
      allUsers={allUsers}
      allTargetRoles={allTargetRoles}
    />
  );
}
