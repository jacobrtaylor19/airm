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
import { Plus, Trash2, Loader2, Layers, Pencil } from "lucide-react";
import { toast } from "sonner";

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

interface ReleaseAssignment {
  id: number;
  appUserId: number;
  appUserName: string;
  appUserRole: string;
  releaseId: number;
  releaseName: string;
}

interface ReleaseInfo {
  id: number;
  name: string;
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

  // Edit assignment state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editUserId, setEditUserId] = useState("");
  const [editScopeType, setEditScopeType] = useState("department");
  const [editScopeValue, setEditScopeValue] = useState("");

  // Edit release assignment state
  const [editReleaseDialogOpen, setEditReleaseDialogOpen] = useState(false);
  const [editingReleaseAssignment, setEditingReleaseAssignment] = useState<ReleaseAssignment | null>(null);
  const [editReleaseUserId, setEditReleaseUserId] = useState("");
  const [editReleaseId, setEditReleaseId] = useState("");

  // Release assignment state
  const [releaseAssignments, setReleaseAssignments] = useState<ReleaseAssignment[]>([]);
  const [releases, setReleases] = useState<ReleaseInfo[]>([]);
  const [releaseDialogOpen, setReleaseDialogOpen] = useState(false);
  const [releaseUserId, setReleaseUserId] = useState("");
  const [releaseId, setReleaseId] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [aRes, uRes, raRes, rRes] = await Promise.all([
      fetch("/api/admin/assignments"),
      fetch("/api/admin/app-users"),
      fetch("/api/admin/release-assignments"),
      fetch("/api/releases"),
    ]);
    if (aRes.ok) setAssignments(await aRes.json());
    if (uRes.ok) setAppUsers(await uRes.json());
    if (raRes.ok) setReleaseAssignments(await raRes.json());
    if (rRes.ok) {
      const data = await rRes.json();
      setReleases(Array.isArray(data) ? data : data.releases || []);
    }
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

  function openEditDialog(assignment: Assignment) {
    setEditingAssignment(assignment);
    setEditUserId(String(assignment.appUserId));
    setEditScopeType(assignment.scopeType);
    setEditScopeValue(assignment.scopeValue);
    setEditDialogOpen(true);
  }

  async function editAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAssignment) return;
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingAssignment.id,
          appUserId: Number(editUserId),
          scopeType: editScopeType,
          scopeValue: editScopeValue,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to update");
        return;
      }
      toast.success("Assignment updated");
      setEditDialogOpen(false);
      setEditingAssignment(null);
      fetchData();
    } catch {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  function openEditReleaseDialog(ra: ReleaseAssignment) {
    setEditingReleaseAssignment(ra);
    setEditReleaseUserId(String(ra.appUserId));
    setEditReleaseId(String(ra.releaseId));
    setEditReleaseDialogOpen(true);
  }

  async function editReleaseAssignment(e: React.FormEvent) {
    e.preventDefault();
    if (!editingReleaseAssignment) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/release-assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingReleaseAssignment.id,
          appUserId: Number(editReleaseUserId),
          releaseId: Number(editReleaseId),
        }),
      });
      if (res.ok) {
        toast.success("Release assignment updated");
        setEditReleaseDialogOpen(false);
        setEditingReleaseAssignment(null);
        fetchData();
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const mapperAssignments = assignments.filter((a) => a.assignmentType === "mapper");
  const approverAssignments = assignments.filter((a) => a.assignmentType === "approver");

  const eligibleUsers = appUsers.filter((u) =>
    assignmentType === "mapper" ? u.role === "mapper" || u.role === "admin" :
    assignmentType === "approver" ? u.role === "approver" || u.role === "admin" :
    true
  );

  const editEligibleUsers = editingAssignment
    ? appUsers.filter((u) =>
        editingAssignment.assignmentType === "mapper"
          ? u.role === "mapper" || u.role === "admin"
          : editingAssignment.assignmentType === "approver"
          ? u.role === "approver" || u.role === "admin"
          : true
      )
    : [];

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
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => openEditDialog(a)}>
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => deleteAssignment(a.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
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
            <TabsTrigger value="releases" className="flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Release Access ({releaseAssignments.length})
            </TabsTrigger>
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
          <TabsContent value="releases" className="mt-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end mb-4">
                  <Button size="sm" onClick={() => setReleaseDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" /> Assign User to Release
                  </Button>
                </div>
                {releaseAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No release assignments. Users without release assignments can see all releases.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Release</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {releaseAssignments.map((ra) => (
                        <TableRow key={ra.id}>
                          <TableCell className="font-medium">{ra.appUserName}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{ra.appUserRole}</Badge>
                          </TableCell>
                          <TableCell>{ra.releaseName}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => openEditReleaseDialog(ra)}
                              >
                                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                onClick={async () => {
                                  await fetch(`/api/admin/release-assignments?id=${ra.id}`, { method: "DELETE" });
                                  toast.success("Release assignment removed");
                                  fetchData();
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
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

      {/* Edit Assignment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={editAssignment} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Assignment Type</label>
              <Input value={editingAssignment?.assignmentType ?? ""} disabled className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Assign To</label>
              <Select value={editUserId} onValueChange={setEditUserId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select a user" /></SelectTrigger>
                <SelectContent>
                  {editEligibleUsers.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.displayName} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Scope Type</label>
              <Select value={editScopeType} onValueChange={setEditScopeType}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="department">Department</SelectItem>
                  <SelectItem value="user">Individual User</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">
                {editScopeType === "department" ? "Department" : "Source User ID"}
              </label>
              {editScopeType === "department" ? (
                <Select value={editScopeValue} onValueChange={setEditScopeValue}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={editScopeValue}
                  onChange={(e) => setEditScopeValue(e.target.value)}
                  placeholder="e.g., U001"
                  className="mt-1"
                />
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !editUserId || !editScopeValue}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Release Assignment Dialog */}
      <Dialog open={editReleaseDialogOpen} onOpenChange={setEditReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Release Assignment</DialogTitle>
          </DialogHeader>
          <form onSubmit={editReleaseAssignment} className="space-y-4">
            <div>
              <label className="text-sm font-medium">User</label>
              <Select value={editReleaseUserId} onValueChange={setEditReleaseUserId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {appUsers.filter(u => !["admin", "system_admin"].includes(u.role)).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.displayName} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Release</label>
              <Select value={editReleaseId} onValueChange={setEditReleaseId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select release" /></SelectTrigger>
                <SelectContent>
                  {releases.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setEditReleaseDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !editReleaseUserId || !editReleaseId}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Release Assignment Dialog */}
      <Dialog open={releaseDialogOpen} onOpenChange={setReleaseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign User to Release</DialogTitle>
          </DialogHeader>
          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!releaseUserId || !releaseId) return;
            setSubmitting(true);
            try {
              const res = await fetch("/api/admin/release-assignments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ appUserId: Number(releaseUserId), releaseId: Number(releaseId) }),
              });
              if (res.ok) {
                toast.success("Release assignment created");
                setReleaseDialogOpen(false);
                setReleaseUserId("");
                setReleaseId("");
                fetchData();
              } else {
                const data = await res.json();
                toast.error(data.error || "Failed");
              }
            } finally {
              setSubmitting(false);
            }
          }} className="space-y-4">
            <div>
              <label className="text-sm font-medium">User</label>
              <Select value={releaseUserId} onValueChange={setReleaseUserId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select user" /></SelectTrigger>
                <SelectContent>
                  {appUsers.filter(u => !["admin", "system_admin"].includes(u.role)).map((u) => (
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.displayName} ({u.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Release</label>
              <Select value={releaseId} onValueChange={setReleaseId}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select release" /></SelectTrigger>
                <SelectContent>
                  {releases.map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs text-muted-foreground">
              Users without release assignments can see all releases. Assigning specific releases restricts their view.
            </p>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setReleaseDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !releaseUserId || !releaseId}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
