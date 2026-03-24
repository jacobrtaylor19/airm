"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Loader2 } from "lucide-react";

interface Assignment {
  id: number;
  appUserId: number;
  appUserName: string;
  appUserRole: string;
  assignmentType: string;
  scopeType: string;
  scopeValue: string;
}

interface AppUser {
  id: number;
  username: string;
  displayName: string;
  role: string;
}

export function AssignmentsClient() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignmentType, setAssignmentType] = useState("mapper");
  const [scopeType, setScopeType] = useState("department");
  const [scopeValue, setScopeValue] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [aRes, uRes] = await Promise.all([
      fetch("/api/admin/assignments"),
      fetch("/api/admin/app-users"),
    ]);
    if (aRes.ok) setAssignments(await aRes.json());
    if (uRes.ok) setAppUsers(await uRes.json());
    setLoading(false);
  }

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appUserId: Number(selectedUserId),
          assignmentType,
          scopeType,
          scopeValue,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed");
        return;
      }
      setDialogOpen(false);
      setScopeValue("");
      setSelectedUserId("");
      fetchData();
    } catch {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteAssignment(id: number) {
    await fetch(`/api/admin/assignments?id=${id}`, { method: "DELETE" });
    fetchData();
  }

  const mapperAssignments = assignments.filter((a) => a.assignmentType === "mapper");
  const approverAssignments = assignments.filter((a) => a.assignmentType === "approver");

  const eligibleUsers = appUsers.filter((u) =>
    assignmentType === "mapper" ? u.role === "mapper" || u.role === "admin" :
    assignmentType === "approver" ? u.role === "approver" || u.role === "admin" :
    true
  );

  const departments = [
    "Finance", "Procurement", "Supply Chain", "Maintenance", "Warehouse",
    "Product", "Product Development", "Quality", "Facilities",
    "Market Research", "Research & Development",
  ];

  function renderAssignmentTable(items: Assignment[]) {
    if (items.length === 0) {
      return (
        <p className="text-sm text-muted-foreground text-center py-8">
          No assignments configured. Click &quot;Add Assignment&quot; to get started.
        </p>
      );
    }
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Assigned To</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Scope</TableHead>
            <TableHead>Value</TableHead>
            <TableHead className="w-10"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="text-sm font-medium">{a.appUserName}</TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{a.appUserRole}</Badge>
              </TableCell>
              <TableCell className="text-sm">{a.scopeType}</TableCell>
              <TableCell className="text-sm font-medium">{a.scopeValue}</TableCell>
              <TableCell>
                <Button variant="ghost" size="sm" onClick={() => deleteAssignment(a.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add Assignment
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="mappers">
          <TabsList>
            <TabsTrigger value="mappers">Mapper Assignments ({mapperAssignments.length})</TabsTrigger>
            <TabsTrigger value="approvers">Approver Assignments ({approverAssignments.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="mappers" className="mt-4">
            <Card>
              <CardContent className="pt-6">{renderAssignmentTable(mapperAssignments)}</CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="approvers" className="mt-4">
            <Card>
              <CardContent className="pt-6">{renderAssignmentTable(approverAssignments)}</CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Work Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={createAssignment} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Assignment Type</label>
              <Select value={assignmentType} onValueChange={setAssignmentType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mapper">Mapper</SelectItem>
                  <SelectItem value="approver">Approver</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a user" /></SelectTrigger>
                <SelectContent>
                  {eligibleUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.displayName} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Scope Type</label>
              <Select value={scopeType} onValueChange={setScopeType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="user">Individual User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                {scopeType === "department" ? "Department" : "Source User ID"}
              </label>
              {scopeType === "department" ? (
                <Select value={scopeValue} onValueChange={setScopeValue}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={scopeValue}
                  onChange={(e) => setScopeValue(e.target.value)}
                  placeholder="e.g., U001"
                  className="mt-1"
                />
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !selectedUserId || !scopeValue}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
