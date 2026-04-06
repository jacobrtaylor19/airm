import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { parse } from "csv-parse/sync";
import { eq } from "drizzle-orm";
import { createAdminClient } from "@/lib/supabase/admin";
import { isUploadDisabled } from "@/lib/demo-mode";
import { getSessionUser } from "@/lib/auth";
import { getOrgId } from "@/lib/org-context";

export const dynamic = "force-dynamic";

type CsvRow = Record<string, string>;

function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function isDuplicateError(e: unknown): boolean {
  const msg = getErrorMessage(e);
  return msg.includes("UNIQUE") || msg.includes("unique") || msg.includes("duplicate");
}

type UploadType =
  | "users"
  | "source-roles"
  | "role-assignments"
  | "role-permissions"
  | "target-roles"
  | "target-permissions"
  | "sod-rules"
  | "personas"
  | "app-users"
  | "existing-access"
  | "org-units"
  | "releases"
  | "release-scope";

const REQUIRED_COLUMNS: Record<UploadType, string[]> = {
  users: ["source_user_id", "display_name"],
  "source-roles": ["role_id", "role_name"],
  "role-assignments": ["user_id", "role_id"],
  "role-permissions": ["role_id", "permission_id"],
  "target-roles": ["role_id", "role_name"],
  "target-permissions": ["permission_id", "permission_name"],
  "sod-rules": ["rule_id", "rule_name", "permission_a", "permission_b", "severity"],
  personas: ["name", "description", "business_function"],
  "app-users": ["username", "password", "display_name", "role"],
  "existing-access": ["source_user_id", "target_role_id"],
  "org-units": ["name", "level"],
  releases: ["name"],
  "release-scope": ["release_name", "org_unit_name"],
};

function validateColumns(headers: string[], required: string[]): string[] {
  const missing = required.filter((col) => !headers.includes(col));
  return missing;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { type: string } }
) {
  const user = await getSessionUser();
  if (!user || !["admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  if (isUploadDisabled()) {
    return NextResponse.json(
      { error: "Uploads are disabled in the demo environment" },
      { status: 403 }
    );
  }

  const uploadType = params.type as UploadType;

  if (!REQUIRED_COLUMNS[uploadType]) {
    return NextResponse.json(
      { error: `Unknown upload type: ${uploadType}` },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const action = formData.get("action") as string | null; // "preview" or "commit"

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const text = await file.text();
    const records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as CsvRow[];

    if (records.length === 0) {
      return NextResponse.json({ error: "CSV file is empty" }, { status: 400 });
    }

    // Validate columns
    const headers = Object.keys(records[0]);
    const missingCols = validateColumns(headers, REQUIRED_COLUMNS[uploadType]);
    if (missingCols.length > 0) {
      return NextResponse.json(
        {
          error: `Missing required columns: ${missingCols.join(", ")}`,
          headers,
          required: REQUIRED_COLUMNS[uploadType],
        },
        { status: 400 }
      );
    }

    // Validate picklist values and generate warnings (static + dynamic from DB)
    const warnings: string[] = [];

    // Static picklists
    const STATIC_PICKLISTS: Partial<Record<UploadType, Record<string, string[]>>> = {
      "app-users": { role: ["system_admin", "admin", "coordinator", "mapper", "approver", "viewer", "project_manager"] },
      "sod-rules": {
        severity: ["critical", "high", "medium", "low"],
        conflict_type: ["cross_role", "within_role"],
      },
      "source-roles": { role_type: ["business", "technical", "composite"] },
      "target-roles": { role_type: ["single", "composite", "master"] },
      "org-units": { level: ["L1", "L2", "L3"] },
      releases: { status: ["planning", "active", "completed", "paused"] },
      users: { user_type: ["standard", "service", "admin"] },
    };

    // Dynamic picklists from existing DB data
    const DYNAMIC_PICKLISTS: Partial<Record<UploadType, Record<string, () => Promise<string[]>>>> = {
      users: {
        department: async () => {
          const orgUnits = await db.select({ name: schema.orgUnits.name }).from(schema.orgUnits);
          return orgUnits.map(o => o.name.toLowerCase());
        },
      },
      "role-assignments": {
        role_id: async () => {
          const roles = await db.select({ roleId: schema.sourceRoles.roleId }).from(schema.sourceRoles);
          return roles.map(r => r.roleId.toLowerCase());
        },
        user_id: async () => {
          const users = await db.select({ sourceUserId: schema.users.sourceUserId }).from(schema.users);
          return users.map(u => u.sourceUserId.toLowerCase());
        },
      },
      "role-permissions": {
        role_id: async () => {
          const roles = await db.select({ roleId: schema.sourceRoles.roleId }).from(schema.sourceRoles);
          return roles.map(r => r.roleId.toLowerCase());
        },
      },
      "app-users": {
        org_unit_name: async () => {
          const orgUnits = await db.select({ name: schema.orgUnits.name }).from(schema.orgUnits);
          return orgUnits.map(o => o.name.toLowerCase());
        },
      },
      "release-scope": {
        release_name: async () => {
          const releases = await db.select({ name: schema.releases.name }).from(schema.releases);
          return releases.map(r => r.name.toLowerCase());
        },
        org_unit_name: async () => {
          const orgUnits = await db.select({ name: schema.orgUnits.name }).from(schema.orgUnits);
          return orgUnits.map(o => o.name.toLowerCase());
        },
      },
    };

    // Run static validations
    const staticValidations = STATIC_PICKLISTS[uploadType];
    if (staticValidations) {
      for (const [field, allowed] of Object.entries(staticValidations)) {
        const invalidRows = records
          .map((r, i) => ({ row: i + 2, value: r[field] }))
          .filter((r) => r.value && !allowed.includes(r.value.toLowerCase()));
        if (invalidRows.length > 0) {
          const sample = invalidRows.slice(0, 3).map((r) => `row ${r.row}: "${r.value}"`).join(", ");
          warnings.push(`${field}: invalid values (${sample}). Expected: ${allowed.join(", ")}`);
        }
      }
    }

    // Run dynamic validations (only warn, don't block — new values may be intentional)
    const dynamicValidations = DYNAMIC_PICKLISTS[uploadType];
    if (dynamicValidations) {
      for (const [field, getAllowed] of Object.entries(dynamicValidations)) {
        if (!headers.includes(field)) continue;
        try {
          const allowed = await getAllowed();
          if (allowed.length === 0) continue; // No existing data to validate against
          const invalidRows = records
            .map((r, i) => ({ row: i + 2, value: r[field] }))
            .filter((r) => r.value && !allowed.includes(r.value.toLowerCase()));
          if (invalidRows.length > 0) {
            const sample = invalidRows.slice(0, 3).map((r) => `row ${r.row}: "${r.value}"`).join(", ");
            warnings.push(`${field}: ${invalidRows.length} value(s) not found in existing data (${sample}). These will be created as new entries.`);
          }
        } catch {
          // Dynamic validation failure is non-fatal
        }
      }
    }

    // Preview mode: return first 5 rows + summary
    if (action !== "commit") {
      return NextResponse.json({
        status: "preview",
        totalRows: records.length,
        headers,
        preview: records.slice(0, 5),
        uploadType,
        warnings,
      });
    }

    // Commit mode: insert into DB
    const orgId = getOrgId(user);
    const result = await commitUpload(uploadType, records, orgId);

    return NextResponse.json({
      status: "committed",
      ...result,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) || "Upload failed" },
      { status: 500 }
    );
  }
}

async function commitUpload(
  type: UploadType,
  records: CsvRow[],
  orgId: number
) {
  // Types that clear-and-replace need a transaction to prevent data loss on partial failure
  const destructiveTypes: UploadType[] = [
    "users", "source-roles", "role-assignments", "role-permissions",
    "target-roles", "target-permissions", "sod-rules", "personas",
  ];
  const useTransaction = destructiveTypes.includes(type);

  if (useTransaction) {
    return db.transaction(async (tx) => commitUploadInner(tx, type, records, orgId));
  }
  return commitUploadInner(db, type, records, orgId);
}

async function commitUploadInner(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0] | typeof db,
  type: UploadType,
  records: CsvRow[],
  orgId: number
) {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  switch (type) {
    case "users": {
      // Clear existing and insert (wrapped in transaction)
      await tx.delete(schema.users);
      for (const row of records) {
        try {
          // Resolve orgUnitId by name if org units have been loaded
          let orgUnitId: number | null = null;
          const orgUnitName = (row.org_unit || row.org_unit_name)?.trim();
          if (orgUnitName) {
            const [ou] = await tx.select({ id: schema.orgUnits.id })
              .from(schema.orgUnits)
              .where(eq(schema.orgUnits.name, orgUnitName))
              .limit(1);
            orgUnitId = ou?.id ?? null;
          }
          await tx.insert(schema.users)
            .values({
              organizationId: orgId,
              sourceUserId: row.source_user_id,
              displayName: row.display_name,
              email: row.email || null,
              jobTitle: row.job_title || null,
              department: row.department || null,
              orgUnit: orgUnitName || null,
              orgUnitId,
              costCenter: row.cost_center || null,
            });
          inserted++;
        } catch (e: unknown) {
          if (isDuplicateError(e)) {
            skipped++;
          } else {
            errors.push(`Row ${inserted + skipped + 1}: ${getErrorMessage(e)}`);
          }
        }
      }
      break;
    }

    case "source-roles": {
      await tx.delete(schema.sourceRoles);
      for (const row of records) {
        try {
          await tx.insert(schema.sourceRoles)
            .values({
              organizationId: orgId,
              roleId: row.role_id,
              roleName: row.role_name,
              description: row.description || null,
              system: row.system || "SAP ECC",
              domain: row.domain || null,
              roleType: row.role_type || null,
              roleOwner: row.role_owner || null,
            });
          inserted++;
        } catch (e: unknown) {
          if (isDuplicateError(e)) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${getErrorMessage(e)}`);
        }
      }
      break;
    }

    case "role-assignments": {
      await tx.delete(schema.userSourceRoleAssignments);
      for (const row of records) {
        const [user] = await tx
          .select()
          .from(schema.users)
          .where(eq(schema.users.sourceUserId, row.user_id))
          .limit(1);
        const [role] = await tx
          .select()
          .from(schema.sourceRoles)
          .where(eq(schema.sourceRoles.roleId, row.role_id))
          .limit(1);
        if (user && role) {
          await tx.insert(schema.userSourceRoleAssignments)
            .values({
              userId: user.id,
              sourceRoleId: role.id,
              assignedDate: row.assigned_date || null,
            });
          inserted++;
        } else {
          skipped++;
          if (!user) errors.push(`Row ${inserted + skipped}: user_id "${row.user_id}" not found`);
          if (!role) errors.push(`Row ${inserted + skipped}: role_id "${row.role_id}" not found`);
        }
      }
      break;
    }

    case "role-permissions": {
      await tx.delete(schema.sourceRolePermissions);
      // Also ensure source permissions exist
      for (const row of records) {
        // Auto-create permission if missing
        let [perm] = await tx
          .select()
          .from(schema.sourcePermissions)
          .where(eq(schema.sourcePermissions.permissionId, row.permission_id))
          .limit(1);
        if (!perm) {
          // Derive system from the associated source role, or use CSV value, or default
          const [assocRole] = await tx
            .select({ system: schema.sourceRoles.system })
            .from(schema.sourceRoles)
            .where(eq(schema.sourceRoles.roleId, row.role_id))
            .limit(1);
          await tx.insert(schema.sourcePermissions)
            .values({
              permissionId: row.permission_id,
              permissionName: row.permission_name || null,
              system: row.system || assocRole?.system || "SAP ECC",
            });
          [perm] = await tx
            .select()
            .from(schema.sourcePermissions)
            .where(eq(schema.sourcePermissions.permissionId, row.permission_id))
            .limit(1);
        }

        const [role] = await tx
          .select()
          .from(schema.sourceRoles)
          .where(eq(schema.sourceRoles.roleId, row.role_id))
          .limit(1);

        if (role && perm) {
          await tx.insert(schema.sourceRolePermissions)
            .values({
              sourceRoleId: role.id,
              sourcePermissionId: perm.id,
            });
          inserted++;
        } else {
          skipped++;
        }
      }
      break;
    }

    case "target-roles": {
      await tx.delete(schema.targetRoles);
      for (const row of records) {
        try {
          await tx.insert(schema.targetRoles)
            .values({
              organizationId: orgId,
              roleId: row.role_id,
              roleName: row.role_name,
              description: row.description || null,
              system: row.system || "S/4HANA",
              domain: row.domain || null,
              roleOwner: row.role_owner || null,
            });
          inserted++;
        } catch (e: unknown) {
          if (isDuplicateError(e)) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${getErrorMessage(e)}`);
        }
      }
      break;
    }

    case "target-permissions": {
      await tx.delete(schema.targetPermissions);
      for (const row of records) {
        try {
          await tx.insert(schema.targetPermissions)
            .values({
              permissionId: row.permission_id,
              permissionName: row.permission_name || null,
              description: row.description || null,
              system: row.system || "S/4HANA",
              permissionType: row.permission_type || null,
              riskLevel: row.risk_level || null,
            });
          inserted++;
        } catch (e: unknown) {
          if (isDuplicateError(e)) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${getErrorMessage(e)}`);
        }
      }
      break;
    }

    case "sod-rules": {
      await tx.delete(schema.sodRules);
      for (const row of records) {
        try {
          await tx.insert(schema.sodRules)
            .values({
              organizationId: orgId,
              ruleId: row.rule_id,
              ruleName: row.rule_name,
              description: row.description || null,
              permissionA: row.permission_a,
              permissionB: row.permission_b,
              severity: row.severity || "medium",
              riskDescription: row.risk_description || null,
            });
          inserted++;
        } catch (e: unknown) {
          if (isDuplicateError(e)) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${getErrorMessage(e)}`);
        }
      }
      break;
    }

    case "personas": {
      await tx.delete(schema.personas);
      for (const row of records) {
        try {
          await tx.insert(schema.personas)
            .values({
              organizationId: orgId,
              name: row.name,
              description: row.description || null,
              businessFunction: row.business_function || null,
              source: "manual_upload",
            });
          inserted++;
        } catch (e: unknown) {
          if (isDuplicateError(e)) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${getErrorMessage(e)}`);
        }
      }
      break;
    }

    case "existing-access": {
      // Upload existing production access (from previous waves/releases)
      // Does NOT clear existing — appends with releasePhase="existing"
      for (const row of records) {
        const [user] = await tx
          .select()
          .from(schema.users)
          .where(eq(schema.users.sourceUserId, row.source_user_id))
          .limit(1);
        const [role] = await tx
          .select()
          .from(schema.targetRoles)
          .where(eq(schema.targetRoles.roleId, row.target_role_id))
          .limit(1);
        if (user && role) {
          try {
            await tx.insert(schema.userTargetRoleAssignments)
              .values({
                userId: user.id,
                targetRoleId: role.id,
                assignmentType: "existing_access",
                status: "approved",
                releasePhase: "existing",
              });
            inserted++;
          } catch (e: unknown) {
            errors.push(`Row ${inserted + skipped + 1}: ${getErrorMessage(e)}`);
            skipped++;
          }
        } else {
          skipped++;
          if (!user) errors.push(`Row ${inserted + skipped}: source_user_id "${row.source_user_id}" not found`);
          if (!role) errors.push(`Row ${inserted + skipped}: target_role_id "${row.target_role_id}" not found`);
        }
      }
      break;
    }

    case "org-units": {
      // Two-pass: insert L1 first, then L2, then L3, resolving parent_name → parent_id
      const levels = ["L1", "L2", "L3"];
      for (const level of levels) {
        for (const row of records) {
          if (row.level?.toUpperCase() !== level) continue;
          try {
            let parentId: number | null = null;
            if (row.parent_name?.trim()) {
              const [parent] = await tx
                .select({ id: schema.orgUnits.id })
                .from(schema.orgUnits)
                .where(eq(schema.orgUnits.name, row.parent_name.trim()))
                .limit(1);
              parentId = parent?.id ?? null;
            }
            // Upsert by name: skip if already exists
            const [existing] = await tx
              .select({ id: schema.orgUnits.id })
              .from(schema.orgUnits)
              .where(eq(schema.orgUnits.name, row.name.trim()))
              .limit(1);
            if (!existing) {
              await tx.insert(schema.orgUnits)
                .values({
                  organizationId: orgId,
                  name: row.name.trim(),
                  level: level,
                  parentId,
                  description: row.description || null,
                });
              inserted++;
            } else {
              skipped++;
            }
          } catch (e: unknown) {
            errors.push(`Row (${row.name}): ${getErrorMessage(e)}`);
          }
        }
      }
      break;
    }

    case "releases": {
      for (const row of records) {
        try {
          const name = row.name?.trim();
          if (!name) { skipped++; continue; }
          const [existing] = await tx
            .select({ id: schema.releases.id })
            .from(schema.releases)
            .where(eq(schema.releases.name, name))
            .limit(1);
          if (existing) { skipped++; continue; }
          const isActive = row.is_active?.toLowerCase() === "true";
          // If this release is active, deactivate all others first
          if (isActive) {
            await tx.update(schema.releases).set({ isActive: false });
          }
          await tx.insert(schema.releases)
            .values({
              organizationId: orgId,
              name,
              description: row.description || null,
              status: row.status || "planning",
              releaseType: row.release_type || "initial",
              targetSystem: row.target_system || null,
              targetDate: row.target_date || null,
              isActive,
              createdBy: "data_upload",
            });
          inserted++;
        } catch (e: unknown) {
          errors.push(`Row (${row.name}): ${getErrorMessage(e)}`);
        }
      }
      break;
    }

    case "release-scope": {
      // Links org units to releases — appends, does not clear existing
      for (const row of records) {
        try {
          const [release] = await tx
            .select({ id: schema.releases.id })
            .from(schema.releases)
            .where(eq(schema.releases.name, row.release_name?.trim()))
            .limit(1);
          const [orgUnit] = await tx
            .select({ id: schema.orgUnits.id })
            .from(schema.orgUnits)
            .where(eq(schema.orgUnits.name, row.org_unit_name?.trim()))
            .limit(1);
          if (!release) {
            errors.push(`release_name "${row.release_name}" not found — upload releases first`);
            skipped++;
            continue;
          }
          if (!orgUnit) {
            errors.push(`org_unit_name "${row.org_unit_name}" not found — upload org units first`);
            skipped++;
            continue;
          }
          // Skip if already linked
          const existingLinks = await tx
            .select()
            .from(schema.releaseOrgUnits)
            .where(eq(schema.releaseOrgUnits.releaseId, release.id));
          const exists = existingLinks.find((r) => r.orgUnitId === orgUnit.id);
          if (exists) { skipped++; continue; }
          await tx.insert(schema.releaseOrgUnits)
            .values({ releaseId: release.id, orgUnitId: orgUnit.id, addedBy: "data_upload" });
          inserted++;
        } catch (e: unknown) {
          errors.push(`Row (${row.release_name} / ${row.org_unit_name}): ${getErrorMessage(e)}`);
        }
      }
      break;
    }

    case "app-users": {
      for (const row of records) {
        try {
          const validRoles = ["mapper", "approver", "admin", "viewer", "system_admin"];
          const role = row.role?.toLowerCase().trim();
          if (!validRoles.includes(role)) {
            errors.push(`Row ${inserted + skipped + 1}: invalid role "${row.role}" — must be one of ${validRoles.join(", ")}`);
            skipped++;
            continue;
          }

          // Check if username already exists
          const [existing] = await tx.select().from(schema.appUsers)
            .where(eq(schema.appUsers.username, row.username.trim()))
            .limit(1);
          if (existing) {
            skipped++;
            continue;
          }

          // Resolve org unit by name
          let assignedOrgUnitId: number | null = null;
          if (row.org_unit_name?.trim()) {
            const [orgUnit] = await tx.select().from(schema.orgUnits)
              .where(eq(schema.orgUnits.name, row.org_unit_name.trim()))
              .limit(1);
            if (orgUnit) {
              assignedOrgUnitId = orgUnit.id;
            } else {
              errors.push(`Row ${inserted + skipped + 1}: org_unit_name "${row.org_unit_name}" not found`);
            }
          }

          // Create Supabase Auth user
          const supabaseAdmin = createAdminClient();
          const authEmail = row.email?.trim() || `${row.username.trim()}@provisum.demo`;
          const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: authEmail,
            password: row.password,
            email_confirm: true,
          });

          if (authError || !authData.user) {
            errors.push(`Row ${inserted + skipped + 1}: Failed to create auth user: ${authError?.message || "Unknown"}`);
            skipped++;
            continue;
          }

          await tx.insert(schema.appUsers).values({
            organizationId: orgId,
            username: row.username.trim(),
            displayName: row.display_name.trim(),
            email: authEmail,
            passwordHash: "",
            role,
            assignedOrgUnitId,
            supabaseAuthId: authData.user.id,
          });
          inserted++;
        } catch (e: unknown) {
          if (isDuplicateError(e)) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${getErrorMessage(e)}`);
        }
      }
      break;
    }
  }

  // Auto-associate uploaded data with the active release
  const [activeRelease] = await tx.select().from(schema.releases)
    .where(eq(schema.releases.isActive, true)).limit(1);

  if (activeRelease && inserted > 0) {
    try {
      if (type === "users") {
        const allUserIds = await tx.select({ id: schema.users.id }).from(schema.users);
        const linkedRows = await tx.select({ uid: schema.releaseUsers.userId }).from(schema.releaseUsers)
          .where(eq(schema.releaseUsers.releaseId, activeRelease.id));
        const linkedIds = new Set(linkedRows.map(r => r.uid));
        for (const u of allUserIds) {
          if (!linkedIds.has(u.id)) {
            await tx.insert(schema.releaseUsers).values({ releaseId: activeRelease.id, userId: u.id });
          }
        }
      } else if (type === "source-roles") {
        const allRoleIds = await tx.select({ id: schema.sourceRoles.id }).from(schema.sourceRoles);
        const linkedRows = await tx.select({ rid: schema.releaseSourceRoles.sourceRoleId }).from(schema.releaseSourceRoles)
          .where(eq(schema.releaseSourceRoles.releaseId, activeRelease.id));
        const linkedIds = new Set(linkedRows.map(r => r.rid));
        for (const r of allRoleIds) {
          if (!linkedIds.has(r.id)) {
            await tx.insert(schema.releaseSourceRoles).values({ releaseId: activeRelease.id, sourceRoleId: r.id });
          }
        }
      } else if (type === "target-roles") {
        const allRoleIds = await tx.select({ id: schema.targetRoles.id }).from(schema.targetRoles);
        const linkedRows = await tx.select({ rid: schema.releaseTargetRoles.targetRoleId }).from(schema.releaseTargetRoles)
          .where(eq(schema.releaseTargetRoles.releaseId, activeRelease.id));
        const linkedIds = new Set(linkedRows.map(r => r.rid));
        for (const r of allRoleIds) {
          if (!linkedIds.has(r.id)) {
            await tx.insert(schema.releaseTargetRoles).values({ releaseId: activeRelease.id, targetRoleId: r.id });
          }
        }
      } else if (type === "sod-rules") {
        const allRuleIds = await tx.select({ id: schema.sodRules.id }).from(schema.sodRules);
        const linkedRows = await tx.select({ rid: schema.releaseSodRules.sodRuleId }).from(schema.releaseSodRules)
          .where(eq(schema.releaseSodRules.releaseId, activeRelease.id));
        const linkedIds = new Set(linkedRows.map(r => r.rid));
        for (const r of allRuleIds) {
          if (!linkedIds.has(r.id)) {
            await tx.insert(schema.releaseSodRules).values({ releaseId: activeRelease.id, sodRuleId: r.id });
          }
        }
      }
    } catch {
      // Non-fatal: release association failure shouldn't block the upload
    }
  }

  return {
    inserted,
    skipped,
    errors: errors.slice(0, 10), // Cap error list
    totalRows: records.length,
  };
}
