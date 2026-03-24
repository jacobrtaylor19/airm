import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { parse } from "csv-parse/sync";
import { readFileSync, existsSync } from "fs";
import { eq } from "drizzle-orm";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

const sqlite = new Database(path.join(DATA_DIR, "airm.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

const db = drizzle(sqlite, { schema });

function readCsv<T>(filename: string): T[] {
  const filepath = path.join(DATA_DIR, filename);
  if (!existsSync(filepath)) return [];
  const content = readFileSync(filepath, "utf-8");
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as T[];
  return records;
}

function seed() {
  console.log("🌱 Seeding database...\n");

  // ─── Clear tables (reverse dependency order) ───
  db.delete(schema.auditLog).run();
  db.delete(schema.processingJobs).run();
  db.delete(schema.permissionGaps).run();
  db.delete(schema.sodConflicts).run();
  db.delete(schema.sodRules).run();
  db.delete(schema.userTargetRoleAssignments).run();
  db.delete(schema.personaTargetRoleMappings).run();
  db.delete(schema.userPersonaAssignments).run();
  db.delete(schema.personaSourcePermissions).run();
  db.delete(schema.userSourceRoleAssignments).run();
  db.delete(schema.sourceRolePermissions).run();
  db.delete(schema.targetSecurityRoleTasks).run();
  db.delete(schema.targetTaskRolePermissions).run();
  db.delete(schema.targetRolePermissions).run();
  db.delete(schema.targetTaskRoles).run();
  db.delete(schema.personas).run();
  db.delete(schema.consolidatedGroups).run();
  db.delete(schema.sourcePermissions).run();
  db.delete(schema.sourceRoles).run();
  db.delete(schema.targetPermissions).run();
  db.delete(schema.targetRoles).run();
  db.delete(schema.users).run();

  // ─── 1. Users ───
  const usersData = readCsv<any>("users.csv");
  for (const row of usersData) {
    db.insert(schema.users).values({
      sourceUserId: row.source_user_id,
      displayName: row.display_name,
      email: row.email,
      jobTitle: row.job_title,
      department: row.department,
    }).run();
  }
  console.log(`  ✓ ${usersData.length} users`);

  // ─── 2. Consolidated Groups ───
  const groupsData = readCsv<any>("consolidated-groups.csv");
  for (const row of groupsData) {
    db.insert(schema.consolidatedGroups).values({
      name: row.name,
      accessLevel: row.access_level,
      description: row.description,
    }).run();
  }
  console.log(`  ✓ ${groupsData.length} consolidated groups`);

  // ─── 3. Personas ───
  const personasData = readCsv<any>("personas.csv");
  for (const row of personasData) {
    db.insert(schema.personas).values({
      name: row.name,
      description: row.description,
      businessFunction: row.business_function,
      source: "ai",
    }).run();
  }
  console.log(`  ✓ ${personasData.length} personas`);

  // ─── 4. Persona → Group Mappings ───
  const pgMappings = readCsv<any>("persona-group-mappings.csv");
  let pgCount = 0;
  for (const row of pgMappings) {
    const group = db.select().from(schema.consolidatedGroups)
      .where(eq(schema.consolidatedGroups.name, row.consolidated_group_name))
      .get();
    if (group) {
      db.update(schema.personas)
        .set({ consolidatedGroupId: group.id })
        .where(eq(schema.personas.name, row.persona_name))
        .run();
      pgCount++;
    }
  }
  console.log(`  ✓ ${pgCount} persona-group mappings`);

  // ─── 5. Source Roles ───
  const rolesData = readCsv<any>("source-roles.csv");
  for (const row of rolesData) {
    db.insert(schema.sourceRoles).values({
      roleId: row.role_id,
      roleName: row.role_name,
      description: row.description,
      system: row.system || "SAP ECC",
      domain: row.domain,
    }).run();
  }
  console.log(`  ✓ ${rolesData.length} source roles`);

  // ─── 6. Source Permissions ───
  const permData = readCsv<any>("source-permissions.csv");
  for (const row of permData) {
    db.insert(schema.sourcePermissions).values({
      permissionId: row.permission_id,
      permissionName: row.permission_name || null,
      description: row.description || null,
      system: row.system || "SAP ECC",
      riskLevel: row.risk_level || null,
    }).run();
  }
  console.log(`  ✓ ${permData.length} source permissions`);

  // ─── 7. Source Role-Permission Assignments ───
  const rpData = readCsv<any>("source-role-permissions.csv");
  let rpCount = 0;
  for (const row of rpData) {
    const role = db.select().from(schema.sourceRoles)
      .where(eq(schema.sourceRoles.roleId, row.role_id)).get();
    const perm = db.select().from(schema.sourcePermissions)
      .where(eq(schema.sourcePermissions.permissionId, row.permission_id)).get();
    if (role && perm) {
      db.insert(schema.sourceRolePermissions).values({
        sourceRoleId: role.id,
        sourcePermissionId: perm.id,
      }).run();
      rpCount++;
    }
  }
  console.log(`  ✓ ${rpCount} role-permission assignments`);

  // ─── 8. Target Roles ───
  const targetRolesData = readCsv<any>("target-roles.csv");
  for (const row of targetRolesData) {
    if (row.role_id === "Role ID") continue; // skip header row if duplicated
    db.insert(schema.targetRoles).values({
      roleId: row.role_id,
      roleName: row.role_name,
      description: row.description,
      system: row.system || "S/4HANA",
      domain: row.domain || "Finance",
    }).run();
  }
  console.log(`  ✓ ${targetRolesData.length} target roles`);

  // ─── 9. Target Permissions (optional) ───
  const targetPermData = readCsv<any>("target-permissions.csv");
  if (targetPermData.length > 0) {
    for (const row of targetPermData) {
      db.insert(schema.targetPermissions).values({
        permissionId: row.permission_id,
        permissionName: row.permission_name || null,
        description: row.description || null,
        system: row.system || "S/4HANA",
        riskLevel: row.risk_level || null,
      }).run();
    }
    console.log(`  ✓ ${targetPermData.length} target permissions`);
  } else {
    console.log("  ⊘ target-permissions.csv not found or empty, skipping");
  }

  // ─── 10. User-Persona Assignments ───
  const upaData = readCsv<any>("user-persona-assignments.csv");
  let upaCount = 0;
  for (const row of upaData) {
    const user = db.select().from(schema.users)
      .where(eq(schema.users.sourceUserId, row.source_user_id)).get();
    const persona = db.select().from(schema.personas)
      .where(eq(schema.personas.name, row.persona_name)).get();
    if (user && persona) {
      db.insert(schema.userPersonaAssignments).values({
        userId: user.id,
        personaId: persona.id,
        consolidatedGroupId: persona.consolidatedGroupId,
        confidenceScore: parseFloat(row.confidence_score) || null,
        assignmentMethod: row.assignment_method || "ai",
      }).run();
      upaCount++;
    }
  }
  console.log(`  ✓ ${upaCount} user-persona assignments`);

  // ─── 10b. User-Source Role Assignments (optional) ───
  const usraData = readCsv<any>("user-source-role-assignments.csv");
  let usraCount = 0;
  for (const row of usraData) {
    const user = db.select().from(schema.users)
      .where(eq(schema.users.sourceUserId, row.user_id)).get();
    const role = db.select().from(schema.sourceRoles)
      .where(eq(schema.sourceRoles.roleId, row.role_id)).get();
    if (user && role) {
      db.insert(schema.userSourceRoleAssignments).values({
        userId: user.id,
        sourceRoleId: role.id,
      }).run();
      usraCount++;
    }
  }
  if (usraCount > 0) {
    console.log(`  ✓ ${usraCount} user-source role assignments`);
  } else {
    console.log("  ⊘ user-source-role-assignments.csv not found or empty, skipping");
  }

  // ─── 11. SOD Rules (optional) ───
  const sodData = readCsv<any>("sod-rules.csv");
  if (sodData.length > 0) {
    for (const row of sodData) {
      db.insert(schema.sodRules).values({
        ruleId: row.rule_id,
        ruleName: row.rule_name,
        description: row.description || null,
        permissionA: row.permission_a,
        permissionB: row.permission_b,
        severity: row.severity || "medium",
        riskDescription: row.risk_description || null,
      }).run();
    }
    console.log(`  ✓ ${sodData.length} SOD rules`);
  } else {
    console.log("  ⊘ sod-rules.csv not found or empty, skipping");
  }

  // ─── 12. Default Admin User ───
  db.delete(schema.workAssignments).run();
  db.delete(schema.appUserSessions).run();
  db.delete(schema.appUsers).run();

  // Hash password synchronously using bcryptjs
  const bcrypt = require("bcryptjs");
  const adminHash = bcrypt.hashSync("admin123", 10);

  const testPassword = bcrypt.hashSync("test123", 10);

  const testUsers = [
    { username: "admin", displayName: "Administrator", role: "admin", hash: adminHash },
    { username: "mapper.finance", displayName: "Jane Chen (Finance Mapper)", role: "mapper", hash: testPassword },
    { username: "mapper.maintenance", displayName: "Mike Torres (Maintenance Mapper)", role: "mapper", hash: testPassword },
    { username: "mapper.procurement", displayName: "Sarah Kim (Procurement Mapper)", role: "mapper", hash: testPassword },
    { username: "approver.finance", displayName: "David Okafor (Finance Approver)", role: "approver", hash: testPassword },
    { username: "approver.operations", displayName: "Lisa Park (Operations Approver)", role: "approver", hash: testPassword },
    { username: "viewer", displayName: "Chris Reed (Viewer)", role: "viewer", hash: testPassword },
  ];

  for (const u of testUsers) {
    db.insert(schema.appUsers).values({
      username: u.username,
      displayName: u.displayName,
      passwordHash: u.hash,
      role: u.role,
    }).run();
  }

  // Create work assignments for the test users
  const mapperFinance = db.select().from(schema.appUsers).where(eq(schema.appUsers.username, "mapper.finance")).get()!;
  const mapperMaint = db.select().from(schema.appUsers).where(eq(schema.appUsers.username, "mapper.maintenance")).get()!;
  const mapperProc = db.select().from(schema.appUsers).where(eq(schema.appUsers.username, "mapper.procurement")).get()!;
  const approverFin = db.select().from(schema.appUsers).where(eq(schema.appUsers.username, "approver.finance")).get()!;
  const approverOps = db.select().from(schema.appUsers).where(eq(schema.appUsers.username, "approver.operations")).get()!;

  const assignments = [
    { appUserId: mapperFinance.id, assignmentType: "mapper", scopeType: "department", scopeValue: "Finance" },
    { appUserId: mapperMaint.id, assignmentType: "mapper", scopeType: "department", scopeValue: "Maintenance" },
    { appUserId: mapperMaint.id, assignmentType: "mapper", scopeType: "department", scopeValue: "Facilities" },
    { appUserId: mapperProc.id, assignmentType: "mapper", scopeType: "department", scopeValue: "Procurement" },
    { appUserId: mapperProc.id, assignmentType: "mapper", scopeType: "department", scopeValue: "Supply Chain" },
    { appUserId: mapperProc.id, assignmentType: "mapper", scopeType: "department", scopeValue: "Warehouse" },
    { appUserId: approverFin.id, assignmentType: "approver", scopeType: "department", scopeValue: "Finance" },
    { appUserId: approverOps.id, assignmentType: "approver", scopeType: "department", scopeValue: "Maintenance" },
    { appUserId: approverOps.id, assignmentType: "approver", scopeType: "department", scopeValue: "Facilities" },
    { appUserId: approverOps.id, assignmentType: "approver", scopeType: "department", scopeValue: "Procurement" },
    { appUserId: approverOps.id, assignmentType: "approver", scopeType: "department", scopeValue: "Supply Chain" },
    { appUserId: approverOps.id, assignmentType: "approver", scopeType: "department", scopeValue: "Warehouse" },
  ];

  for (const a of assignments) {
    db.insert(schema.workAssignments).values(a).run();
  }

  console.log(`  ✓ ${testUsers.length} app users + ${assignments.length} work assignments`);
  console.log("    Credentials:");
  console.log("    admin / admin123 (admin — full access)");
  console.log("    mapper.finance / test123 (mapper — Finance dept)");
  console.log("    mapper.maintenance / test123 (mapper — Maintenance + Facilities)");
  console.log("    mapper.procurement / test123 (mapper — Procurement + Supply Chain + Warehouse)");
  console.log("    approver.finance / test123 (approver — Finance dept)");
  console.log("    approver.operations / test123 (approver — Maintenance + Facilities + Procurement + Supply Chain + Warehouse)");
  console.log("    viewer / test123 (viewer — read-only)");

  // ─── Verification ───
  console.log("\n📊 Verification:");
  const counts = {
    users: db.select().from(schema.users).all().length,
    consolidatedGroups: db.select().from(schema.consolidatedGroups).all().length,
    personas: db.select().from(schema.personas).all().length,
    sourceRoles: db.select().from(schema.sourceRoles).all().length,
    sourcePermissions: db.select().from(schema.sourcePermissions).all().length,
    rolePermissions: db.select().from(schema.sourceRolePermissions).all().length,
    targetRoles: db.select().from(schema.targetRoles).all().length,
    userPersonaAssignments: db.select().from(schema.userPersonaAssignments).all().length,
    sodRules: db.select().from(schema.sodRules).all().length,
  };
  console.log(counts);
  console.log("\n✅ Seed complete!");

  // Close the database connection so subsequent processes can access it
  sqlite.close();
}

seed();
