"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Loader2, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SsoConfig {
  id: number;
  provider: string;
  providerName: string | null;
  domain: string | null;
  metadataUrl: string | null;
  enabled: boolean;
  supabaseSsoId: string | null;
}

const PROVIDERS = [
  { value: "azure_ad", label: "Azure Active Directory" },
  { value: "okta", label: "Okta" },
  { value: "generic_saml", label: "Generic SAML 2.0" },
];

export function SsoTab() {
  const [configs, setConfigs] = useState<SsoConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ provider: "azure_ad", providerName: "", domain: "", metadataUrl: "" });

  const loadConfigs = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/sso");
      if (res.ok) {
        const data = await res.json();
        setConfigs(data.configs);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadConfigs(); }, [loadConfigs]);

  async function handleAdd() {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/sso", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to add SSO provider");
        return;
      }
      toast.success("SSO provider added");
      setShowAdd(false);
      setForm({ provider: "azure_ad", providerName: "", domain: "", metadataUrl: "" });
      loadConfigs();
    } catch {
      toast.error("Failed to add SSO provider");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEnabled(config: SsoConfig) {
    try {
      const res = await fetch(`/api/admin/sso/${config.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !config.enabled }),
      });
      if (res.ok) {
        toast.success(config.enabled ? "SSO provider disabled" : "SSO provider enabled");
        loadConfigs();
      }
    } catch {
      toast.error("Failed to update");
    }
  }

  async function handleDelete(id: number) {
    try {
      const res = await fetch(`/api/admin/sso/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("SSO provider deleted");
        loadConfigs();
      }
    } catch {
      toast.error("Failed to delete");
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground py-4">Loading SSO configurations...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Connect your identity provider to allow users to sign in with their corporate credentials.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Add Identity Provider
        </Button>
      </div>

      {configs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            No identity providers configured. Click &quot;Add Identity Provider&quot; to get started.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {configs.map((config) => (
            <Card key={config.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-teal-600" />
                    {config.providerName || PROVIDERS.find((p) => p.value === config.provider)?.label || config.provider}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={config.enabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-gray-50 text-gray-500 border-gray-200"}>
                      {config.enabled ? "Enabled" : "Disabled"}
                    </Badge>
                    {!config.supabaseSsoId && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 text-xs">
                        Pending Activation
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Provider:</span>{" "}
                    {PROVIDERS.find((p) => p.value === config.provider)?.label || config.provider}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Domain:</span>{" "}
                    {config.domain || "Not set"}
                  </div>
                  {config.metadataUrl && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Metadata URL:</span>{" "}
                      <span className="font-mono text-xs break-all">{config.metadataUrl}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => toggleEnabled(config)}>
                    {config.enabled ? "Disable" : "Enable"}
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50" onClick={() => handleDelete(config.id)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Identity Provider</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Provider</label>
              <select
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PROVIDERS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={form.providerName}
                onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                placeholder="e.g., Acme Corp Azure AD"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Email Domain</label>
              <Input
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                placeholder="e.g., acme.com"
                className="mt-1"
              />
              <p className="text-xs text-muted-foreground mt-1">Users with this email domain will see the SSO option at login.</p>
            </div>
            <div>
              <label className="text-sm font-medium">Metadata URL</label>
              <Input
                value={form.metadataUrl}
                onChange={(e) => setForm({ ...form, metadataUrl: e.target.value })}
                placeholder="https://login.microsoftonline.com/..."
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={saving || !form.provider}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Configuration"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
