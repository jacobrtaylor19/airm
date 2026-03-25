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

  const logoVariants = [1, 2, 3, 4, 5] as const;
  const variantLabels: Record<number, string> = {
    1: "ShieldCheck",
    2: "Network",
    3: "Layers",
    4: "Fingerprint",
    5: "KeyRound",
  };

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

        {/* Logo Options — for review only */}
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="mb-3 text-center text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Logo Options
          </p>
          <div className="flex items-center justify-between gap-2">
            {logoVariants.map((v) => (
              <div key={v} className="flex flex-col items-center gap-1.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-background">
                  <AIRMLogo variant={v} size="md" />
                </div>
                <span className="text-[10px] leading-tight text-muted-foreground text-center">
                  Icon Option {v}
                </span>
                <span className="text-[9px] leading-tight text-muted-foreground/60">
                  {variantLabels[v]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
