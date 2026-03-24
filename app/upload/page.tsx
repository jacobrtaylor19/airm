import { db } from "@/db";
import * as schema from "@/db/schema";
import { count } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { UploadCard } from "@/components/upload/upload-card";
import { WorkflowStepper, type WorkflowStage } from "@/components/layout/workflow-stepper";
import { Upload, UserCircle, Route, ShieldAlert, CheckCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getCount(table: any) {
  return db.select({ count: count() }).from(table).get()!.count;
}

export default function DataUploadPage() {
  const counts = {
    users: getCount(schema.users),
    sourceRoles: getCount(schema.sourceRoles),
    roleAssignments: getCount(schema.userSourceRoleAssignments),
    rolePermissions: getCount(schema.sourceRolePermissions),
    targetRoles: getCount(schema.targetRoles),
    targetPermissions: getCount(schema.targetPermissions),
    sodRules: getCount(schema.sodRules),
    personas: getCount(schema.personas),
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

      <div>
        <p className="text-sm text-muted-foreground mb-4">
          Upload your data files to begin the role mapping process. Required files are marked with <span className="text-red-500">*</span>.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <UploadCard
          type="users"
          label="User List"
          description="Source system users with titles and departments"
          expectedColumns="source_user_id, display_name, email, job_title, department"
          required={true}
          existingCount={counts.users}
        />
        <UploadCard
          type="source-roles"
          label="Legacy Role Definitions"
          description="Legacy system roles (SAP AGRs, AD groups, etc.)"
          expectedColumns="role_id, role_name, description, system, domain"
          required={true}
          existingCount={counts.sourceRoles}
        />
        <UploadCard
          type="role-assignments"
          label="Legacy Role Assignments"
          description="Which users have which legacy roles"
          expectedColumns="user_id, role_id"
          required={false}
          existingCount={counts.roleAssignments}
        />
        <UploadCard
          type="role-permissions"
          label="Role-Permission Mapping"
          description="Maps roles to their individual permissions (T-codes, etc.)"
          expectedColumns="role_id, permission_id"
          required={false}
          existingCount={counts.rolePermissions}
        />
        <UploadCard
          type="target-roles"
          label="Target Role Library"
          description="Your target system's available roles"
          expectedColumns="role_id, role_name, description, system, domain"
          required={true}
          existingCount={counts.targetRoles}
        />
        <UploadCard
          type="target-permissions"
          label="Target Role Permissions"
          description="Permissions granted by each target role"
          expectedColumns="permission_id, permission_name, description, system, risk_level"
          required={false}
          existingCount={counts.targetPermissions}
        />
        <UploadCard
          type="sod-rules"
          label="SOD/GRC Ruleset"
          description="Conflicting permission pairs with severity levels"
          expectedColumns="rule_id, rule_name, permission_a, permission_b, severity"
          required={false}
          existingCount={counts.sodRules}
        />
        <UploadCard
          type="personas"
          label="Pre-defined Personas"
          description="Skip AI generation — use your own persona definitions"
          expectedColumns="name, description, business_function"
          required={false}
          existingCount={counts.personas}
        />
      </div>

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
    </div>
  );
}
