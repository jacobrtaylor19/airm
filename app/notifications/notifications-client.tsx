"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Send, Inbox, CheckCircle, Loader2, AlertTriangle, Info, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface NotificationInboxItem {
  id: number;
  fromUserId: number;
  fromDisplayName: string;
  notificationType: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

interface NotificationSentItem {
  id: number;
  toUserId: number;
  toDisplayName: string;
  notificationType: string;
  subject: string;
  message: string;
  status: string;
  createdAt: string;
}

interface Recipient {
  id: number;
  displayName: string;
  role: string;
  assignedOrgUnitId: number | null;
}

interface NotificationsClientProps {
  inbox: NotificationInboxItem[];
  sent: NotificationSentItem[];
  recipients: Recipient[];
  canSend: boolean;
  currentUserId: number;
}

const QUICK_MESSAGES: Record<string, { subject: string; message: string }> = {
  mapping_pending: {
    subject: "Action Required: Pending Role Mappings",
    message:
      "You have personas awaiting role mapping. Please log in to the Role Mapping workspace and complete your assigned mappings. If you have questions, contact your coordinator.",
  },
  approval_pending: {
    subject: "Action Required: Approvals Awaiting Review",
    message:
      "You have role assignments pending your approval. Please review and approve or reject each assignment in the Approvals page. Time-sensitive items may be approaching their release deadline.",
  },
  sod_review: {
    subject: "Action Required: SOD Conflicts Require Resolution",
    message:
      "One or more SOD conflicts have been flagged in your area of responsibility. Please review and resolve these conflicts in the SOD Analysis page before proceeding with approvals.",
  },
  least_access: {
    subject: "Action Required: Over-Provisioning Review",
    message:
      "Some role mappings in your area have been flagged for over-provisioning. Please review the Provisioning Alerts section on the dashboard and either revise the mapping or accept an exception with justification.",
  },
};

function typeIcon(type: string) {
  if (type === "escalation") return <AlertTriangle className="h-3.5 w-3.5 text-red-500" />;
  if (type === "reminder") return <Clock className="h-3.5 w-3.5 text-orange-500" />;
  return <Info className="h-3.5 w-3.5 text-blue-500" />;
}

function typeVariant(type: string): "destructive" | "secondary" | "outline" {
  if (type === "escalation") return "destructive";
  if (type === "reminder") return "secondary";
  return "outline";
}

export function NotificationsClient({ inbox, sent, recipients, canSend }: NotificationsClientProps) {
  const router = useRouter();
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [notificationType, setNotificationType] = useState("reminder");
  const [quickMessage, setQuickMessage] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [markingRead, setMarkingRead] = useState<number | null>(null);

  const unreadCount = inbox.filter(n => n.status !== "read").length;

  function applyQuickMessage(key: string) {
    setQuickMessage(key);
    if (key && QUICK_MESSAGES[key]) {
      setSubject(QUICK_MESSAGES[key].subject);
      setMessage(QUICK_MESSAGES[key].message);
    } else {
      setSubject("");
      setMessage("");
    }
  }

  function toggleRecipient(id: number) {
    setSelectedRecipients(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  }

  function selectAllByRole(role: string) {
    const ids = recipients.filter(r => r.role === role).map(r => r.id);
    setSelectedRecipients(prev => {
      const all = new Set(prev);
      ids.forEach(id => all.add(id));
      return Array.from(all);
    });
  }

  async function handleSend() {
    if (selectedRecipients.length === 0 || !subject.trim() || !message.trim()) return;
    setSending(true);
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toUserIds: selectedRecipients,
          notificationType,
          subject: subject.trim(),
          message: message.trim(),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to send");
        return;
      }
      const data = await res.json();
      toast.success(`Notification sent to ${data.sent} recipient${data.sent !== 1 ? "s" : ""}`);
      setSelectedRecipients([]);
      setSubject("");
      setMessage("");
      setQuickMessage("");
      router.refresh();
    } catch {
      toast.error("Network error");
    } finally {
      setSending(false);
    }
  }

  async function markRead(id: number) {
    setMarkingRead(id);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      router.refresh();
    } finally {
      setMarkingRead(null);
    }
  }

  return (
    <Tabs defaultValue={canSend ? "compose" : "inbox"}>
      <TabsList>
        {canSend && (
          <TabsTrigger value="compose" className="flex items-center gap-1.5">
            <Send className="h-3.5 w-3.5" />
            Compose
          </TabsTrigger>
        )}
        <TabsTrigger value="inbox" className="flex items-center gap-1.5">
          <Inbox className="h-3.5 w-3.5" />
          Inbox
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-4 min-w-[16px] px-1 text-[10px] ml-0.5">
              {unreadCount}
            </Badge>
          )}
        </TabsTrigger>
        {canSend && (
          <TabsTrigger value="sent" className="flex items-center gap-1.5">
            <CheckCircle className="h-3.5 w-3.5" />
            Sent ({sent.length})
          </TabsTrigger>
        )}
      </TabsList>

      {/* ── COMPOSE TAB ── */}
      {canSend && (
        <TabsContent value="compose" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Recipients */}
            <Card className="lg:col-span-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">
                  Recipients
                  {selectedRecipients.length > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {selectedRecipients.length} selected
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => selectAllByRole("mapper")}>
                    All Mappers
                  </Button>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => selectAllByRole("approver")}>
                    All Approvers
                  </Button>
                </div>
                <div className="space-y-1 max-h-[360px] overflow-y-auto">
                  {recipients.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No mappers or approvers found.</p>
                  ) : (
                    recipients.map(r => (
                      <div key={r.id} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          id={`r-${r.id}`}
                          className="h-4 w-4 accent-primary"
                          checked={selectedRecipients.includes(r.id)}
                          onChange={() => toggleRecipient(r.id)}
                        />
                        <label htmlFor={`r-${r.id}`} className="text-sm cursor-pointer flex-1 truncate">
                          {r.displayName}
                        </label>
                        <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                          {r.role}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Message */}
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Type</Label>
                    <Select value={notificationType} onValueChange={setNotificationType}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="reminder">Reminder</SelectItem>
                        <SelectItem value="escalation">Escalation</SelectItem>
                        <SelectItem value="info">Info / Update</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Quick Message</Label>
                    <Select value={quickMessage} onValueChange={applyQuickMessage}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Choose template..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mapping_pending">Mapping Pending</SelectItem>
                        <SelectItem value="approval_pending">Approval Pending</SelectItem>
                        <SelectItem value="sod_review">SOD Review Required</SelectItem>
                        <SelectItem value="least_access">Over-Provisioning Review</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Subject</Label>
                  <Input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Notification subject..."
                    className="text-sm h-8"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Message</Label>
                  <Textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    placeholder="Write your message..."
                    rows={5}
                    className="text-sm resize-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    Demo mode — no emails will be sent. Recipients will see this in their AIRM inbox.
                  </p>
                  <Button
                    onClick={handleSend}
                    disabled={sending || selectedRecipients.length === 0 || !subject.trim() || !message.trim()}
                    size="sm"
                    className="gap-1.5"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    Send to {selectedRecipients.length || "..."} recipient{selectedRecipients.length !== 1 ? "s" : ""}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      )}

      {/* ── INBOX TAB ── */}
      <TabsContent value="inbox" className="mt-4">
        {inbox.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No notifications yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {inbox.map(n => (
              <Card key={n.id} className={n.status !== "read" ? "border-primary/30 bg-primary/5" : ""}>
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                      {typeIcon(n.notificationType)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-medium ${n.status !== "read" ? "" : "text-muted-foreground"}`}>
                            {n.subject}
                          </span>
                          <Badge variant={typeVariant(n.notificationType)} className="text-[10px]">
                            {n.notificationType}
                          </Badge>
                          {n.status !== "read" && (
                            <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          From <strong>{n.fromDisplayName}</strong> &middot;{" "}
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                        <p className="text-sm mt-1.5 whitespace-pre-line text-muted-foreground">{n.message}</p>
                      </div>
                    </div>
                    {n.status !== "read" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs shrink-0"
                        onClick={() => markRead(n.id)}
                        disabled={markingRead === n.id}
                      >
                        {markingRead === n.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        Mark read
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      {/* ── SENT TAB ── */}
      {canSend && (
        <TabsContent value="sent" className="mt-4">
          {sent.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Send className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No notifications sent yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {sent.map(n => (
                <Card key={n.id}>
                  <CardContent className="py-3">
                    <div className="flex items-start gap-2">
                      {typeIcon(n.notificationType)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{n.subject}</span>
                          <Badge variant={typeVariant(n.notificationType)} className="text-[10px]">
                            {n.notificationType}
                          </Badge>
                          {n.status === "read" ? (
                            <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200">
                              Read
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px]">
                              Delivered
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          To <strong>{n.toDisplayName}</strong> &middot;{" "}
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">{n.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      )}
    </Tabs>
  );
}
