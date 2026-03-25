import { getUsers } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { getUserScope } from "@/lib/scope";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  const currentUser = getSessionUser();
  let users = getUsers();

  // Filter by org scope for mappers/approvers
  if (currentUser && ["mapper", "approver"].includes(currentUser.role)) {
    const scopedUserIds = getUserScope(currentUser);
    if (scopedUserIds !== null) {
      const idSet = new Set(scopedUserIds);
      users = users.filter(u => idSet.has(u.id));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Browse the user population and their role mapping status.
      </p>
      <UsersTable data={users} />
    </div>
  );
}
