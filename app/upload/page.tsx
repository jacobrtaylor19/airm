import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { getSourceSystemStats } from "@/lib/queries";

export const dynamic = "force-dynamic";
import { UploadCard } from "@/components/upload/upload-card";
import { WorkflowStepper, type WorkflowStage } from "@/components/layout/workflow-stepper";
import { Upload, UserCircle, Route, ShieldAlert, CheckCircle, Database } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCount(table: any) {
  return db.select({ count: count() }).from(table).get()!.count;
}

export default function DataUploadPage() {
  const user = requireAuth();
  const isAdmin = user.role === "admin";
  const sourceSystemStats = getSourceSystemStats();
  const appUserCount = db.select({ count: count() }).from(schema.appUsers)
    .where(ne(schema.appUsers.role, "system_admin"))
    .get()!.count;

  const counts = {
    users: getCount(schema.users),
    sourceRoles: getCount(schema.sourceRoles),
    roleAssignments: getCount(schema.userSourceRoleAssignments),
    rolePermissions: getCount(schema.sourceRolePermissions),
    targetRoles: getCount(schema.targetRoles),
    targetPermissions: getCount(schema.targetPermissions),
    sodRules: getCount(schema.sodRules),
    personas: getCount(schema.personas),
    appUsers: appUserCount,
  };

  const requiredUploaded = [counts.users, counts.sourceRoles, counts.targetRoles].filter(
    (c) => c > 0
  ).length;

  const stages: WorkflowStage[] = [
    {
      label: "Upload",
      href: "/upload",
      icon: Upload,
      status: requiredUploaded >= 3 ? "complete" : "active",
      detail: `${requiredUploaded}/3 required`,
    },
    { label: "Personas", href: "/personas", icon: UserCircle, status: "not_started" },
    { label: "Mapping", href: "/mapping", icon: Route, status: "not_started" },
    { label: "SOD Analysis", href: "/sod", icon: ShieldAlert, status: "not_started" },
    { label: "Approval", href: "/approvals", icon: CheckCircle, status: "not_started" },
  ];

  return (
    <div className="space-y-6">
      <WorkflowStepper stages={stages} />

      {!isAdmin && (
        <Card className="border-yellow-200 bg-yellow-50/50">
          <CardContent className="flex items-center gap-3 py-3">
            <Eye className="h-4 w-4 text-yellow-600 shrink-0" />
            <p className="text-sm text-yellow-800">
              View only — data uploads are restricted to administrators.
            </p>
          </CardContent>
        </Card>
      )}

      <div>
        <p className="text-sm text-muted-foreground mb-4">
          {isAdmin
            ? <>Upload your data files to begin the role mapping process. Required files are marked with <span className="text-red-500">*</span>.</>
            : "Current data status across all upload categories."
          }
        </p>
      </div>

      <div className={`grid gap-4 md:grid-cols-2 ${!isAdmin ? "pointer-events-none opacity-75" : ""}`}>
        <UploadCard
          type="users"
          label="User List"
          description="Source system users with titles and departments"
          expectedColumns="source_user_id, display_name, email, job_title, department"
          required={true}
          existingCount={counts.users}
          templateUrl="/templates/users-template.csv"
        />
        <UploadCard
          type="source-roles"
          label="Legacy Role Definitions"
          description="Source system roles — upload multiple files for different systems (SAP ECC, JDE, Legacy HR, etc.). Include a 'system' column to identify each source."
          expectedColumns="role_id, role_name, description, system, domain"
          required={true}
          existingCount={counts.sourceRoles}
          templateUrl="/templates/source-roles-template.csv"
          systemTag="Multi-System"
        />
        <UploadCard
          type="role-assignments"
          label="Legacy Role Assignments"
          description="Which users have which legacy roles (across all source systems)"
          expectedColumns="user_id, role_id"
          required={false}
          existingCount={counts.roleAssignments}
          templateUrl="/templates/user-source-role-assignments-template.csv"
          systemTag="Multi-System"
        />
        <UploadCard
          type="role-permissions"
          label="Role-Permission Mapping"
          description="Maps roles to their individual permissions (T-codes, etc.) — system is derived from associated roles"
          expectedColumns="role_id, permission_id"
          required={false}
          existingCount={counts.rolePermissions}
          templateUrl="/templates/source-role-permissions-template.csv"
          systemTag="Multi-System"
        />
        <UploadCard
          type="target-roles"
          label="Target Role Library"
          description="Your target system's available roles"
          expectedColumns="role_id, role_name, description, system, domain"
          required={true}
          existingCount={counts.targetRoles}
          templateUrl="/templates/target-roles-template.csv"
        />
        <UploadCard
          type="target-permissions"
          label="Target Role Permissions"
          description="Permissions granted by each target role"
          expectedColumns="permission_id, permission_name, description, system, risk_level"
          required={false}
          existingCount={counts.targetPermissions}
          templateUrl="/templates/target-permissions-template.csv"
        />
        <UploadCard
          type="sod-rules"
          label="SOD/GRC Ruleset"
          description="Conflicting permission pairs with severity levels"
          expectedColumns="rule_id, rule_name, permission_a, permission_b, severity"
          required={false}
          existingCount={counts.sodRules}
          templateUrl="/templates/sod-rules-template.csv"
        />
        <UploadCard
          type="personas"
          label="Pre-defined Personas"
          description="Skip AI generation — use your own persona definitions"
          expectedColumns="name, description, business_function"
          required={false}
          existingCount={counts.personas}
        />
        <UploadCard
          type="app-users"
          label="Mappers & Approvers"
          description="Upload mapper, approver, admin, and viewer definitions with org unit assignments"
          expectedColumns="username, password, display_name, role, email, org_unit_name"
          required={false}
          existingCount={counts.appUsers}
          templateUrl="/templates/app-users-template.csv"
        />
      </div>

      {/* Source Systems Summary */}
      {sourceSystemStats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Source Systems Uploaded
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {sourceSystemStats.map((s) => (
                <div
                  key={s.system}
                  className="flex items-center gap-2 rounded-md border bg-background px-3 py-2"
                >
                  <Badge variant="secondary" className="text-xs font-medium">
                    {s.system}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {s.roleCount} role{s.roleCount !== 1 ? "s" : ""}
                    {s.userCount > 0 && <>, {s.userCount} user{s.userCount !== 1 ? "s" : ""}</>}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {isAdmin && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            Upload status: <strong>{requiredUploaded} of 3</strong> required files uploaded
          </p>
          <Link href="/personas">
            <Button disabled={requiredUploaded < 3}>
              Proceed to Persona Generation →
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
