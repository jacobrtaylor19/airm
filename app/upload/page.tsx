import { db } from "@/db";
import * as schema from "@/db/schema";
import { count, ne, eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth";
import { getSourceSystemStats } from "@/lib/queries";

export const dynamic = "force-dynamic";
import { UploadCard } from "@/components/upload/upload-card";
import { UploadSection } from "@/components/upload/upload-section";
import { WorkflowStepper, type WorkflowStage } from "@/components/layout/workflow-stepper";
import { Upload, UserCircle, Route, ShieldAlert, CheckCircle, Database } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getCount(table: any) {
  return (await db.select({ count: count() }).from(table))[0]!.count;
}

export default async function DataUploadPage() {
  const user = await requireAuth();
  const isAdmin = user.role === "admin" || user.role === "system_admin";
  const sourceSystemStats = await getSourceSystemStats();
  const appUserCount = (await db.select({ count: count() }).from(schema.appUsers)
    .where(ne(schema.appUsers.role, "system_admin")))[0]!.count;

  const existingAccessCount = (await db.select({ count: count() }).from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.releasePhase, "existing")))[0]!.count;

  const counts = {
    orgUnits: await getCount(schema.orgUnits),
    releases: await getCount(schema.releases),
    releaseScope: await getCount(schema.releaseOrgUnits),
    users: await getCount(schema.users),
    sourceRoles: await getCount(schema.sourceRoles),
    roleAssignments: await getCount(schema.userSourceRoleAssignments),
    rolePermissions: await getCount(schema.sourceRolePermissions),
    targetRoles: await getCount(schema.targetRoles),
    targetPermissions: await getCount(schema.targetPermissions),
    sodRules: await getCount(schema.sodRules),
    personas: await getCount(schema.personas),
    appUsers: appUserCount,
    existingAccess: existingAccessCount,
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

      {/* Upload sections with completion badges */}
      <UploadSection
        title="Project Structure"
        uploaded={[counts.orgUnits, counts.releases, counts.releaseScope].filter(c => c > 0).length}
        total={3}
        isAdmin={isAdmin}
      >
        <UploadCard type="org-units" label="Org Units / Business Units" description="Organizational hierarchy (L1 division → L2 department → L3 team)." expectedColumns="name, level, parent_name, description" required={false} existingCount={counts.orgUnits} templateUrl="/templates/org-units-template.csv" isAdmin={isAdmin} />
        <UploadCard type="releases" label="Releases / Waves" description="Migration releases or project waves." expectedColumns="name, description, status, release_type, target_system, target_date, is_active" required={false} existingCount={counts.releases} templateUrl="/templates/releases-template.csv" isAdmin={isAdmin} />
        <UploadCard type="release-scope" label="Release Scope" description="Maps org units to releases." expectedColumns="release_name, org_unit_name" required={false} existingCount={counts.releaseScope} templateUrl="/templates/release-scope-template.csv" isAdmin={isAdmin} />
      </UploadSection>

      <UploadSection
        title="Source Data"
        uploaded={[counts.users, counts.sourceRoles, counts.roleAssignments, counts.rolePermissions].filter(c => c > 0).length}
        total={4}
        isAdmin={isAdmin}
      >
        <UploadCard type="users" label="User List" description="Source system users with titles and departments" expectedColumns="source_user_id, display_name, email, job_title, department" required={true} existingCount={counts.users} templateUrl="/templates/users-template.csv" isAdmin={isAdmin} />
        <UploadCard type="source-roles" label="Legacy Role Definitions" description="Source system roles. Include a 'system' column." expectedColumns="role_id, role_name, description, system, domain" required={true} existingCount={counts.sourceRoles} templateUrl="/templates/source-roles-template.csv" systemTag="Multi-System" isAdmin={isAdmin} />
        <UploadCard type="role-assignments" label="Legacy Role Assignments" description="Which users have which legacy roles" expectedColumns="user_id, role_id" required={false} existingCount={counts.roleAssignments} templateUrl="/templates/user-source-role-assignments-template.csv" systemTag="Multi-System" isAdmin={isAdmin} />
        <UploadCard type="role-permissions" label="Role-Permission Mapping" description="Maps roles to permissions (T-codes, etc.)" expectedColumns="role_id, permission_id" required={false} existingCount={counts.rolePermissions} templateUrl="/templates/source-role-permissions-template.csv" systemTag="Multi-System" isAdmin={isAdmin} />
      </UploadSection>

      <UploadSection
        title="Target Data"
        uploaded={[counts.targetRoles, counts.targetPermissions].filter(c => c > 0).length}
        total={2}
        isAdmin={isAdmin}
      >
        <UploadCard type="target-roles" label="Target Role Library" description="Your target system's available roles" expectedColumns="role_id, role_name, description, system, domain" required={true} existingCount={counts.targetRoles} templateUrl="/templates/target-roles-template.csv" isAdmin={isAdmin} />
        <UploadCard type="target-permissions" label="Target Role Permissions" description="Permissions granted by each target role" expectedColumns="permission_id, permission_name, description, system, risk_level" required={false} existingCount={counts.targetPermissions} templateUrl="/templates/target-permissions-template.csv" isAdmin={isAdmin} />
      </UploadSection>

      <UploadSection
        title="Compliance"
        uploaded={[counts.sodRules].filter(c => c > 0).length}
        total={1}
        isAdmin={isAdmin}
      >
        <UploadCard type="sod-rules" label="SOD/GRC Ruleset" description="Conflicting permission pairs with severity levels" expectedColumns="rule_id, rule_name, permission_a, permission_b, severity" required={false} existingCount={counts.sodRules} templateUrl="/templates/sod-rules-template.csv" isAdmin={isAdmin} />
      </UploadSection>

      <UploadSection
        title="Optional"
        uploaded={[counts.existingAccess, counts.personas, counts.appUsers].filter(c => c > 0).length}
        total={3}
        isAdmin={isAdmin}
        defaultOpen={false}
      >
        <UploadCard type="existing-access" label="Existing Production Access" description="Approved target role assignments from previous waves" expectedColumns="source_user_id, target_role_id, release_phase" required={false} existingCount={counts.existingAccess} templateUrl="/templates/existing-access-template.csv" isAdmin={isAdmin} />
        <UploadCard type="personas" label="Pre-defined Personas" description="Skip AI generation — use your own persona definitions" expectedColumns="name, description, business_function" required={false} existingCount={counts.personas} isAdmin={isAdmin} />
        <UploadCard type="app-users" label="Provisum Users" description="Upload platform users with org unit assignments" expectedColumns="username, password, display_name, role, email, org_unit_name" required={false} existingCount={counts.appUsers} templateUrl="/templates/app-users-template.csv" isAdmin={isAdmin} />
      </UploadSection>

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
