import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { SetupForm } from "./setup-form";
import { InviteAcceptForm } from "./invite-accept-form";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = searchParams.token;

  // If there's an invite token, show the invite acceptance form
  if (token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="w-full max-w-sm space-y-6 p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Welcome to Provisum</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Set your password to activate your account.
            </p>
          </div>
          <InviteAcceptForm token={token} />
        </div>
      </div>
    );
  }

  // Normal setup flow — only available when no users exist
  const rows = await db.select().from(schema.appUsers).limit(1);
  const hasUsers = rows.length > 0;
  if (hasUsers) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Provisum Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create the initial admin account to get started.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
