"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AcceptTermsForm() {
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleAccept() {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/accept-tos", { method: "POST" });
      if (res.ok) {
        router.push("/home");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <label className="flex items-start gap-3 cursor-pointer mb-6">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => setChecked(e.target.checked)}
          className="h-4 w-4 accent-teal-600 mt-0.5 shrink-0"
        />
        <span className="text-sm text-slate-600">
          I have read and agree to the{" "}
          <a
            href="https://provisum.io/terms"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline"
          >
            Terms of Service
          </a>{" "}
          and{" "}
          <a
            href="https://provisum.io/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-teal-600 hover:underline"
          >
            Privacy Policy
          </a>
          .
        </span>
      </label>
      <button
        onClick={handleAccept}
        disabled={!checked || loading}
        className="w-full bg-teal-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Accepting..." : "Accept & Continue"}
      </button>
    </div>
  );
}
