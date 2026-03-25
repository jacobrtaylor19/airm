import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromToken } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { AIRMLogo } from "@/components/layout/airm-logo";

export default function LoginPage() {
  // If already logged in, redirect to dashboard
  const token = cookies().get("airm_session")?.value;
  if (token) {
    const user = getSessionUserFromToken(token);
    if (user) redirect("/dashboard");
  }

  // If no app users exist, redirect to setup
  const hasUsers = db.select().from(schema.appUsers).limit(1).all().length > 0;
  if (!hasUsers) redirect("/setup");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <AIRMLogo size="md" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">AIRM</h1>
            <p className="text-sm font-medium text-muted-foreground">
              AI Role Mapping
            </p>
          </div>
          <p className="text-xs text-muted-foreground/80">
            Intelligent security role migration and compliance
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
