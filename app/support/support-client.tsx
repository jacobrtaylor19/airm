"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LifeBuoy } from "lucide-react";

type FormState = "idle" | "submitting" | "success" | "error";

const CATEGORIES = [
  { value: "bug", label: "Bug Report" },
  { value: "feature_request", label: "Feature Request" },
  { value: "access_issue", label: "Access Issue" },
  { value: "data_question", label: "Data Question" },
  { value: "general", label: "General" },
];

const PRIORITIES = [
  { value: "low", label: "Low — cosmetic or minor" },
  { value: "medium", label: "Medium — affects my workflow" },
  { value: "high", label: "High — blocking or critical" },
];

interface Props {
  userName: string;
  userEmail: string;
}

export function SupportClient({ userName, userEmail }: Props) {
  const [state, setState] = useState<FormState>("idle");
  const [error, setError] = useState("");
  const [ticketNumber, setTicketNumber] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setState("submitting");
    setError("");

    const form = e.currentTarget;
    const data = {
      subject: (form.elements.namedItem("subject") as HTMLInputElement).value,
      category: (form.elements.namedItem("category") as HTMLSelectElement).value,
      priority: (form.elements.namedItem("priority") as HTMLSelectElement).value,
      description: (form.elements.namedItem("description") as HTMLTextAreaElement).value,
    };

    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(body.error || "Failed to submit ticket");
      }

      setTicketNumber(body.ticketNumber || "");
      setState("success");
      form.reset();
    } catch (err) {
      setState("error");
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "success") {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-1">Ticket submitted</h3>
          {ticketNumber && (
            <Badge variant="outline" className="mb-3 text-sm">{ticketNumber}</Badge>
          )}
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Our support team will review your ticket and respond to <strong>{userEmail}</strong>.
          </p>
          <button
            onClick={() => { setState("idle"); setTicketNumber(""); }}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Submit another ticket
          </button>
        </CardContent>
      </Card>
    );
  }

  const inputClass = "w-full px-3 py-2 border border-input rounded-md text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1";

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <LifeBuoy className="h-4 w-4 text-primary" />
          Submit a Support Ticket
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Submitting as <strong>{userName}</strong> ({userEmail})
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="sup-subject" className="block text-sm font-medium mb-1">
              Subject <span className="text-red-500">*</span>
            </label>
            <input id="sup-subject" name="subject" type="text" required className={inputClass} placeholder="Brief summary of your issue" />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="sup-category" className="block text-sm font-medium mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select id="sup-category" name="category" required className={inputClass}>
                <option value="">Select...</option>
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sup-priority" className="block text-sm font-medium mb-1">
                Priority
              </label>
              <select id="sup-priority" name="priority" defaultValue="medium" className={inputClass}>
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="sup-description" className="block text-sm font-medium mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="sup-description"
              name="description"
              rows={6}
              required
              className={`${inputClass} resize-none`}
              placeholder="Describe the issue, steps to reproduce, or your request in detail"
            />
          </div>

          {state === "error" && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={state === "submitting"}
            className="w-full bg-primary text-primary-foreground py-2.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {state === "submitting" ? "Submitting..." : "Submit Support Ticket"}
          </button>
        </form>
      </CardContent>
    </Card>
  );
}
