"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";

// -----------------------------------------------
// Types
// -----------------------------------------------

interface ScheduledExport {
  id: number;
  name: string;
  exportType: string;
  schedule: string;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  hour: number;
  enabled: boolean;
  lastRunAt: string | null;
  lastRunStatus: string | null;
  lastRunError: string | null;
  nextRunAt: string | null;
  createdBy: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface ExportType {
  value: string;
  label: string;
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// -----------------------------------------------
// ScheduledExportsSection
// -----------------------------------------------

export function ScheduledExportsSection() {
  const [exports, setExports] = useState<ScheduledExport[]>([]);
  const [exportTypes, setExportTypes] = useState<ExportType[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExport, setEditingExport] = useState<ScheduledExport | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingExport, setDeletingExport] = useState<ScheduledExport | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState("");
  const [formExportType, setFormExportType] = useState("");
  const [formSchedule, setFormSchedule] = useState("daily");
  const [formDayOfWeek, setFormDayOfWeek] = useState<number>(1);
  const [formDayOfMonth, setFormDayOfMonth] = useState<number>(1);
  const [formHour, setFormHour] = useState<number>(6);
  const [formEnabled, setFormEnabled] = useState(true);

  const loadExports = useCallback(() => {
    setLoading(true);
    fetch("/api/admin/scheduled-exports")
      .then((res) => res.json())
      .then((data) => {
        setExports(data.exports || []);
        setExportTypes(data.exportTypes || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Failed to load scheduled exports");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadExports();
  }, [loadExports]);

  function openNewDialog() {
    setEditingExport(null);
    setFormName("");
    setFormExportType(exportTypes[0]?.value || "excel");
    setFormSchedule("daily");
    setFormDayOfWeek(1);
    setFormDayOfMonth(1);
    setFormHour(6);
    setFormEnabled(true);
    setDialogOpen(true);
  }

  function openEditDialog(exp: ScheduledExport) {
    setEditingExport(exp);
    setFormName(exp.name);
    setFormExportType(exp.exportType);
    setFormSchedule(exp.schedule);
    setFormDayOfWeek(exp.dayOfWeek ?? 1);
    setFormDayOfMonth(exp.dayOfMonth ?? 1);
    setFormHour(exp.hour);
    setFormEnabled(exp.enabled);
    setDialogOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!formExportType) {
      toast.error("Export type is required");
      return;
    }

    setSaving(true);
    try {
      if (editingExport) {
        const res = await fetch("/api/admin/scheduled-exports", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingExport.id,
            name: formName.trim(),
            schedule: formSchedule,
            dayOfWeek: formSchedule === "weekly" ? formDayOfWeek : null,
            dayOfMonth: formSchedule === "monthly" ? formDayOfMonth : null,
            hour: formHour,
            enabled: formEnabled,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to update export");
        } else {
          toast.success("Export updated");
          setDialogOpen(false);
          loadExports();
        }
      } else {
        const res = await fetch("/api/admin/scheduled-exports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formName.trim(),
            exportType: formExportType,
            schedule: formSchedule,
            dayOfWeek: formSchedule === "weekly" ? formDayOfWeek : null,
            dayOfMonth: formSchedule === "monthly" ? formDayOfMonth : null,
            hour: formHour,
            enabled: formEnabled,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error || "Failed to create export");
        } else {
          toast.success("Export created");
          setDialogOpen(false);
          loadExports();
        }
      }
    } catch {
      toast.error("Failed to save export");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(exp: ScheduledExport) {
    try {
      const res = await fetch("/api/admin/scheduled-exports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: exp.id, enabled: !exp.enabled }),
      });
      if (!res.ok) {
        toast.error("Failed to toggle export");
      } else {
        loadExports();
      }
    } catch {
      toast.error("Failed to toggle export");
    }
  }

  async function handleDelete() {
    if (!deletingExport) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/scheduled-exports", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deletingExport.id }),
      });
      if (!res.ok) {
        toast.error("Failed to delete export");
      } else {
        toast.success("Export deleted");
        setDeleteDialogOpen(false);
        setDeletingExport(null);
        loadExports();
      }
    } catch {
      toast.error("Failed to delete export");
    } finally {
      setSaving(false);
    }
  }

  function formatTimestamp(ts: string | null) {
    if (!ts) return "-";
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  }

  function formatSchedule(exp: ScheduledExport) {
    const hourStr = `${exp.hour.toString().padStart(2, "0")}:00 UTC`;
    if (exp.schedule === "daily") return `Daily at ${hourStr}`;
    if (exp.schedule === "weekly") {
      return `Weekly on ${DAY_NAMES[exp.dayOfWeek ?? 0]} at ${hourStr}`;
    }
    if (exp.schedule === "monthly") {
      const day = exp.dayOfMonth ?? 1;
      const suffix = day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th";
      return `Monthly on the ${day}${suffix} at ${hourStr}`;
    }
    return exp.schedule;
  }

  function getExportTypeLabel(value: string) {
    return exportTypes.find((t) => t.value === value)?.label || value;
  }

  function getStatusBadge(status: string | null) {
    if (!status) {
      return (
        <Badge variant="outline" className="text-xs">
          <Clock className="h-3 w-3 mr-1" />
          Never run
        </Badge>
      );
    }
    if (status === "success") {
      return (
        <Badge variant="default" className="text-xs bg-emerald-600 hover:bg-emerald-700">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Success
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="text-xs">
        <XCircle className="h-3 w-3 mr-1" />
        Failed
      </Badge>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            Scheduled Exports
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Automate recurring data exports on a daily, weekly, or monthly schedule.
          </p>
        </div>
        <Button size="sm" onClick={openNewDialog}>
          <Plus className="h-4 w-4 mr-1" />
          New Export
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 py-8 justify-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading exports...
          </div>
        ) : exports.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No scheduled exports configured. Click &quot;New Export&quot; to create one.
          </p>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Export Type</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Next Run</TableHead>
                  <TableHead>Last Run</TableHead>
                  <TableHead className="text-center">Enabled</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exports.map((exp) => (
                  <TableRow key={exp.id}>
                    <TableCell className="font-medium text-sm">{exp.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {getExportTypeLabel(exp.exportType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatSchedule(exp)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimestamp(exp.nextRunAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {getStatusBadge(exp.lastRunStatus)}
                        {exp.lastRunAt && (
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(exp.lastRunAt)}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={exp.enabled}
                        onCheckedChange={() => handleToggle(exp)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(exp)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDeletingExport(exp);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* New / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingExport ? "Edit Scheduled Export" : "New Scheduled Export"}
            </DialogTitle>
            <DialogDescription>
              {editingExport
                ? "Update the export schedule configuration."
                : "Create a new scheduled export to automate data delivery."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="export-name">Name *</Label>
              <Input
                id="export-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Weekly SOD Report"
              />
            </div>
            <div className="space-y-2">
              <Label>Export Type *</Label>
              <Select
                value={formExportType}
                onValueChange={setFormExportType}
                disabled={!!editingExport}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select export type..." />
                </SelectTrigger>
                <SelectContent>
                  {exportTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {editingExport && (
                <p className="text-xs text-muted-foreground">
                  Export type cannot be changed after creation.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Schedule *</Label>
              <Select value={formSchedule} onValueChange={setFormSchedule}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {formSchedule === "weekly" && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={String(formDayOfWeek)}
                  onValueChange={(v) => setFormDayOfWeek(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAY_NAMES.map((day, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {formSchedule === "monthly" && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select
                  value={String(formDayOfMonth)}
                  onValueChange={(v) => setFormDayOfMonth(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Limited to 1-28 to avoid month-length issues.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Hour (UTC)</Label>
              <Select
                value={String(formHour)}
                onValueChange={(v) => setFormHour(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="export-enabled"
                checked={formEnabled}
                onCheckedChange={setFormEnabled}
              />
              <Label htmlFor="export-enabled">Enabled</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !formName.trim() || !formExportType}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              {editingExport ? "Save Changes" : "Create Export"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Scheduled Export</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this scheduled export? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {deletingExport && (
            <p className="text-sm">
              Export: <span className="font-medium">{deletingExport.name}</span>
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
