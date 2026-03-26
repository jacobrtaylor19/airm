"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState("default");
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

    // Only re-seed if switching to a different environment
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

      // Refresh the page to pick up new data
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

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sign In</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Username</label>
              <Input
                value={username}
                onChange={(e) => { setUsername(e.target.value); setError(""); }}
                placeholder="Enter your username"
                className="mt-1"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(""); }}
                placeholder="Enter your password"
                className="mt-1"
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={loading || switching || !username || !password}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>
          {/* Demo credentials hint */}
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-2">Demo credentials:</p>
            <div className="flex flex-wrap gap-2">
              {[
                { user: "demo.admin", label: "Admin" },
                { user: "demo.mapper.finance", label: "Mapper" },
                { user: "demo.approver", label: "Approver" },
                { user: "demo.coordinator", label: "Coordinator" },
                { user: "demo.viewer", label: "Viewer" },
              ].map((cred) => (
                <button
                  key={cred.user}
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700"
                  onClick={() => { setUsername(cred.user); setPassword("DemoGuide2026!"); setError(""); }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-400" />
                  {cred.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Environment Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="h-4 w-4" />
            Demo Environment
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <select
              value={selectedDemo}
              onChange={(e) => handleDemoSwitch(e.target.value)}
              disabled={switching}
              className="w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {DEMO_ENVIRONMENTS.map((env) => (
                <option
                  key={env.value}
                  value={env.value}
                  disabled={!env.available}
                >
                  {env.label}{!env.available ? " (Coming Soon)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          {switching && (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Switching demo environment...
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Select an industry scenario to load sample data for that environment.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
