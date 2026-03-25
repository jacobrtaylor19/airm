"use client";

import { useState, useTransition } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfidenceBadge } from "@/components/shared/confidence-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Target, Save, X, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  updatePersona,
  updatePersonaUsers,
  updatePersonaTargetRoles,
} from "@/lib/actions/persona-actions";
import type { PersonaDetail } from "@/lib/queries";
import type { SimpleUser, SimpleTargetRole } from "@/lib/queries";

interface Props {
  persona: PersonaDetail;
  allUsers: SimpleUser[];
  allTargetRoles: SimpleTargetRole[];
}

export function PersonaDetailClient({ persona, allUsers, allTargetRoles }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editMode, setEditMode] = useState(false);
  const [editUsers, setEditUsers] = useState(false);
  const [editTargetRoles, setEditTargetRoles] = useState(false);

  // Editable fields
  const [name, setName] = useState(persona.name);
  const [businessFunction, setBusinessFunction] = useState(persona.businessFunction ?? "");
  const [description, setDescription] = useState(persona.description ?? "");

  // User assignments
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>(
    persona.users.map((u) => u.id)
  );
  const [userSearch, setUserSearch] = useState("");

  // Target role assignments
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>(
    persona.targetRoleMappings.map((m) => m.targetRoleId)
  );
  const [roleSearch, setRoleSearch] = useState("");

  function handleCancel() {
    setName(persona.name);
    setBusinessFunction(persona.businessFunction ?? "");
    setDescription(persona.description ?? "");
    setEditMode(false);
  }

  function handleSave() {
    startTransition(async () => {
      await updatePersona(persona.id, { name, businessFunction, description });
      setEditMode(false);
      router.refresh();
    });
  }

  function handleCancelUsers() {
    setSelectedUserIds(persona.users.map((u) => u.id));
    setEditUsers(false);
    setUserSearch("");
  }

  function handleSaveUsers() {
    startTransition(async () => {
      await updatePersonaUsers(persona.id, selectedUserIds);
      setEditUsers(false);
      setUserSearch("");
      router.refresh();
    });
  }

  function handleCancelTargetRoles() {
    setSelectedRoleIds(persona.targetRoleMappings.map((m) => m.targetRoleId));
    setEditTargetRoles(false);
    setRoleSearch("");
  }

  function handleSaveTargetRoles() {
    startTransition(async () => {
      await updatePersonaTargetRoles(persona.id, selectedRoleIds);
      setEditTargetRoles(false);
      setRoleSearch("");
      router.refresh();
    });
  }

  function toggleUser(userId: number) {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function toggleRole(roleId: number) {
    setSelectedRoleIds((prev) =>
      prev.includes(roleId) ? prev.filter((id) => id !== roleId) : [...prev, roleId]
    );
  }

  const filteredUsers = allUsers.filter(
    (u) =>
      u.displayName.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.department ?? "").toLowerCase().includes(userSearch.toLowerCase())
  );

  const filteredRoles = allTargetRoles.filter(
    (r) =>
      r.roleName.toLowerCase().includes(roleSearch.toLowerCase()) ||
      r.roleId.toLowerCase().includes(roleSearch.toLowerCase()) ||
      (r.domain ?? "").toLowerCase().includes(roleSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/personas" className="text-sm text-muted-foreground hover:text-foreground">
            &larr; Back to Personas
          </Link>
          {editMode ? (
            <div className="mt-2 space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-semibold h-auto py-1"
                placeholder="Persona name"
              />
              <Input
                value={businessFunction}
                onChange={(e) => setBusinessFunction(e.target.value)}
                className="text-sm h-auto py-1"
                placeholder="Business function"
              />
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold mt-2">{persona.name}</h2>
              <p className="text-sm text-muted-foreground">
                {persona.businessFunction ?? "No function"} &middot;{" "}
                {persona.groupName ?? "No group"} &middot;
                <Badge variant="outline" className="text-xs ml-1">
                  {persona.source === "ai"
                    ? "AI Generated"
                    : persona.source === "manual_upload"
                    ? "Uploaded"
                    : "Manual"}
                </Badge>
              </p>
            </>
          )}
        </div>
        {editMode ? (
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} disabled={isPending}>
              <X className="h-3.5 w-3.5 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              <Save className="h-3.5 w-3.5 mr-1" /> Save
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={() => setEditMode(true)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
        )}
      </div>

      {/* Description */}
      {editMode ? (
        <Card>
          <CardContent className="pt-4">
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Persona description"
              rows={3}
            />
          </CardContent>
        </Card>
      ) : (
        persona.description && (
          <Card>
            <CardContent className="pt-4">
              <p className="text-sm">{persona.description}</p>
            </CardContent>
          </Card>
        )
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Characteristic Permissions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Characteristic Permissions ({persona.sourcePermissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {persona.sourcePermissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permission</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {persona.sourcePermissions.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">{p.permissionId}</TableCell>
                      <TableCell className="text-sm">{p.permissionName ?? "\u2014"}</TableCell>
                      <TableCell className="text-right text-sm">
                        {p.isRequired && (
                          <Badge className="text-xs mr-1 bg-blue-100 text-blue-700 hover:bg-blue-100">
                            Required
                          </Badge>
                        )}
                        {p.weight?.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No characteristic permissions defined yet.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assigned Users */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                Assigned Users ({editUsers ? selectedUserIds.length : persona.users.length})
              </CardTitle>
              {editUsers ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCancelUsers} disabled={isPending}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleSaveUsers} disabled={isPending}>
                    <Check className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditUsers(true)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {editUsers ? (
              <div className="space-y-2">
                <Input
                  placeholder="Search users..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-8 text-sm"
                />
                <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                  {filteredUsers.slice(0, 100).map((u) => (
                    <label
                      key={u.id}
                      className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="rounded"
                      />
                      <span>{u.displayName}</span>
                      {u.department && (
                        <span className="text-xs text-muted-foreground ml-auto">{u.department}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            ) : persona.users.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Confidence</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {persona.users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <Link href={`/users/${u.id}`} className="text-sm text-primary hover:underline">
                          {u.displayName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{u.department ?? "\u2014"}</TableCell>
                      <TableCell>
                        <ConfidenceBadge score={u.confidenceScore} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No users assigned to this persona.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Target Role Mappings */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4" /> Target Role Mappings (
              {editTargetRoles ? selectedRoleIds.length : persona.targetRoleMappings.length})
            </CardTitle>
            {editTargetRoles ? (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={handleCancelTargetRoles} disabled={isPending}>
                  <X className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSaveTargetRoles} disabled={isPending}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setEditTargetRoles(true)}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {editTargetRoles ? (
            <div className="space-y-2">
              <Input
                placeholder="Search target roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
                className="h-8 text-sm"
              />
              <div className="max-h-64 overflow-y-auto border rounded-md divide-y">
                {filteredRoles.slice(0, 100).map((r) => (
                  <label
                    key={r.id}
                    className="flex items-center gap-2 px-3 py-1.5 hover:bg-muted/50 cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRoleIds.includes(r.id)}
                      onChange={() => toggleRole(r.id)}
                      className="rounded"
                    />
                    <span className="font-mono text-xs">{r.roleId}</span>
                    <span>{r.roleName}</span>
                    {r.domain && (
                      <span className="text-xs text-muted-foreground ml-auto">{r.domain}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ) : persona.targetRoleMappings.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role ID</TableHead>
                  <TableHead>Role Name</TableHead>
                  <TableHead>Coverage</TableHead>
                  <TableHead>Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {persona.targetRoleMappings.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono text-xs">{m.roleId}</TableCell>
                    <TableCell className="text-sm font-medium">{m.roleName}</TableCell>
                    <TableCell className="text-sm">
                      {m.coveragePercent != null ? `${Math.round(m.coveragePercent)}%` : "\u2014"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {m.confidence ?? "\u2014"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Not yet mapped. Run target role mapping from the{" "}
              <Link href="/jobs" className="text-primary hover:underline">
                Jobs
              </Link>{" "}
              page.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
