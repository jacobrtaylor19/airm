import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { ShieldCheck } from "lucide-react";
import { isDemoMode } from "@/lib/demo-mode";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // If already logged in, redirect to dashboard
  const user = await getSessionUser();
  if (user) redirect("/home");

  // If no app users exist, redirect to setup
  const rows = await db.select().from(schema.appUsers).limit(1);
  const hasUsers = rows.length > 0;
  if (!hasUsers) redirect("/setup");

  const isDemo = isDemoMode();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#0c1e1c]">
      {/* Background gradient layers */}
      <div className="pointer-events-none absolute inset-0">
        {/* Radial glow behind card */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-teal-900/30 blur-3xl" />
        {/* Top accent */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-64 w-[600px] rounded-full bg-teal-700/20 blur-3xl" />
        {/* Bottom accent */}
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 h-40 w-[500px] rounded-full bg-teal-800/15 blur-3xl" />
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Brand watermark top-left */}
      <div className="absolute left-6 top-6 z-10 flex items-center gap-2 text-white/40">
        <ShieldCheck className="h-4 w-4" />
        <span className="text-sm font-semibold tracking-tight">Provisum</span>
      </div>

      {/* Brand header */}
      <div className="relative z-10 mb-8 text-center">
        <div className="flex items-center justify-center gap-3 mb-3">
          <ShieldCheck className="h-8 w-8 text-teal-400" />
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Provisum
          </h1>
        </div>
        <p className="text-base font-medium text-slate-300">
          Intelligent Role Mapping for Enterprise Migrations.
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {isDemo ? "Sign in to your demo workspace." : "Sign in to your workspace."}
        </p>
      </div>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-[420px] px-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-8 shadow-2xl backdrop-blur-xl">
          <LoginForm isDemo={isDemo} />
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-5 left-1/2 -translate-x-1/2 z-10 text-xs text-slate-600">
        Navigate change. Build resilience.
      </p>
    </div>
  );
}
