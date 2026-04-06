import Link from "next/link";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center text-center px-6 bg-slate-50">
      <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mb-6">
        <ShieldCheck className="h-8 w-8 text-teal-500" />
      </div>
      <h1 className="text-2xl font-bold text-slate-900">Page Not Found</h1>
      <p className="mt-2 text-sm text-slate-500 max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
        Check the URL or navigate back to the home page.
      </p>
      <div className="flex gap-3 mt-6">
        <Link
          href="/home"
          className="rounded-lg bg-teal-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
        >
          Go to Home
        </Link>
        <Link
          href="/help"
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Help Center
        </Link>
      </div>
    </div>
  );
}
