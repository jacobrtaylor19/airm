import { requireAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IncidentsClient } from "./incidents-client";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const user = await requireAuth();
  if (!["system_admin", "admin"].includes(user.role)) {
    redirect("/unauthorized");
  }

  return <IncidentsClient />;
}
