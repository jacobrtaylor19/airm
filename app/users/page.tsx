import { getUsers } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { getOrgId } from "@/lib/org-context";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const currentUser = await getSessionUser();
  const orgId = getOrgId(currentUser!);
  let users = await getUsers(orgId);

  // Filter by org scope for mappers/approvers
  if (currentUser && ["mapper", "approver"].includes(currentUser.role)) {
    const scopedUserIds = await getUserScope(currentUser);
    if (scopedUserIds !== null) {
      const idSet = new Set(scopedUserIds);
      users = users.filter(u => idSet.has(u.id));
    }
  }

  const isAdmin = currentUser ? ["admin", "system_admin"].includes(currentUser.role) : false;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse the user population and their role mapping status.
      </p>
      <UsersTable data={users} isAdmin={isAdmin} />
    </div>
  );
}
