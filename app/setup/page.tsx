import { redirect } from "next/navigation";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { SetupForm } from "./setup-form";

export default function SetupPage() {
  const hasUsers = db.select().from(schema.appUsers).limit(1).all().length > 0;
  if (hasUsers) redirect("/login");

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">AIRM Setup</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create the initial admin account to get started.
          </p>
        </div>
        <SetupForm />
      </div>
    </div>
  );
}
