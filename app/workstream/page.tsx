import { requireAuth } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { WorkstreamClient } from "./workstream-client";

export const dynamic = "force-dynamic";

export default async function WorkstreamPage() {
  const user = await requireAuth();
  const orgId = getOrgId(user);

  const [items, releases] = await Promise.all([
    db
      .select()
      .from(schema.workstreamItems)
      .where(eq(schema.workstreamItems.organizationId, orgId))
      .orderBy(desc(schema.workstreamItems.createdAt)),
    db
      .select({ id: schema.releases.id, name: schema.releases.name })
      .from(schema.releases)
      .where(eq(schema.releases.organizationId, orgId))
      .orderBy(schema.releases.createdAt),
  ]);

  const isApprover = ["admin", "system_admin", "project_manager"].includes(user.role);
  const isViewer = user.role === "viewer";

  return (
    <WorkstreamClient
      items={items}
      releases={releases}
      isApprover={isApprover}
      isViewer={isViewer}
      currentUserId={user.id}
      currentUserName={user.displayName || user.username}
    />
  );
}
