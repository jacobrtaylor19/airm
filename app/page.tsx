import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Brain,
  ShieldAlert,
  ClipboardCheck,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="flex min-h-[60vh] flex-col items-center justify-center bg-brand-accent-dark px-6 text-center text-white">
        <ShieldCheck className="mb-6 h-12 w-12 text-teal-400" />
        <h1 className="text-4xl font-bold">Provisum</h1>
        <p className="mt-3 text-xl text-slate-300">
          Intelligent Role Mapping for Enterprise Migrations
        </p>
        <p className="mt-4 max-w-2xl text-slate-400">
          Your ERP migration shouldn&apos;t be a compliance liability. Provisum
          replaces manual spreadsheet-based role mapping with AI-powered
          automation — complete with SOD analysis, structured approvals, and full
          audit trail.
        </p>
        <div className="mt-8 flex gap-4">
          <Link
            href="/login"
            className="rounded-lg bg-teal-600 px-6 py-3 text-sm font-medium text-white hover:bg-teal-700"
          >
            Sign In
          </Link>
          <Link
            href="/methodology"
            className="rounded-lg border border-slate-600 px-6 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            Learn More
          </Link>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-brand-text">
              AI-Powered Analysis
            </h3>
            <p className="mt-2 text-sm text-brand-text-muted">
              Claude analyzes permission patterns, generates personas, and
              suggests optimal role mappings — with full transparency into every
              decision.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-brand-text">
              SOD Built In
            </h3>
            <p className="mt-2 text-sm text-brand-text-muted">
              Segregation of duties analysis is part of the workflow, not a
              separate tool. Every mapping is checked before it reaches approval.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-brand-text">
              Audit-Ready
            </h3>
            <p className="mt-2 text-sm text-brand-text-muted">
              Full audit trail on every action. Export provisioning-ready
              reports, SOD exception documentation, and compliance packages.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-accent-dark px-6 py-10 text-center">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Provisum. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
