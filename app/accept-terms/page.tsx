import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { AcceptTermsForm } from "./accept-terms-form";

export const dynamic = "force-dynamic";

const CURRENT_TOS_VERSION = "2026-04-05";

export default async function AcceptTermsPage() {
  const user = await requireAuth();

  // If already accepted current version, redirect to home
  const [appUser] = await db
    .select({ tosVersion: schema.appUsers.tosVersion })
    .from(schema.appUsers)
    .where(eq(schema.appUsers.id, user.id));

  if (appUser?.tosVersion === CURRENT_TOS_VERSION) {
    redirect("/home");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-6 h-6 text-teal-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-900">
            Terms of Service
          </h1>
          <p className="text-sm text-slate-500 mt-2">
            Please review and accept our Terms of Service to continue using
            Provisum.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6 max-h-[400px] overflow-y-auto">
          <div className="text-sm text-slate-600 space-y-4">
            <p>
              By using the Provisum platform, you agree to the following key
              terms:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-500">
              <li>
                <strong className="text-slate-700">Data ownership:</strong> You
                retain all rights to your Customer Data. We process it solely to
                provide the Service.
              </li>
              <li>
                <strong className="text-slate-700">AI outputs:</strong>{" "}
                AI-generated personas and mappings are recommendations only. You
                are responsible for review and approval.
              </li>
              <li>
                <strong className="text-slate-700">Security:</strong> We
                implement encryption, access controls, and audit logging. See
                our Security Policy for details.
              </li>
              <li>
                <strong className="text-slate-700">Acceptable use:</strong> The
                Service may not be used for unlawful purposes or to process data
                you do not have rights to.
              </li>
              <li>
                <strong className="text-slate-700">Termination:</strong> You may
                export your data within 30 days of account closure.
              </li>
            </ul>
            <p className="text-xs text-slate-400 pt-2">
              Full terms available at{" "}
              <a
                href="https://provisum.io/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                provisum.io/terms
              </a>
              . Privacy Policy at{" "}
              <a
                href="https://provisum.io/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 hover:underline"
              >
                provisum.io/privacy
              </a>
              .
            </p>
          </div>
        </div>

        <AcceptTermsForm />
      </div>
    </div>
  );
}
