"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Mail, Send, CheckCircle2, XCircle } from "lucide-react";

interface EmailSettingsSectionProps {
  settings: Record<string, string>;
  settingsLoading: boolean;
  settingsSaving: boolean;
  settingsMsg: string;
  onUpdateSetting: (key: string, value: string) => void;
  onSaveSettings: (keys: string[]) => void;
}

const EMAIL_SETTING_KEYS = [
  "email_enabled",
  "email_from_address",
  "email_from_name",
  "email_reply_to",
  "email_provider",
];

export function EmailSettingsSection({
  settings,
  settingsLoading,
  settingsSaving,
  settingsMsg,
  onUpdateSetting,
  onSaveSettings,
}: EmailSettingsSectionProps) {
  const [testEmailTo, setTestEmailTo] = useState("");
  const [sendingTest, setSendingTest] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<"unknown" | "configured" | "not_set">("unknown");
  const [apiKeyChecked, setApiKeyChecked] = useState(false);

  async function checkApiKeyStatus() {
    try {
      const res = await fetch("/api/admin/test-email", { method: "GET" });
      const data = await res.json();
      setApiKeyStatus(data.apiKeyConfigured ? "configured" : "not_set");
      setApiKeyChecked(true);
    } catch {
      setApiKeyStatus("unknown");
    }
  }

  // Check on first render when not loading
  if (!apiKeyChecked && !settingsLoading) {
    checkApiKeyStatus();
  }

  async function handleSendTestEmail() {
    if (!testEmailTo.trim()) {
      toast.error("Please enter a recipient email address");
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailTo.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Test email sent successfully");
      } else {
        toast.error(data.error || "Failed to send test email");
      }
    } catch {
      toast.error("Failed to send test email");
    } finally {
      setSendingTest(false);
    }
  }

  const emailEnabled = settings["email_enabled"] !== "false";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Mail className="h-4 w-4" />
          Email Settings
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Configure outbound email notifications. Emails are sent via Resend for invite links, workflow notifications, and coordinator messages.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {settingsLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <>
            {/* Email Enabled Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-enabled">Email Notifications</Label>
                <p className="text-xs text-muted-foreground">
                  When disabled, all outbound emails are silently skipped.
                </p>
              </div>
              <Switch
                id="email-enabled"
                checked={emailEnabled}
                onCheckedChange={(checked) =>
                  onUpdateSetting("email_enabled", checked ? "true" : "false")
                }
              />
            </div>

            <div className={emailEnabled ? "" : "opacity-50 pointer-events-none"}>
              {/* Provider + API Key Status */}
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
                    <span className="text-sm">Resend</span>
                    <Badge variant="secondary" className="text-xs">Default</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Email delivery provider. Currently only Resend is supported.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>API Key Status</Label>
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50">
                    {apiKeyStatus === "configured" ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        <span className="text-sm text-emerald-600">Configured</span>
                      </>
                    ) : apiKeyStatus === "not_set" ? (
                      <>
                        <XCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-destructive">Not Set</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Checking...</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Set the <code className="text-xs bg-muted px-1 rounded">RESEND_API_KEY</code> environment variable on Vercel.
                  </p>
                </div>
              </div>

              {/* From Address + From Name */}
              <div className="grid gap-4 sm:grid-cols-2 mb-4">
                <div className="space-y-2">
                  <Label htmlFor="email-from-address">From Address</Label>
                  <Input
                    id="email-from-address"
                    value={settings["email_from_address"] || ""}
                    onChange={(e) => onUpdateSetting("email_from_address", e.target.value)}
                    placeholder="Provisum <notifications@provisum.io>"
                  />
                  <p className="text-xs text-muted-foreground">
                    Full from address including display name, e.g. &quot;Provisum &lt;noreply@provisum.io&gt;&quot;
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email-from-name">From Name</Label>
                  <Input
                    id="email-from-name"
                    value={settings["email_from_name"] || ""}
                    onChange={(e) => onUpdateSetting("email_from_name", e.target.value)}
                    placeholder="Provisum"
                  />
                  <p className="text-xs text-muted-foreground">
                    Display name shown in the email client.
                  </p>
                </div>
              </div>

              {/* Reply-To */}
              <div className="space-y-2 mb-4">
                <Label htmlFor="email-reply-to">Reply-To Address (optional)</Label>
                <Input
                  id="email-reply-to"
                  value={settings["email_reply_to"] || ""}
                  onChange={(e) => onUpdateSetting("email_reply_to", e.target.value)}
                  placeholder="support@example.com"
                  className="max-w-md"
                />
                <p className="text-xs text-muted-foreground">
                  If set, replies to notification emails will go to this address instead of the from address.
                </p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex items-center gap-2">
              <Button
                onClick={() => onSaveSettings(EMAIL_SETTING_KEYS)}
                disabled={settingsSaving}
              >
                {settingsSaving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                Save Email Settings
              </Button>
              {settingsMsg && <span className="text-xs text-emerald-600">{settingsMsg}</span>}
            </div>

            {/* Test Email Section */}
            <div className="border-t pt-4 mt-4">
              <Label className="text-sm font-medium">Send Test Email</Label>
              <p className="text-xs text-muted-foreground mt-1 mb-3">
                Verify your email configuration by sending a test message.
              </p>
              <div className="flex items-center gap-2">
                <Input
                  value={testEmailTo}
                  onChange={(e) => setTestEmailTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="max-w-sm"
                  type="email"
                />
                <Button
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={sendingTest || !testEmailTo.trim()}
                >
                  {sendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Send className="h-4 w-4 mr-1" />
                  )}
                  Send Test
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
