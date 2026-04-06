"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body className="bg-slate-50 font-sans antialiased">
        <div className="flex min-h-screen flex-col items-center justify-center text-center px-6">
          <ShieldAlert className="h-12 w-12 text-red-400 mb-4" />
          <h1 className="text-2xl font-bold text-slate-900">
            Something went wrong
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-md">
            An unexpected error occurred. The error has been reported to our
            team and we&apos;re looking into it.
          </p>
          {error.digest && (
            <p className="mt-2 text-xs text-slate-400">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3 mt-6">
            <button
              onClick={() => reset()}
              className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
            >
              Try again
            </button>
            <a
              href="/home"
              className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Go to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
