"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCheck, Mail, MailOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Notification {
  id: number;
  fromUserId: number;
  toUserId: number;
  notificationType: string;
  subject: string;
  message: string;
  actionUrl: string | null;
  status: string;
  readAt: string | null;
  createdAt: string;
  fromDisplayName: string;
}

interface InboxClientProps {
  notifications: Notification[];
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function typeBadge(type: string) {
  switch (type) {
    case "workflow_event":
      return <Badge variant="outline" className="text-[10px] border-blue-300 text-blue-700">Workflow</Badge>;
    case "reminder":
      return <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">Reminder</Badge>;
    case "system":
      return <Badge variant="outline" className="text-[10px] border-slate-300 text-slate-600">System</Badge>;
    case "escalation":
      return <Badge variant="outline" className="text-[10px] border-red-300 text-red-700">Escalation</Badge>;
    default:
      return <Badge variant="outline" className="text-[10px]">{type}</Badge>;
  }
}

export function InboxClient({ notifications }: InboxClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<number | "all" | null>(null);

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  async function markOneRead(id: number) {
    setLoading(id);
    try {
      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("Failed to mark as read");
      router.refresh();
    } catch {
      toast.error("Failed to mark notification as read");
    } finally {
      setLoading(null);
    }
  }

  async function markAllRead() {
    setLoading("all");
    try {
      const res = await fetch("/api/notifications/mark-all-read", {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Failed to mark all as read");
      toast.success("All notifications marked as read");
      router.refresh();
    } catch {
      toast.error("Failed to dismiss all notifications");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-slate-700">Inbox</h2>
          {unreadCount > 0 && (
            <Badge className="bg-blue-600 text-white text-[10px]">
              {unreadCount} unread
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={markAllRead}
            disabled={loading === "all"}
          >
            <CheckCheck className="h-3.5 w-3.5 mr-1.5" />
            {loading === "all" ? "Dismissing..." : "Dismiss All"}
          </Button>
        )}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 p-8 text-center">
          <MailOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-500">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {notifications.map((n) => {
            const isUnread = !n.readAt;
            return (
              <div
                key={n.id}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  isUnread
                    ? "border-l-4 border-l-blue-500 border-t border-r border-b border-slate-200 bg-blue-50/40"
                    : "border-slate-200 bg-white"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0 flex-1">
                    {isUnread ? (
                      <Mail className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                    ) : (
                      <MailOpen className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("text-sm", isUnread ? "font-semibold text-slate-900" : "font-medium text-slate-700")}>
                          {n.subject}
                        </span>
                        {typeBadge(n.notificationType)}
                      </div>
                      <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] text-slate-400">
                          From {n.fromDisplayName} &middot; {relativeTime(n.createdAt)}
                        </span>
                        {n.actionUrl && (
                          <a
                            href={n.actionUrl}
                            className="inline-flex items-center gap-0.5 text-[10px] text-blue-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  {isUnread && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="shrink-0 text-xs h-7"
                      onClick={() => markOneRead(n.id)}
                      disabled={loading === n.id}
                    >
                      {loading === n.id ? "..." : "Mark Read"}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
