import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ShieldCheck,
  Brain,
  ShieldAlert,
  ClipboardCheck,
  Upload,
  Sparkles,
  CheckCircle,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default function Home() {
  const user = getSessionUser();
  if (user) redirect("/dashboard");
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="flex min-h-[60vh] flex-col items-center justify-center bg-slate-900 px-6 text-center text-white">
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
            className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-medium text-white hover:bg-indigo-700"
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

        {/* Supported Platforms */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500">
          <span className="text-slate-600 font-medium">Supported platforms:</span>
          <span>SAP S/4HANA</span>
          <span className="text-slate-700">·</span>
          <span>Oracle Fusion</span>
          <span className="text-slate-700">·</span>
          <span>Workday</span>
          <span className="text-slate-700">·</span>
          <span>Salesforce</span>
          <span className="text-slate-700">·</span>
          <span>ServiceNow</span>
        </div>
      </section>

      {/* How It Works — 3 Steps */}
      <section className="border-b bg-slate-50 px-6 py-16">
        <h2 className="text-center text-sm font-semibold uppercase tracking-wider text-slate-400 mb-10">
          How It Works
        </h2>
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-600 mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">1. Upload Source Data</h3>
            <p className="mt-1 text-xs text-slate-500">
              Import users, roles, and permissions from your legacy system via CSV.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-600 mb-3">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">2. AI Maps Roles</h3>
            <p className="mt-1 text-xs text-slate-500">
              AI generates personas, maps to target roles, and flags SOD conflicts automatically.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100 text-teal-600 mb-3">
              <CheckCircle className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-900">3. Review & Export</h3>
            <p className="mt-1 text-xs text-slate-500">
              Approve mappings, resolve conflicts, and export provisioning-ready reports.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <Brain className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              AI-Powered Analysis
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Claude analyzes permission patterns, generates personas, and
              suggests optimal role mappings — with full transparency into every
              decision.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              SOD Built In
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Segregation of duties analysis is part of the workflow, not a
              separate tool. Every mapping is checked before it reaches approval.
            </p>
          </div>
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">
              Audit-Ready
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Full audit trail on every action. Export provisioning-ready
              reports, SOD exception documentation, and compliance packages.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 px-6 py-10 text-center">
        <p className="text-xs text-slate-500">
          &copy; {new Date().getFullYear()} Provisum. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
