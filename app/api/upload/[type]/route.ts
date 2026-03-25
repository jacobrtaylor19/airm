/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { parse } from "csv-parse/sync";
import { eq } from "drizzle-orm";

type UploadType =
  | "users"
  | "source-roles"
  | "role-assignments"
  | "role-permissions"
  | "target-roles"
  | "target-permissions"
  | "sod-rules"
  | "personas";

const REQUIRED_COLUMNS: Record<UploadType, string[]> = {
  users: ["source_user_id", "display_name"],
  "source-roles": ["role_id", "role_name"],
  "role-assignments": ["user_id", "role_id"],
  "role-permissions": ["role_id", "permission_id"],
  "target-roles": ["role_id", "role_name"],
  "target-permissions": ["permission_id", "permission_name"],
  "sod-rules": ["rule_id", "rule_name", "permission_a", "permission_b", "severity"],
  personas: ["name", "description", "business_function"],
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

    // Preview mode: return first 5 rows + summary
    if (action !== "commit") {
      return NextResponse.json({
        status: "preview",
        totalRows: records.length,
        headers,
        preview: records.slice(0, 5),
        uploadType,
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
          db.insert(schema.users)
            .values({
              sourceUserId: row.source_user_id,
              displayName: row.display_name,
              email: row.email || null,
              jobTitle: row.job_title || null,
              department: row.department || null,
              orgUnit: row.org_unit || null,
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
          db.insert(schema.sourcePermissions)
            .values({
              permissionId: row.permission_id,
              permissionName: row.permission_name || null,
              system: "SAP ECC",
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
  }

  return {
    inserted,
    skipped,
    errors: errors.slice(0, 10), // Cap error list
    totalRows: records.length,
  };
}
