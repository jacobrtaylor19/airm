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
    <div className="flex min-h-screen">
      {/* Left panel — dark slate brand */}
      <div className="hidden md:flex md:w-1/2 flex-col items-center justify-center bg-slate-900 px-8">
        <div className="flex flex-col items-center gap-4 text-center">
          <AIRMLogo size="lg" className="text-teal-400 !h-16 !w-16" />
          <h1 className="text-2xl font-bold text-white">Provisum</h1>
          <p className="text-sm text-slate-300 max-w-xs">
            Intelligent Role Mapping for Enterprise Migrations
          </p>
        </div>
      </div>

      {/* Right panel — white form */}
      <div className="flex w-full md:w-1/2 items-center justify-center bg-white px-6">
        <div className="w-full max-w-sm space-y-6">
          {/* Mobile-only brand header */}
          <div className="flex flex-col items-center gap-3 text-center md:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900">
              <AIRMLogo size="md" className="text-teal-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Provisum</h1>
              <p className="text-sm font-medium text-slate-500">
                Intelligent Role Mapping for Enterprise Migrations
              </p>
            </div>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
