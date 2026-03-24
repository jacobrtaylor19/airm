import { getUsers } from "@/lib/queries";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

export default function UsersPage() {
  const users = getUsers();

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Users</h2>
        <p className="text-sm text-muted-foreground">
          Browse the user population and their role mapping status.
        </p>
      </div>
      <UsersTable data={users} />
    </div>
  );
}
