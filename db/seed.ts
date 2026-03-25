import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { parse } from "csv-parse/sync";
import { readFileSync, existsSync } from "fs";
import { eq } from "drizzle-orm";
import path from "path";

// ─── Parse --demo flag ───
const demoArg = process.argv.find((a) => a.startsWith("--demo="));
const demoPack = demoArg ? demoArg.split("=")[1] : null;

const DATA_DIR = path.join(process.cwd(), "data");
const CSV_DIR = demoPack
  ? path.join(DATA_DIR, "demos", demoPack)
  : DATA_DIR;

if (demoPack && !existsSync(CSV_DIR)) {
  console.error(`❌ Demo pack not found: ${CSV_DIR}`);
  process.exit(1);
}

if (demoPack) {
  console.log(`📦 Using demo pack: ${demoPack}`);
  console.log(`   CSV directory: ${CSV_DIR}\n`);
}

const sqlite = new Database(path.join(DATA_DIR, "airm.db"));
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
sqlite.pragma("busy_timeout = 5000");

const db = drizzle(sqlite, { schema });

function readCsv<T>(filename: string): T[] {
  // Try demo-pack directory first, fall back to main data dir
  const filepath = path.join(CSV_DIR, filename);
  if (!existsSync(filepath)) {
    // If using a demo pack, try the default data dir as fallback
    if (demoPack) {
      const fallback = path.join(DATA_DIR, filename);
      if (existsSync(fallback)) {
        const content = readFileSync(fallback, "utf-8");
        return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as T[];
      }
    }
    return [];
  }
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
  db.delete(schema.orgUnits).run();

  // ─── 0. Org Hierarchy ───
  const orgHierarchy: { name: string; level: string; parentName?: string; description?: string }[] = [
    // L1
    { name: "Operations", level: "L1", description: "Core operational functions" },
    { name: "Corporate Services", level: "L1", description: "Corporate support functions" },
    { name: "Technology", level: "L1", description: "Technology and engineering" },
    // L2 under Operations
    { name: "Maintenance", level: "L2", parentName: "Operations", description: "Asset maintenance and reliability" },
    { name: "Facilities", level: "L2", parentName: "Operations", description: "Facilities management" },
    { name: "Supply Chain", level: "L2", parentName: "Operations", description: "Supply chain and logistics" },
    { name: "Warehouse", level: "L2", parentName: "Operations", description: "Warehouse and inventory management" },
    { name: "Quality", level: "L2", parentName: "Operations", description: "Quality assurance and control" },
    // L2 under Corporate Services
    { name: "Finance", level: "L2", parentName: "Corporate Services", description: "Financial management and reporting" },
    { name: "Procurement", level: "L2", parentName: "Corporate Services", description: "Procurement and vendor management" },
    { name: "Market Research", level: "L2", parentName: "Corporate Services", description: "Market research and analysis" },
    // L2 under Technology
    { name: "Product Development", level: "L2", parentName: "Technology", description: "Product development and engineering" },
    { name: "Product", level: "L2", parentName: "Technology", description: "Product management" },
    { name: "Research & Development", level: "L2", parentName: "Technology", description: "Research and development" },
    // L3 under Maintenance
    { name: "Rotating Equipment", level: "L3", parentName: "Maintenance", description: "Rotating equipment maintenance" },
    { name: "Instrumentation", level: "L3", parentName: "Maintenance", description: "Instrumentation and controls" },
    { name: "Electrical", level: "L3", parentName: "Maintenance", description: "Electrical systems maintenance" },
    { name: "Civil", level: "L3", parentName: "Maintenance", description: "Civil and structural maintenance" },
    // L3 under Finance
    { name: "Accounts Payable", level: "L3", parentName: "Finance", description: "Accounts payable processing" },
    { name: "Accounts Receivable", level: "L3", parentName: "Finance", description: "Accounts receivable and collections" },
    { name: "General Ledger", level: "L3", parentName: "Finance", description: "General ledger and financial reporting" },
    { name: "Treasury", level: "L3", parentName: "Finance", description: "Treasury and cash management" },
    // L3 under Supply Chain
    { name: "Logistics", level: "L3", parentName: "Supply Chain", description: "Transportation and logistics" },
    { name: "Demand Planning", level: "L3", parentName: "Supply Chain", description: "Demand forecasting and planning" },
    { name: "Distribution", level: "L3", parentName: "Supply Chain", description: "Distribution operations" },
    // L3 under Warehouse
    { name: "Receiving", level: "L3", parentName: "Warehouse", description: "Goods receiving" },
    { name: "Inventory Control", level: "L3", parentName: "Warehouse", description: "Inventory control and counting" },
    // L3 under Procurement
    { name: "Strategic Sourcing", level: "L3", parentName: "Procurement", description: "Strategic sourcing and contracts" },
    { name: "Vendor Management", level: "L3", parentName: "Procurement", description: "Vendor onboarding and management" },
    // L3 under Product Development
    { name: "Design Engineering", level: "L3", parentName: "Product Development", description: "Product design and engineering" },
    { name: "Testing", level: "L3", parentName: "Product Development", description: "Testing and validation" },
  ];

  // Insert L1 first, then L2, then L3 to respect parent ordering
  const orgUnitIdMap = new Map<string, number>();
  for (const level of ["L1", "L2", "L3"]) {
    for (const ou of orgHierarchy.filter(o => o.level === level)) {
      const parentId = ou.parentName ? orgUnitIdMap.get(ou.parentName) ?? null : null;
      const result = db.insert(schema.orgUnits).values({
        name: ou.name,
        level: ou.level,
        parentId,
        description: ou.description,
      }).run();
      orgUnitIdMap.set(ou.name, Number(result.lastInsertRowid));
    }
  }
  console.log(`  ✓ ${orgHierarchy.length} org units (L1/L2/L3 hierarchy)`);

  // ─── Department → OrgUnit mapping (L2 departments match directly) ───
  const deptToOrgUnit = new Map<string, number>();
  orgUnitIdMap.forEach((id, name) => {
    deptToOrgUnit.set(name, id);
  });

  // ─── 1. Users ───
  const usersData = readCsv<any>("users.csv");
  for (const row of usersData) {
    const dept = row.department?.trim();
    const ouId = dept ? (deptToOrgUnit.get(dept) ?? null) : null;
    db.insert(schema.users).values({
      sourceUserId: row.source_user_id,
      displayName: row.display_name,
      email: row.email,
      jobTitle: row.job_title,
      department: row.department,
      orgUnitId: ouId,
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
      roleOwner: row.role_owner || null,
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
      roleOwner: row.role_owner || null,
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

  // ─── 9b. Target Role-Permission Assignments ───
  const trpData = readCsv<any>("target-role-permissions.csv");
  let trpCount = 0;
  for (const row of trpData) {
    const role = db.select().from(schema.targetRoles)
      .where(eq(schema.targetRoles.roleId, row.target_role_id)).get();
    const perm = db.select().from(schema.targetPermissions)
      .where(eq(schema.targetPermissions.permissionId, row.permission_id)).get();
    if (role && perm) {
      db.insert(schema.targetRolePermissions).values({
        targetRoleId: role.id,
        targetPermissionId: perm.id,
      }).run();
      trpCount++;
    }
  }
  if (trpCount > 0) {
    console.log(`  ✓ ${trpCount} target role-permission assignments`);
  } else {
    console.log("  ⊘ target-role-permissions.csv not found or empty, skipping");
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

  // ─── 11c. User-Target-Role Assignments (loaded from CSV) ───
  // Lookup helpers
  const targetRoleLookup = new Map<string, number>();
  const allTargetRoles = db.select().from(schema.targetRoles).all();
  for (const tr of allTargetRoles) {
    targetRoleLookup.set(tr.roleId, tr.id);
  }

  const userLookup = new Map<string, { id: number; department: string | null }>();
  const allUsers = db.select().from(schema.users).all();
  for (const u of allUsers) {
    userLookup.set(u.sourceUserId, { id: u.id, department: u.department });
  }

  const utraData = readCsv<any>("user-target-role-assignments.csv");
  let utraCount = 0;
  for (const row of utraData) {
    const userInfo = userLookup.get(row.user_id);
    const targetRoleDbId = targetRoleLookup.get(row.role_id);
    if (userInfo && targetRoleDbId) {
      db.insert(schema.userTargetRoleAssignments).values({
        userId: userInfo.id,
        targetRoleId: targetRoleDbId,
        assignmentType: "seed_demo",
        status: "draft",
      }).run();
      utraCount++;
    }
  }
  if (utraCount > 0) {
    console.log(`  ✓ ${utraCount} user-target-role assignments (loaded from CSV)`);
  } else {
    console.log("  ⊘ user-target-role-assignments.csv not found or empty, skipping");
  }

  // ─── 11d. Run SOD analysis on seeded assignments ───
  // The SOD rules reference SAP ECC t-codes (XK01, FB60, etc.) but target roles use
  // S/4HANA Fiori app IDs (F0717, F0859, etc.). We need target-permission-level SOD rules.
  // Create target-system SOD rules that reference the actual target permission IDs.

  const targetSodRules: { ruleId: string; ruleName: string; permA: string; permB: string; severity: string; riskDesc: string }[] = [
    // Finance: Invoice creation vs approval
    { ruleId: "T-SOD-AP-001", ruleName: "Create & Approve Invoice", permA: "F0717", permB: "F0859",
      severity: "critical", riskDesc: "A user who can both create supplier invoices (F0717) and approve them (F0859) can post fraudulent invoices and approve their own entries, bypassing the dual-control requirement for accounts payable." },
    // Finance: Invoice creation vs payment execution
    { ruleId: "T-SOD-AP-002", ruleName: "Invoice Entry & Payment Execution", permA: "F0717", permB: "F1603",
      severity: "critical", riskDesc: "A user who can post supplier invoices and execute automatic payments has end-to-end control over cash disbursement. This allows posting fraudulent invoices and immediately paying them." },
    // Finance: Vendor master vs payment
    { ruleId: "T-SOD-AP-003", ruleName: "Vendor Master & Payment Execution", permA: "F0790", permB: "F1603",
      severity: "critical", riskDesc: "A user who can create/modify vendor master records and execute payment runs can create fictitious vendors and immediately pay them. This is one of the highest-risk SOD conflicts." },
    // Finance: Vendor master vs invoice
    { ruleId: "T-SOD-AP-004", ruleName: "Vendor Master & Invoice Entry", permA: "F0790", permB: "F0717",
      severity: "high", riskDesc: "A user who can maintain vendor master data and post invoices can create fictitious vendors and record fraudulent invoices without a purchase order control point." },
    // Finance: Invoice approval vs payment
    { ruleId: "T-SOD-AP-005", ruleName: "Invoice Approval & Payment Execution", permA: "F0859", permB: "F1603",
      severity: "high", riskDesc: "A user who can approve invoices and run payment programs controls both the approval gate and cash disbursement, weakening the procure-to-pay control framework." },
    // Finance: GL posting vs invoice
    { ruleId: "T-SOD-GL-001", ruleName: "GL Posting & Invoice Processing", permA: "F0400", permB: "F0717",
      severity: "high", riskDesc: "A user who can post journal entries and process invoices can manipulate both the sub-ledger and general ledger, making it difficult to detect financial statement fraud." },
    // Finance: GL posting vs payment
    { ruleId: "T-SOD-GL-002", ruleName: "GL Posting & Payment Execution", permA: "F0400", permB: "F1603",
      severity: "high", riskDesc: "A user who can post journal entries and execute payments can create manual adjustments to cover fraudulent payment activity." },
    // Finance: Vendor master + invoice approval
    { ruleId: "T-SOD-AP-006", ruleName: "Vendor Master & Invoice Approval", permA: "F0790", permB: "F0859",
      severity: "high", riskDesc: "A user who can maintain vendor master records and approve invoices can modify vendor bank details and then approve invoices that route payments to unauthorized accounts." },
    // Procurement: PO creation vs goods receipt
    { ruleId: "T-SOD-MM-001", ruleName: "Purchase Order & Goods Receipt", permA: "F2439", permB: "F3002",
      severity: "critical", riskDesc: "A user who can create purchase orders and post goods receipts can fabricate procurement commitments and falsely confirm delivery. This is among the most significant procurement SOD conflicts." },
    // Procurement: PO creation vs PO release
    { ruleId: "T-SOD-MM-002", ruleName: "Create & Release Purchase Order", permA: "F2439", permB: "F2441",
      severity: "high", riskDesc: "A user who can create and approve purchase orders circumvents the purchasing authorization control. This is a foundational procurement segregation requirement." },
    // Procurement: PO creation vs inventory management
    { ruleId: "T-SOD-MM-003", ruleName: "Purchase Order & Inventory Adjustment", permA: "F2439", permB: "F3737",
      severity: "high", riskDesc: "A user who can create purchase orders and manage physical inventory can manipulate both procurement records and inventory counts to conceal misappropriation." },
    // Procurement: Goods receipt vs inventory differences
    { ruleId: "T-SOD-MM-004", ruleName: "Goods Receipt & Inventory Differences", permA: "F3002", permB: "F3738",
      severity: "high", riskDesc: "A user who can post goods receipts and adjust inventory differences can inflate delivery quantities and then write off the discrepancies, concealing theft." },
    // Procurement: Buyer + Material master
    { ruleId: "T-SOD-MM-005", ruleName: "Purchase Order & Material Master", permA: "F2439", permB: "F3814",
      severity: "medium", riskDesc: "A user who can create purchase orders and maintain material master records controls both what can be procured and the actual procurement transaction." },
    // Maintenance: Create order vs confirm order
    { ruleId: "T-SOD-PM-001", ruleName: "Create & Confirm Maintenance Order", permA: "F4580", permB: "F4583",
      severity: "medium", riskDesc: "A user who can create maintenance orders and confirm their completion can report false work completion, enabling labor fraud and false productivity reporting." },
    // Maintenance: Equipment master vs maintenance order
    { ruleId: "T-SOD-PM-002", ruleName: "Equipment Master & Maintenance Order", permA: "F4590", permB: "F4580",
      severity: "medium", riskDesc: "A user who can manage equipment records and create maintenance orders bypasses independent technical review of asset setup before work is authorized." },
    // Maintenance: Schedule plans vs confirm order
    { ruleId: "T-SOD-PM-003", ruleName: "Schedule Plans & Confirm Order", permA: "F4600", permB: "F4583",
      severity: "medium", riskDesc: "A user who can schedule preventive maintenance and confirm its completion can falsify preventive maintenance records without independent verification." },
    // Cross-domain: Maintenance order + goods receipt
    { ruleId: "T-SOD-XM-001", ruleName: "Maintenance Order & Goods Receipt", permA: "F4580", permB: "F3002",
      severity: "high", riskDesc: "A user who can create maintenance orders and receive goods can authorize work and receive materials without independent oversight, enabling material diversion." },
    // Cross-domain: Maintenance order + purchase order
    { ruleId: "T-SOD-XM-002", ruleName: "Maintenance Order & Purchase Order", permA: "F4581", permB: "F2439",
      severity: "high", riskDesc: "A user who can manage maintenance orders and create purchase orders controls both the work scope and procurement commitment, enabling inflated maintenance costs." },
    // Cross-domain: Equipment + Material master
    { ruleId: "T-SOD-XM-003", ruleName: "Equipment Master & Material Master", permA: "F4590", permB: "F3814",
      severity: "medium", riskDesc: "A user who can manage both equipment and material master records controls the registration of assets and their associated spare parts without separation between technical and procurement master data." },
    // Warehouse: Goods receipt + goods issue
    { ruleId: "T-SOD-WH-001", ruleName: "Goods Receipt & Goods Issue", permA: "F3002", permB: "F3003",
      severity: "medium", riskDesc: "A user who can process both goods receipts and goods issues can manipulate inventory levels without independent confirmation of inbound and outbound material flows." },
    // Inventory: Physical inventory + posting differences
    { ruleId: "T-SOD-INV-001", ruleName: "Physical Inventory & Post Differences", permA: "F3737", permB: "F3738",
      severity: "critical", riskDesc: "A user who can conduct physical inventory counts and post the resulting adjustments has full control over inventory variance recognition, enabling concealment of theft." },
  ];

  // Insert target-system SOD rules
  for (const r of targetSodRules) {
    db.insert(schema.sodRules).values({
      ruleId: r.ruleId,
      ruleName: r.ruleName,
      permissionA: r.permA,
      permissionB: r.permB,
      severity: r.severity,
      riskDescription: r.riskDesc,
    }).run();
  }
  console.log(`  ✓ ${targetSodRules.length} target-system SOD rules (S/4HANA Fiori permissions)`);

  // Build permission map for target roles
  const seedRolePerms = new Map<number, Set<string>>();
  const seedTrps = db.select({
    roleId: schema.targetRolePermissions.targetRoleId,
    permId: schema.targetPermissions.permissionId,
  }).from(schema.targetRolePermissions)
    .innerJoin(schema.targetPermissions, eq(schema.targetRolePermissions.targetPermissionId, schema.targetPermissions.id))
    .all();
  for (const row of seedTrps) {
    if (!seedRolePerms.has(row.roleId)) seedRolePerms.set(row.roleId, new Set());
    seedRolePerms.get(row.roleId)!.add(row.permId);
  }

  // Load target permission name lookup
  const permNameLookup = new Map<string, string | null>();
  const allTargetPerms = db.select().from(schema.targetPermissions).all();
  for (const tp of allTargetPerms) {
    permNameLookup.set(tp.permissionId, tp.permissionName);
  }

  // Load target role name lookup
  const roleNameLookup = new Map<number, string>();
  for (const tr of allTargetRoles) {
    roleNameLookup.set(tr.id, tr.roleName);
  }

  // Load all active SOD rules (including the target-system ones we just inserted)
  const activeRules = db.select().from(schema.sodRules).where(eq(schema.sodRules.isActive, true)).all();

  // Group assignments by user
  const seedAssignments = db.select().from(schema.userTargetRoleAssignments)
    .where(eq(schema.userTargetRoleAssignments.status, "draft")).all();
  const seedUserAssignments = new Map<number, number[]>();
  for (const a of seedAssignments) {
    if (!seedUserAssignments.has(a.userId)) seedUserAssignments.set(a.userId, []);
    seedUserAssignments.get(a.userId)!.push(a.targetRoleId);
  }

  let seedConflictsFound = 0;
  const seedUsersWithConflicts = new Set<number>();

  const seedUserEntries = Array.from(seedUserAssignments.entries());
  for (const [userId, roleIds] of seedUserEntries) {
    const userPerms = new Set<string>();
    const permToRole = new Map<string, number>();
    for (const roleId of roleIds) {
      const perms = seedRolePerms.get(roleId) || new Set();
      const permArr = Array.from(perms);
      for (const p of permArr) {
        userPerms.add(p);
        permToRole.set(p, roleId);
      }
    }

    let userConflictCount = 0;
    for (const rule of activeRules) {
      if (userPerms.has(rule.permissionA) && userPerms.has(rule.permissionB)) {
        seedConflictsFound++;
        userConflictCount++;
        seedUsersWithConflicts.add(userId);

        const roleIdA = permToRole.get(rule.permissionA) ?? null;
        const roleIdB = permToRole.get(rule.permissionB) ?? null;
        const roleAName = roleIdA ? (roleNameLookup.get(roleIdA) ?? null) : null;
        const roleBName = roleIdB ? (roleNameLookup.get(roleIdB) ?? null) : null;
        const permAName = permNameLookup.get(rule.permissionA) ?? null;
        const permBName = permNameLookup.get(rule.permissionB) ?? null;

        // Determine conflict type: if both permissions come from the same role, it's within_role
        const conflictType = (roleIdA !== null && roleIdB !== null && roleIdA === roleIdB)
          ? "within_role"
          : "between_role";

        // Build risk explanation
        const risk = rule.riskDescription
          ? rule.riskDescription
          : `Conflicting access: "${permAName ?? rule.permissionA}" and "${permBName ?? rule.permissionB}" should be held by separate individuals.`;
        let resolution: string;
        if (conflictType === "within_role") {
          resolution = `This is a within-role conflict: the role "${roleAName ?? "this role"}" contains both conflicting permissions. This role needs to be reviewed and potentially split by the Security/GRC team.`;
        } else {
          resolution = rule.severity === "critical"
            ? `Resolution required: Remove "${roleAName ?? "one role"}" or "${roleBName ?? "the other role"}". Risk acceptance is NOT permitted for critical conflicts.`
            : `Resolution options: Remove "${roleAName ?? "one role"}" or "${roleBName ?? "the other role"}", or submit a risk acceptance request with business justification.`;
        }
        const riskExplanation = `${risk}\n\n${resolution}`;

        db.insert(schema.sodConflicts).values({
          userId,
          sodRuleId: rule.id,
          roleIdA,
          roleIdB,
          permissionIdA: rule.permissionA,
          permissionIdB: rule.permissionB,
          severity: rule.severity,
          conflictType,
          resolutionStatus: "open",
          riskExplanation,
        }).run();
      }
    }

    // Update assignment statuses
    const newStatus = userConflictCount > 0 ? "sod_rejected" : "compliance_approved";
    for (const roleId of roleIds) {
      db.update(schema.userTargetRoleAssignments).set({
        status: newStatus,
        sodConflictCount: userConflictCount,
        updatedAt: new Date().toISOString(),
      }).where(
        eq(schema.userTargetRoleAssignments.userId, userId),
      ).run();
    }
  }

  console.log(`  ✓ ${seedConflictsFound} SOD conflicts detected across ${seedUsersWithConflicts.size} users`);
  console.log(`    (${seedUserAssignments.size - seedUsersWithConflicts.size} users clean, ${seedUsersWithConflicts.size} users with conflicts)`);

  // ─── 12. Default Admin User ───
  db.delete(schema.workAssignments).run();
  db.delete(schema.appUserSessions).run();
  db.delete(schema.appUsers).run();

  // Hash password synchronously using bcryptjs
  const bcrypt = require("bcryptjs");
  const adminHash = bcrypt.hashSync("admin123", 10);

  const sysadminHash = bcrypt.hashSync("sysadmin123", 10);
  const testPassword = bcrypt.hashSync("test123", 10);
  const securityHash = bcrypt.hashSync("security123", 10);
  const complianceHash = bcrypt.hashSync("compliance123", 10);
  const grcHash = bcrypt.hashSync("grc123", 10);

  const testUsers = [
    { username: "sysadmin", displayName: "System Administrator", role: "system_admin", hash: sysadminHash, orgUnit: null as string | null },
    { username: "admin", displayName: "Administrator", role: "admin", hash: adminHash, orgUnit: null as string | null },
    { username: "mapper.finance", displayName: "Jane Chen (Finance Mapper)", role: "mapper", hash: testPassword, orgUnit: "Finance" },
    { username: "mapper.maintenance", displayName: "Mike Torres (Maintenance Mapper)", role: "mapper", hash: testPassword, orgUnit: "Maintenance" },
    { username: "mapper.procurement", displayName: "Sarah Kim (Procurement Mapper)", role: "mapper", hash: testPassword, orgUnit: "Procurement" },
    { username: "approver.finance", displayName: "David Okafor (Finance Approver)", role: "approver", hash: testPassword, orgUnit: "Corporate Services" },
    { username: "approver.operations", displayName: "Lisa Park (Operations Approver)", role: "approver", hash: testPassword, orgUnit: "Operations" },
    { username: "viewer", displayName: "Chris Reed (Viewer)", role: "viewer", hash: testPassword, orgUnit: null as string | null },
    { username: "security.lead", displayName: "Security Lead", role: "mapper", hash: securityHash, orgUnit: null as string | null },
    { username: "compliance.officer", displayName: "Compliance Officer", role: "approver", hash: complianceHash, orgUnit: null as string | null },
    { username: "grc.analyst", displayName: "GRC Analyst", role: "viewer", hash: grcHash, orgUnit: null as string | null },
  ];

  for (const u of testUsers) {
    const ouId = u.orgUnit ? (orgUnitIdMap.get(u.orgUnit) ?? null) : null;
    db.insert(schema.appUsers).values({
      username: u.username,
      displayName: u.displayName,
      passwordHash: u.hash,
      role: u.role,
      assignedOrgUnitId: ouId,
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

  // ─── 13. Default System Settings ───
  db.delete(schema.systemSettings).run();
  const defaultSettings = [
    { key: "project.name", value: "SAP S/4HANA Migration" },
    { key: "project.sourceSystem", value: "SAP ECC" },
    { key: "project.targetSystem", value: "SAP S/4HANA" },
    { key: "project.organization", value: "" },
    { key: "ai.provider", value: "claude" },
    { key: "ai.apiKey", value: "" },
    { key: "ai.model", value: "claude-sonnet-4-20250514" },
    { key: "ai.confidenceThreshold", value: "85" },
    { key: "workflow.autoApprove", value: "false" },
    { key: "workflow.approvalLevels", value: "single" },
    { key: "workflow.sodSeverity.critical", value: "never" },
    { key: "workflow.sodSeverity.high", value: "allowed" },
    { key: "workflow.sodSeverity.medium", value: "allowed" },
    { key: "workflow.sodSeverity.low", value: "allowed" },
  ];
  for (const s of defaultSettings) {
    db.insert(schema.systemSettings).values({
      key: s.key,
      value: s.value,
      updatedBy: "system",
    }).run();
  }
  console.log(`  ✓ ${defaultSettings.length} default system settings`);

  console.log(`  ✓ ${testUsers.length} app users + ${assignments.length} work assignments`);
  console.log("    Credentials:");
  console.log("    sysadmin / sysadmin123 (system_admin — system settings + full access)");
  console.log("    admin / admin123 (admin — full access)");
  console.log("    mapper.finance / test123 (mapper — Finance dept)");
  console.log("    mapper.maintenance / test123 (mapper — Maintenance + Facilities)");
  console.log("    mapper.procurement / test123 (mapper — Procurement + Supply Chain + Warehouse)");
  console.log("    approver.finance / test123 (approver — Finance dept)");
  console.log("    approver.operations / test123 (approver — Maintenance + Facilities + Procurement + Supply Chain + Warehouse)");
  console.log("    viewer / test123 (viewer — read-only)");
  console.log("    security.lead / security123 (mapper — all depts, handles within-role conflicts & role design)");
  console.log("    compliance.officer / compliance123 (approver — all depts, approves risk acceptances & reviews escalated conflicts)");
  console.log("    grc.analyst / grc123 (viewer — all depts, read-only audit & reporting)");

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
    targetPermissions: db.select().from(schema.targetPermissions).all().length,
    targetRolePermissions: db.select().from(schema.targetRolePermissions).all().length,
    userPersonaAssignments: db.select().from(schema.userPersonaAssignments).all().length,
    sodRules: db.select().from(schema.sodRules).all().length,
    userTargetRoleAssignments: db.select().from(schema.userTargetRoleAssignments).all().length,
    sodConflicts: db.select().from(schema.sodConflicts).all().length,
  };
  console.log(counts);
  console.log("\n✅ Seed complete!");

  // Close the database connection so subsequent processes can access it
  sqlite.close();
}

seed();
