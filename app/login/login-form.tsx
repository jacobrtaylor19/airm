"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Database, ChevronDown } from "lucide-react";

const DEMO_ENVIRONMENTS = [
  { value: "default", label: "SAP S/4HANA — 1K Users (Generate Personas Live)", available: true },
  { value: "energy-chemicals-s4hana", label: "SAP S/4HANA — Energy & Chemicals (Pre-loaded)", available: true },
  { value: "self-guided", label: "Self-Guided Demo (SAP S/4HANA)", available: true },
  { value: "empty-project", label: "Empty Project (Start from Scratch)", available: true },
  { value: "financial-services-s4hana", label: "SAP S/4HANA — Financial Services", available: true },
  { value: "consumer-products-s4hana", label: "SAP S/4HANA — Consumer Products", available: true },
  { value: "manufacturing-s4hana", label: "SAP S/4HANA — Manufacturing", available: true },
  { value: "oracle-fusion", label: "Oracle EBS → Oracle Fusion", available: true },
  { value: "workday", label: "Legacy HRIS → Workday HCM", available: true },
  { value: "salesforce", label: "Legacy CRM → Salesforce", available: true },
  { value: "servicenow", label: "ServiceNow ITSM", available: true },
] as const;

const DEMO_PERSONAS = [
  { user: "demo.admin", label: "Admin" },
  { user: "demo.mapper.finance", label: "Mapper" },
  { user: "demo.approver", label: "Approver" },
  { user: "demo.pm", label: "Project Manager" },
  { user: "demo.coordinator", label: "Coordinator" },
  { user: "demo.security", label: "Security Architect" },
  { user: "demo.compliance", label: "Compliance Officer" },
  { user: "demo.viewer", label: "Viewer" },
];

export function LoginForm({ isDemo = true }: { isDemo?: boolean }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState("default");
  const [showSso, setShowSso] = useState(false);
  const [ssoEmail, setSsoEmail] = useState("");
  const [ssoLoading, setSsoLoading] = useState(false);
  const [ssoMessage, setSsoMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("airm_demo_env");
    if (stored) setSelectedDemo(stored);
  }, []);

  async function handleDemoSwitch(value: string) {
    const env = DEMO_ENVIRONMENTS.find((e) => e.value === value);
    if (!env || !env.available) return;

    setSelectedDemo(value);
    localStorage.setItem("airm_demo_env", value);

    if (value === selectedDemo) return;

    setSwitching(true);
    setError("");

    try {
      const res = await fetch("/api/demo/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: value }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to switch demo environment");
        return;
      }

      router.refresh();
    } catch {
      setError("Failed to switch demo environment");
    } finally {
      setSwitching(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      window.location.href = "/home";
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition-colors focus:border-teal-400/50 focus:bg-white/[0.08] focus:ring-1 focus:ring-teal-400/30";

  return (
    <div className="space-y-6">
      {/* Sign-in form */}
      <div>
        <h2 className="text-lg font-semibold text-white">Welcome back</h2>
        <p className="mt-0.5 text-sm text-slate-400">
          Sign in to your Provisum workspace
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-300">
            Username
          </label>
          <input
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError(""); }}
            placeholder="you@company.com"
            className={inputClass}
            autoFocus
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">
              Password
            </label>
            {!showSso && (
              <button
                type="button"
                onClick={() => setShowSso(true)}
                className="text-xs font-medium text-teal-400 hover:text-teal-300 transition-colors"
              >
                Sign in with SSO
              </button>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            placeholder="Enter your password"
            className={inputClass}
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || switching || !username || !password}
          className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white transition-all hover:bg-teal-500 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {loading ? (
            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* SSO Section (expandable) */}
      {showSso && (
        <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4 space-y-3">
          <p className="text-xs text-slate-400">
            Enter your work email to find your organization&apos;s SSO provider.
          </p>
          <input
            type="email"
            value={ssoEmail}
            onChange={(e) => { setSsoEmail(e.target.value); setSsoMessage(""); }}
            placeholder="work@company.com"
            className={inputClass}
          />
          {ssoMessage && (
            <p className="text-xs text-slate-400">{ssoMessage}</p>
          )}
          <button
            type="button"
            disabled={ssoLoading || !ssoEmail.includes("@")}
            onClick={async () => {
              setSsoLoading(true);
              setSsoMessage("");
              try {
                const res = await fetch(`/api/auth/sso?email=${encodeURIComponent(ssoEmail)}`);
                const data = await res.json();
                setSsoMessage(data.message || (data.found ? "Provider found" : "No SSO provider found for this domain."));
              } catch {
                setSsoMessage("Failed to look up SSO provider.");
              } finally {
                setSsoLoading(false);
              }
            }}
            className="w-full rounded-lg border border-white/10 bg-white/[0.06] py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.1] disabled:opacity-40"
          >
            {ssoLoading ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : "Continue with SSO"}
          </button>
        </div>
      )}

      {/* Demo-only: persona pills + environment selector */}
      {isDemo && (
        <>
          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-xs text-slate-500">Select a demo persona</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Persona pills */}
          <div className="flex flex-wrap gap-2">
            {DEMO_PERSONAS.map((cred) => {
              const isSelected = username === cred.user;
              return (
                <button
                  key={cred.user}
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-all ${
                    isSelected
                      ? "border-teal-400/50 bg-teal-400/15 text-teal-300"
                      : "border-white/10 text-slate-400 hover:border-teal-400/30 hover:bg-white/[0.04] hover:text-slate-200"
                  }`}
                  onClick={() => {
                    setUsername(cred.user);
                    setPassword("DemoGuide2026!");
                    setError("");
                  }}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isSelected ? "bg-teal-400" : "bg-slate-600"
                    }`}
                  />
                  {cred.label}
                </button>
              );
            })}
          </div>

          {/* Demo Environment Selector */}
          <div className="rounded-lg border border-white/10 bg-white/[0.04] p-4">
            <div className="mb-2.5 flex items-center gap-2">
              <Database className="h-3.5 w-3.5 text-slate-500" />
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Demo Environment
              </span>
            </div>
            <div className="relative">
              <select
                value={selectedDemo}
                onChange={(e) => handleDemoSwitch(e.target.value)}
                disabled={switching}
                className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.06] px-3 py-2 pr-8 text-sm text-slate-300 outline-none transition-colors focus:border-teal-400/50 focus:ring-1 focus:ring-teal-400/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {DEMO_ENVIRONMENTS.map((env) => (
                  <option
                    key={env.value}
                    value={env.value}
                    disabled={!env.available}
                  >
                    {env.label}
                    {!env.available ? " (Coming Soon)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            </div>
            {switching && (
              <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="h-3 w-3 animate-spin" />
                Switching demo environment...
              </div>
            )}
            <p className="mt-2 text-[11px] text-slate-600">
              Switch industry scenarios to explore different migration contexts.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
