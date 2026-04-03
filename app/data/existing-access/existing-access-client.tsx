"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, ShieldCheck, Search, FileUp, Info } from "lucide-react";
import Link from "next/link";

interface UserExistingAccess {
  userId: number;
  displayName: string;
  sourceUserId: string;
  department: string | null;
  roles: { roleName: string; domain: string | null }[];
}

interface Props {
  data: UserExistingAccess[];
}

export function ExistingAccessClient({ data }: Props) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(
      (u) =>
        u.displayName.toLowerCase().includes(q) ||
        u.sourceUserId.toLowerCase().includes(q) ||
        (u.department ?? "").toLowerCase().includes(q) ||
        u.roles.some((r) => r.roleName.toLowerCase().includes(q))
    );
  }, [data, search]);

  const totalAssignments = data.reduce((sum, u) => sum + u.roles.length, 0);

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ShieldCheck className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-medium mb-2">
            No Existing Access Data Found
          </h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            There are no existing production access records yet. Upload user
            target role assignments with release phase &quot;existing&quot; and
            assignment type &quot;existing_access&quot; to populate this view.
          </p>
          <Link
            href="/data"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            <FileUp className="h-4 w-4" />
            Go to Data Explorer
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Callout: SOD conflicts involving existing access */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 flex items-start gap-2">
        <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          SOD conflicts that involve existing production access roles are flagged with an{" "}
          <span className="inline-flex items-center rounded-md border border-blue-200 bg-blue-100 px-1.5 py-0.5 text-xs font-medium text-blue-800">
            Existing Access
          </span>{" "}
          badge on the{" "}
          <Link href="/sod" className="font-medium underline hover:text-blue-900">
            SOD Analysis
          </Link>{" "}
          page.
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Users with Existing Access
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assignments
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignments}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, ID, department, or role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Existing Roles</TableHead>
                <TableHead className="text-right"># Roles</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    No users match your search.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((user) => (
                  <TableRow key={user.userId}>
                    <TableCell className="font-mono text-sm">
                      {user.sourceUserId}
                    </TableCell>
                    <TableCell className="font-medium">
                      {user.displayName}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.department ?? "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs"
                          >
                            {role.roleName}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {user.roles.length}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {filtered.length !== data.length && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {data.length} users
        </p>
      )}
    </div>
  );
}
