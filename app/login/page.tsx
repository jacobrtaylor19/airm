import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUserFromToken } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { db } from "@/db";
import * as schema from "@/db/schema";

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
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">AIRM</h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI Role Mapping Tool
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
