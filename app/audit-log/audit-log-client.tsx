"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { AuditLogRow } from "@/lib/queries";

function relativeTime(iso: string): string {
  try {
    return formatDistanceToNow(new Date(iso), { addSuffix: true });
  } catch {
    return iso;
  }
}

function formatAuditValue(val: string | null): React.ReactNode {
  if (!val) return "\u2014";
  try {
    const parsed = JSON.parse(val);
    if (typeof parsed === "object" && parsed !== null) {
      const entries = Object.entries(parsed).filter(([, v]) => v !== null && v !== undefined);
      if (entries.length === 0) return "\u2014";
      return (
        <span className="inline-flex flex-col gap-0.5">
          {entries.map(([k, v]) => {
            const label = k.replace(/([A-Z])/g, " $1").replace(/_/g, " ").replace(/Id$/, "").trim();
            const capLabel = label.charAt(0).toUpperCase() + label.slice(1);
            return (
              <span key={k}>
                <span className="text-muted-foreground">{capLabel}:</span>{" "}
                <span className="font-medium">{String(v)}</span>
              </span>
            );
          })}
        </span>
      );
    }
    return String(parsed);
  } catch {
    return val.length > 100 ? val.slice(0, 100) + "\u2026" : val;
  }
}

const actionColors: Record<string, string> = {
  create: "bg-emerald-50 text-emerald-700",
  update: "bg-blue-50 text-blue-700",
  delete: "bg-red-50 text-red-700",
  confirm: "bg-teal-50 text-teal-700",
  reset: "bg-orange-50 text-orange-700",
  approve: "bg-emerald-50 text-emerald-700",
  reject: "bg-red-50 text-red-700",
};

function getActionColor(action: string): string {
  const lower = action.toLowerCase();
  for (const [key, cls] of Object.entries(actionColors)) {
    if (lower.includes(key)) return cls;
  }
  return "";
}

export function AuditLogClient({ logs }: { logs: AuditLogRow[] }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const filtered = useMemo(() => {
    if (!search) return logs;
    const lower = search.toLowerCase();
    return logs.filter(
      (l) =>
        l.entityType.toLowerCase().includes(lower) ||
        l.action.toLowerCase().includes(lower) ||
        (l.actorEmail?.toLowerCase().includes(lower) ?? false)
    );
  }, [logs, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const paged = filtered.slice(startIdx, startIdx + pageSize);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder="Filter by entity, action, or actor..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="pl-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
          {logs.length === 0
            ? "No audit log entries yet. Actions will be recorded as you use the tool."
            : "No entries match the filter."}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Changes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paged.map((log) => (
                <TableRow key={log.id}>
                  <TableCell
                    className="text-xs text-muted-foreground whitespace-nowrap"
                    title={new Date(log.createdAt).toLocaleString()}
                  >
                    {relativeTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{log.entityType}</Badge>
                    <span className="ml-1 text-xs text-muted-foreground font-mono">#{log.entityId}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={`text-xs ${getActionColor(log.action)}`}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{log.actorEmail ?? "system"}</TableCell>
                  <TableCell className="text-xs max-w-[300px]">
                    {log.oldValue && log.newValue ? (
                      <span title={`Old: ${log.oldValue}\nNew: ${log.newValue}`}>
                        <span className="text-muted-foreground">{formatAuditValue(log.oldValue)}</span>
                        <span className="mx-1 text-slate-300">{"\u2192"}</span>
                        <span className="font-medium">{formatAuditValue(log.newValue)}</span>
                      </span>
                    ) : log.newValue ? (
                      <span title={`${log.newValue}`}>{formatAuditValue(log.newValue)}</span>
                    ) : log.oldValue ? (
                      <span className="text-muted-foreground line-through" title={`${log.oldValue}`}>
                        {formatAuditValue(log.oldValue)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">{"\u2014"}</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length === 0 ? 0 : startIdx + 1}–{Math.min(startIdx + pageSize, filtered.length)} of {filtered.length}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={safePage <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs text-muted-foreground tabular-nums">{safePage} / {totalPages}</span>
          <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={safePage >= totalPages} onClick={() => setPage(p => p + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
