"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function SetupForm() {
  const [username, setUsername] = useState("admin");
  const [displayName, setDisplayName] = useState("Administrator");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Setup failed");
        return;
      }

      router.push("/login");
    } catch {
      setError("An error occurred");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create Admin Account</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Display Name</label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 6 characters" className="mt-1" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading || !username || !password}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Admin Account"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
