"use client";

import { useState, useMemo } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AuditLogRow } from "@/lib/queries";

export function AuditLogClient({ logs }: { logs: AuditLogRow[] }) {
  const [search, setSearch] = useState("");

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

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleString();
  }

  function truncateJson(val: string | null, max = 80): string {
    if (!val) return "—";
    return val.length > max ? val.slice(0, max) + "..." : val;
  }

  return (
    <div className="space-y-3">
      <Input
        placeholder="Filter by entity type or action..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-sm"
      />

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
                <TableHead className="w-[60px]">ID</TableHead>
                <TableHead>Timestamp</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead className="w-[60px]">Entity ID</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Old Value</TableHead>
                <TableHead>New Value</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-mono text-xs">{log.id}</TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(log.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">{log.entityType}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.entityId}</TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-xs">{log.actorEmail ?? "system"}</TableCell>
                  <TableCell className="text-xs font-mono max-w-[150px] truncate" title={log.oldValue ?? undefined}>
                    {truncateJson(log.oldValue)}
                  </TableCell>
                  <TableCell className="text-xs font-mono max-w-[150px] truncate" title={log.newValue ?? undefined}>
                    {truncateJson(log.newValue)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {filtered.length} of {logs.length} entries
      </p>
    </div>
  );
}
