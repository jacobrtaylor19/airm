/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { parse } from "csv-parse/sync";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

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
    }) as Record<string, string>[];

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
      "app-users": { role: ["admin", "mapper", "approver", "coordinator", "viewer"] },
      "sod-rules": { severity: ["critical", "high", "medium", "low"] },
      "org-units": { level: ["L1", "L2", "L3"] },
      releases: { status: ["planning", "active", "completed", "paused"] },
    };

    // Dynamic picklists from existing DB data
    const DYNAMIC_PICKLISTS: Partial<Record<UploadType, Record<string, () => string[]>>> = {
      users: {
        department: () => {
          const orgUnits = db.select({ name: schema.orgUnits.name }).from(schema.orgUnits).all();
          return orgUnits.map(o => o.name.toLowerCase());
        },
      },
      "role-assignments": {
        role_id: () => {
          const roles = db.select({ roleId: schema.sourceRoles.roleId }).from(schema.sourceRoles).all();
          return roles.map(r => r.roleId.toLowerCase());
        },
        user_id: () => {
          const users = db.select({ sourceUserId: schema.users.sourceUserId }).from(schema.users).all();
          return users.map(u => u.sourceUserId.toLowerCase());
        },
      },
      "role-permissions": {
        role_id: () => {
          const roles = db.select({ roleId: schema.sourceRoles.roleId }).from(schema.sourceRoles).all();
          return roles.map(r => r.roleId.toLowerCase());
        },
      },
      "app-users": {
        org_unit_name: () => {
          const orgUnits = db.select({ name: schema.orgUnits.name }).from(schema.orgUnits).all();
          return orgUnits.map(o => o.name.toLowerCase());
        },
      },
      "release-scope": {
        release_name: () => {
          const releases = db.select({ name: schema.releases.name }).from(schema.releases).all();
          return releases.map(r => r.name.toLowerCase());
        },
        org_unit_name: () => {
          const orgUnits = db.select({ name: schema.orgUnits.name }).from(schema.orgUnits).all();
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
          const allowed = getAllowed();
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
    const result = await commitUpload(uploadType, records);

    return NextResponse.json({
      status: "committed",
      ...result,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Upload failed" },
      { status: 500 }
    );
  }
}

async function commitUpload(
  type: UploadType,
  records: Record<string, string>[]
) {
  let inserted = 0;
  let skipped = 0;
  const errors: string[] = [];

  switch (type) {
    case "users": {
      // Clear existing and insert
      db.delete(schema.users).run();
      for (const row of records) {
        try {
          // Resolve orgUnitId by name if org units have been loaded
          let orgUnitId: number | null = null;
          const orgUnitName = (row.org_unit || row.org_unit_name)?.trim();
          if (orgUnitName) {
            const ou = db.select({ id: schema.orgUnits.id })
              .from(schema.orgUnits)
              .where(eq(schema.orgUnits.name, orgUnitName))
              .get();
            orgUnitId = ou?.id ?? null;
          }
          db.insert(schema.users)
            .values({
              sourceUserId: row.source_user_id,
              displayName: row.display_name,
              email: row.email || null,
              jobTitle: row.job_title || null,
              department: row.department || null,
              orgUnit: orgUnitName || null,
              orgUnitId,
              costCenter: row.cost_center || null,
            })
            .run();
          inserted++;
        } catch (e: any) {
          if (e.message?.includes("UNIQUE")) {
            skipped++;
          } else {
            errors.push(`Row ${inserted + skipped + 1}: ${e.message}`);
          }
        }
      }
      break;
    }

    case "source-roles": {
      db.delete(schema.sourceRoles).run();
      for (const row of records) {
        try {
          db.insert(schema.sourceRoles)
            .values({
              roleId: row.role_id,
              roleName: row.role_name,
              description: row.description || null,
              system: row.system || "SAP ECC",
              domain: row.domain || null,
              roleType: row.role_type || null,
              roleOwner: row.role_owner || null,
            })
            .run();
          inserted++;
        } catch (e: any) {
          if (e.message?.includes("UNIQUE")) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${e.message}`);
        }
      }
      break;
    }

    case "role-assignments": {
      db.delete(schema.userSourceRoleAssignments).run();
      for (const row of records) {
        const user = db
          .select()
          .from(schema.users)
          .where(eq(schema.users.sourceUserId, row.user_id))
          .get();
        const role = db
          .select()
          .from(schema.sourceRoles)
          .where(eq(schema.sourceRoles.roleId, row.role_id))
          .get();
        if (user && role) {
          db.insert(schema.userSourceRoleAssignments)
            .values({
              userId: user.id,
              sourceRoleId: role.id,
              assignedDate: row.assigned_date || null,
            })
            .run();
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
      db.delete(schema.sourceRolePermissions).run();
      // Also ensure source permissions exist
      for (const row of records) {
        // Auto-create permission if missing
        let perm = db
          .select()
          .from(schema.sourcePermissions)
          .where(eq(schema.sourcePermissions.permissionId, row.permission_id))
          .get();
        if (!perm) {
          // Derive system from the associated source role, or use CSV value, or default
          const assocRole = db
            .select({ system: schema.sourceRoles.system })
            .from(schema.sourceRoles)
            .where(eq(schema.sourceRoles.roleId, row.role_id))
            .get();
          db.insert(schema.sourcePermissions)
            .values({
              permissionId: row.permission_id,
              permissionName: row.permission_name || null,
              system: row.system || assocRole?.system || "SAP ECC",
            })
            .run();
          perm = db
            .select()
            .from(schema.sourcePermissions)
            .where(eq(schema.sourcePermissions.permissionId, row.permission_id))
            .get();
        }

        const role = db
          .select()
          .from(schema.sourceRoles)
          .where(eq(schema.sourceRoles.roleId, row.role_id))
          .get();

        if (role && perm) {
          db.insert(schema.sourceRolePermissions)
            .values({
              sourceRoleId: role.id,
              sourcePermissionId: perm.id,
            })
            .run();
          inserted++;
        } else {
          skipped++;
        }
      }
      break;
    }

    case "target-roles": {
      db.delete(schema.targetRoles).run();
      for (const row of records) {
        try {
          db.insert(schema.targetRoles)
            .values({
              roleId: row.role_id,
              roleName: row.role_name,
              description: row.description || null,
              system: row.system || "S/4HANA",
              domain: row.domain || null,
              roleOwner: row.role_owner || null,
            })
            .run();
          inserted++;
        } catch (e: any) {
          if (e.message?.includes("UNIQUE")) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${e.message}`);
        }
      }
      break;
    }

    case "target-permissions": {
      db.delete(schema.targetPermissions).run();
      for (const row of records) {
        try {
          db.insert(schema.targetPermissions)
            .values({
              permissionId: row.permission_id,
              permissionName: row.permission_name || null,
              description: row.description || null,
              system: row.system || "S/4HANA",
              permissionType: row.permission_type || null,
              riskLevel: row.risk_level || null,
            })
            .run();
          inserted++;
        } catch (e: any) {
          if (e.message?.includes("UNIQUE")) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${e.message}`);
        }
      }
      break;
    }

    case "sod-rules": {
      db.delete(schema.sodRules).run();
      for (const row of records) {
        try {
          db.insert(schema.sodRules)
            .values({
              ruleId: row.rule_id,
              ruleName: row.rule_name,
              description: row.description || null,
              permissionA: row.permission_a,
              permissionB: row.permission_b,
              severity: row.severity || "medium",
              riskDescription: row.risk_description || null,
            })
            .run();
          inserted++;
        } catch (e: any) {
          if (e.message?.includes("UNIQUE")) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${e.message}`);
        }
      }
      break;
    }

    case "personas": {
      db.delete(schema.personas).run();
      for (const row of records) {
        try {
          db.insert(schema.personas)
            .values({
              name: row.name,
              description: row.description || null,
              businessFunction: row.business_function || null,
              source: "manual_upload",
            })
            .run();
          inserted++;
        } catch (e: any) {
          if (e.message?.includes("UNIQUE")) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${e.message}`);
        }
      }
      break;
    }

    case "existing-access": {
      // Upload existing production access (from previous waves/releases)
      // Does NOT clear existing — appends with releasePhase="existing"
      for (const row of records) {
        const user = db
          .select()
          .from(schema.users)
          .where(eq(schema.users.sourceUserId, row.source_user_id))
          .get();
        const role = db
          .select()
          .from(schema.targetRoles)
          .where(eq(schema.targetRoles.roleId, row.target_role_id))
          .get();
        if (user && role) {
          try {
            db.insert(schema.userTargetRoleAssignments)
              .values({
                userId: user.id,
                targetRoleId: role.id,
                assignmentType: "existing_access",
                status: "approved",
                releasePhase: "existing",
              })
              .run();
            inserted++;
          } catch (e: any) {
            errors.push(`Row ${inserted + skipped + 1}: ${e.message}`);
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
              const parent = db
                .select({ id: schema.orgUnits.id })
                .from(schema.orgUnits)
                .where(eq(schema.orgUnits.name, row.parent_name.trim()))
                .get();
              parentId = parent?.id ?? null;
            }
            // Upsert by name: skip if already exists
            const existing = db
              .select({ id: schema.orgUnits.id })
              .from(schema.orgUnits)
              .where(eq(schema.orgUnits.name, row.name.trim()))
              .get();
            if (!existing) {
              db.insert(schema.orgUnits)
                .values({
                  name: row.name.trim(),
                  level: level,
                  parentId,
                  description: row.description || null,
                })
                .run();
              inserted++;
            } else {
              skipped++;
            }
          } catch (e: any) {
            errors.push(`Row (${row.name}): ${e.message}`);
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
          const existing = db
            .select({ id: schema.releases.id })
            .from(schema.releases)
            .where(eq(schema.releases.name, name))
            .get();
          if (existing) { skipped++; continue; }
          const isActive = row.is_active?.toLowerCase() === "true";
          // If this release is active, deactivate all others first
          if (isActive) {
            db.update(schema.releases).set({ isActive: false }).run();
          }
          db.insert(schema.releases)
            .values({
              name,
              description: row.description || null,
              status: row.status || "planning",
              releaseType: row.release_type || "initial",
              targetSystem: row.target_system || null,
              targetDate: row.target_date || null,
              isActive,
              createdBy: "data_upload",
            })
            .run();
          inserted++;
        } catch (e: any) {
          errors.push(`Row (${row.name}): ${e.message}`);
        }
      }
      break;
    }

    case "release-scope": {
      // Links org units to releases — appends, does not clear existing
      for (const row of records) {
        try {
          const release = db
            .select({ id: schema.releases.id })
            .from(schema.releases)
            .where(eq(schema.releases.name, row.release_name?.trim()))
            .get();
          const orgUnit = db
            .select({ id: schema.orgUnits.id })
            .from(schema.orgUnits)
            .where(eq(schema.orgUnits.name, row.org_unit_name?.trim()))
            .get();
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
          const exists = db
            .select()
            .from(schema.releaseOrgUnits)
            .where(eq(schema.releaseOrgUnits.releaseId, release.id))
            .all()
            .find((r) => r.orgUnitId === orgUnit.id);
          if (exists) { skipped++; continue; }
          db.insert(schema.releaseOrgUnits)
            .values({ releaseId: release.id, orgUnitId: orgUnit.id, addedBy: "data_upload" })
            .run();
          inserted++;
        } catch (e: any) {
          errors.push(`Row (${row.release_name} / ${row.org_unit_name}): ${e.message}`);
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
          const existing = db.select().from(schema.appUsers)
            .where(eq(schema.appUsers.username, row.username.trim()))
            .get();
          if (existing) {
            skipped++;
            continue;
          }

          // Resolve org unit by name
          let assignedOrgUnitId: number | null = null;
          if (row.org_unit_name?.trim()) {
            const orgUnit = db.select().from(schema.orgUnits)
              .where(eq(schema.orgUnits.name, row.org_unit_name.trim()))
              .get();
            if (orgUnit) {
              assignedOrgUnitId = orgUnit.id;
            } else {
              errors.push(`Row ${inserted + skipped + 1}: org_unit_name "${row.org_unit_name}" not found`);
            }
          }

          const passwordHash = bcrypt.hashSync(row.password, 10);

          db.insert(schema.appUsers).values({
            username: row.username.trim(),
            displayName: row.display_name.trim(),
            email: row.email?.trim() || null,
            passwordHash,
            role,
            assignedOrgUnitId,
          }).run();
          inserted++;
        } catch (e: any) {
          if (e.message?.includes("UNIQUE")) skipped++;
          else errors.push(`Row ${inserted + skipped + 1}: ${e.message}`);
        }
      }
      break;
    }
  }

  // Auto-associate uploaded data with the active release
  const activeRelease = db.select().from(schema.releases)
    .where(eq(schema.releases.isActive, true)).get();

  if (activeRelease && inserted > 0) {
    try {
      if (type === "users") {
        const userIds = db.select({ id: schema.users.id }).from(schema.users).all();
        for (const u of userIds) {
          const exists = db.select({ id: schema.releaseUsers.id }).from(schema.releaseUsers)
            .where(eq(schema.releaseUsers.userId, u.id)).get();
          if (!exists) {
            db.insert(schema.releaseUsers).values({ releaseId: activeRelease.id, userId: u.id }).run();
          }
        }
      } else if (type === "source-roles") {
        const roleIds = db.select({ id: schema.sourceRoles.id }).from(schema.sourceRoles).all();
        for (const r of roleIds) {
          const exists = db.select({ id: schema.releaseSourceRoles.id }).from(schema.releaseSourceRoles)
            .where(eq(schema.releaseSourceRoles.sourceRoleId, r.id)).get();
          if (!exists) {
            db.insert(schema.releaseSourceRoles).values({ releaseId: activeRelease.id, sourceRoleId: r.id }).run();
          }
        }
      } else if (type === "target-roles") {
        const roleIds = db.select({ id: schema.targetRoles.id }).from(schema.targetRoles).all();
        for (const r of roleIds) {
          const exists = db.select({ id: schema.releaseTargetRoles.id }).from(schema.releaseTargetRoles)
            .where(eq(schema.releaseTargetRoles.targetRoleId, r.id)).get();
          if (!exists) {
            db.insert(schema.releaseTargetRoles).values({ releaseId: activeRelease.id, targetRoleId: r.id }).run();
          }
        }
      } else if (type === "sod-rules") {
        const ruleIds = db.select({ id: schema.sodRules.id }).from(schema.sodRules).all();
        for (const r of ruleIds) {
          const exists = db.select({ id: schema.releaseSodRules.id }).from(schema.releaseSodRules)
            .where(eq(schema.releaseSodRules.sodRuleId, r.id)).get();
          if (!exists) {
            db.insert(schema.releaseSodRules).values({ releaseId: activeRelease.id, sodRuleId: r.id }).run();
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
