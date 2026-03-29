"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Mail, Upload, RotateCw } from "lucide-react";
import { toast } from "sonner";

interface AppUser {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  inviteStatus: string | null; // "pending" | "accepted" | "expired" | "no_invite" | null
}

const roleColors: Record<string, string> = {
  system_admin: "bg-red-100 text-red-800",
  admin: "bg-purple-100 text-purple-800",
  project_manager: "bg-indigo-100 text-indigo-800",
  coordinator: "bg-amber-100 text-amber-800",
  mapper: "bg-blue-100 text-blue-800",
  approver: "bg-green-100 text-green-800",
  viewer: "bg-zinc-100 text-zinc-700",
};

const ROLES = [
  { value: "system_admin", label: "System Admin" },
  { value: "admin", label: "Admin" },
  { value: "project_manager", label: "Project Manager" },
  { value: "coordinator", label: "Mapping Coordinator" },
  { value: "mapper", label: "Mapper" },
  { value: "approver", label: "Approver" },
  { value: "viewer", label: "Viewer" },
];

export function AdminUsersClient() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);

  // Create user dialog
  const [dialogOpen, setDialogOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("mapper");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteDisplayName, setInviteDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState("mapper");
  const [inviteError, setInviteError] = useState("");
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  // Bulk upload dialog
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkSubmitting, setBulkSubmitting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ created: number; errors: { row: number; error: string }[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resend tracking
  const [resendingId, setResendingId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const res = await fetch("/api/admin/app-users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/app-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, displayName, email, password, role }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create user");
        return;
      }
      setDialogOpen(false);
      setUsername("");
      setDisplayName("");
      setEmail("");
      setPassword("");
      setRole("mapper");
      toast.success("User created successfully");
      fetchUsers();
    } catch {
      setError("An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSubmitting(true);
    try {
      const res = await fetch("/api/admin/users/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail,
          displayName: inviteDisplayName,
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setInviteError(data.error || "Failed to invite user");
        return;
      }
      setInviteOpen(false);
      setInviteEmail("");
      setInviteDisplayName("");
      setInviteRole("mapper");
      if (data.emailSent) {
        toast.success("Invite sent successfully");
      } else {
        toast.success("User created. Email delivery skipped (no RESEND_API_KEY).");
      }
      fetchUsers();
    } catch {
      setInviteError("An error occurred");
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleBulkUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setBulkSubmitting(true);
    setBulkResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/admin/users/bulk-invite", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok && !data.errors) {
        toast.error(data.error || "Bulk upload failed");
        return;
      }

      setBulkResult({ created: data.created ?? 0, errors: data.errors ?? [] });

      if (data.created > 0) {
        toast.success(`${data.created} user(s) invited successfully`);
        fetchUsers();
      }
      if (data.errors?.length > 0) {
        toast.error(`${data.errors.length} row(s) had errors`);
      }
    } catch {
      toast.error("An error occurred during bulk upload");
    } finally {
      setBulkSubmitting(false);
    }
  }

  async function resendInvite(appUserId: number) {
    setResendingId(appUserId);
    try {
      const res = await fetch("/api/admin/users/invite/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appUserId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to resend invite");
        return;
      }
      if (data.emailSent) {
        toast.success("Invite resent successfully");
      } else {
        toast.success("New invite token generated. Email skipped (no RESEND_API_KEY).");
      }
      fetchUsers();
    } catch {
      toast.error("An error occurred");
    } finally {
      setResendingId(null);
    }
  }

  function getInviteBadge(inviteStatus: string | null) {
    if (!inviteStatus) return null;
    switch (inviteStatus) {
      case "pending":
        return <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700 border-yellow-200">Invite Pending</Badge>;
      case "accepted":
        return <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Invite Accepted</Badge>;
      case "expired":
        return <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">Invite Expired</Badge>;
      case "no_invite":
        return <Badge variant="outline" className="text-xs bg-zinc-50 text-zinc-500 border-zinc-200">No Password</Badge>;
      default:
        return null;
    }
  }

  function canResendInvite(u: AppUser) {
    return u.inviteStatus === "pending" || u.inviteStatus === "expired" || u.inviteStatus === "no_invite";
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setBulkOpen(true)}>
          <Upload className="h-4 w-4 mr-2" /> Bulk Upload
        </Button>
        <Button variant="outline" onClick={() => setInviteOpen(true)}>
          <Mail className="h-4 w-4 mr-2" /> Invite User
        </Button>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add User
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Display Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invite</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell className="text-sm font-medium">{u.displayName}</TableCell>
                    <TableCell className="text-sm">{u.email ?? "---"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs ${roleColors[u.role] ?? ""}`}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isActive ? "outline" : "secondary"} className="text-xs">
                        {u.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getInviteBadge(u.inviteStatus)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {canResendInvite(u) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resendInvite(u.id)}
                          disabled={resendingId === u.id}
                          title="Resend invite"
                        >
                          {resendingId === u.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCw className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create User Dialog (existing flow with password) */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add App User</DialogTitle>
          </DialogHeader>
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Username</label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Email (optional)</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || !username || !displayName || !password}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite User Dialog (email-based, no password) */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite User</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Send an email invitation. The user will set their own password.
          </p>
          <form onSubmit={inviteUser} className="space-y-4">
            <div>
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="user@company.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={inviteDisplayName}
                onChange={(e) => setInviteDisplayName(e.target.value)}
                placeholder="Jane Smith"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteSubmitting || !inviteEmail || !inviteDisplayName}>
                {inviteSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={bulkOpen} onOpenChange={(open) => { setBulkOpen(open); if (!open) setBulkResult(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Invite Users</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Upload a CSV file with columns: <code className="text-xs bg-muted px-1 py-0.5 rounded">first_name, last_name, email, role</code>
          </p>
          <p className="text-xs text-muted-foreground">
            Maximum 100 users per upload. Valid roles: {ROLES.map(r => r.value).join(", ")}
          </p>
          <div className="space-y-4">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="mt-1"
            />
            {bulkResult && (
              <div className="space-y-2 text-sm">
                {bulkResult.created > 0 && (
                  <p className="text-emerald-600">{bulkResult.created} user(s) invited successfully.</p>
                )}
                {bulkResult.errors.length > 0 && (
                  <div>
                    <p className="text-destructive font-medium">{bulkResult.errors.length} error(s):</p>
                    <ul className="mt-1 space-y-1">
                      {bulkResult.errors.map((e, i) => (
                        <li key={i} className="text-xs text-destructive/80">
                          Row {e.row}: {e.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => { setBulkOpen(false); setBulkResult(null); }}>
                {bulkResult ? "Close" : "Cancel"}
              </Button>
              {!bulkResult && (
                <Button onClick={handleBulkUpload} disabled={bulkSubmitting}>
                  {bulkSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload & Invite"}
                </Button>
              )}
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
