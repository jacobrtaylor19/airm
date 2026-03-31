import { getPersonaDetail, getAllSimpleUsers, getAllSimpleTargetRoles } from "@/lib/queries";
import { requireAuth } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { notFound } from "next/navigation";
import { PersonaDetailClient } from "./persona-detail-client";

export const dynamic = "force-dynamic";

export default async function PersonaDetailPage({ params }: { params: Promise<{ personaId: string }> }) {
  const user = await requireAuth();
  const orgId = getOrgId(user);
  const { personaId } = await params;
  const persona = await getPersonaDetail(orgId, Number(personaId));
  if (!persona) return notFound();

  const allUsers = await getAllSimpleUsers(orgId);
  const allTargetRoles = await getAllSimpleTargetRoles(orgId);

  return (
    <PersonaDetailClient
      persona={persona}
      allUsers={allUsers}
      allTargetRoles={allTargetRoles}
    />
  );
}
