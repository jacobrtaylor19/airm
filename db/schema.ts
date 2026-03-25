import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// ORG UNITS (organizational hierarchy L1/L2/L3)
// ─────────────────────────────────────────────

export const orgUnits = sqliteTable("org_units", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  level: text("level").notNull(), // "L1", "L2", "L3"
  parentId: integer("parent_id"),
  description: text("description"),
});

// ─────────────────────────────────────────────
// USERS (source system users, normalized)
// ─────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceUserId: text("source_user_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  department: text("department"),
  jobTitle: text("job_title"),
  orgUnit: text("org_unit"),
  orgUnitId: integer("org_unit_id"),
  costCenter: text("cost_center"),
  userType: text("user_type").default("standard"),
  metadata: text("metadata"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// SOURCE ROLES (legacy system roles)
// ─────────────────────────────────────────────

export const sourceRoles = sqliteTable("source_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roleId: text("role_id").notNull().unique(),
  roleName: text("role_name").notNull(),
  description: text("description"),
  system: text("system").default("SAP ECC"),
  domain: text("domain"),
  roleType: text("role_type"),
  roleOwner: text("role_owner"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// SOURCE PERMISSIONS (T-codes, functions, etc.)
// ─────────────────────────────────────────────

export const sourcePermissions = sqliteTable("source_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  permissionId: text("permission_id").notNull().unique(),
  permissionName: text("permission_name"),
  description: text("description"),
  system: text("system").default("SAP ECC"),
  permissionType: text("permission_type"),
  riskLevel: text("risk_level"),
});

// ─────────────────────────────────────────────
// SOURCE ROLE ↔ PERMISSION (junction)
// ─────────────────────────────────────────────

export const sourceRolePermissions = sqliteTable("source_role_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sourceRoleId: integer("source_role_id").notNull().references(() => sourceRoles.id, { onDelete: "cascade" }),
  sourcePermissionId: integer("source_permission_id").notNull().references(() => sourcePermissions.id, { onDelete: "cascade" }),
});

// ─────────────────────────────────────────────
// USER ↔ SOURCE ROLE ASSIGNMENTS
// ─────────────────────────────────────────────

export const userSourceRoleAssignments = sqliteTable("user_source_role_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sourceRoleId: integer("source_role_id").notNull().references(() => sourceRoles.id, { onDelete: "cascade" }),
  assignedDate: text("assigned_date"),
});

// ─────────────────────────────────────────────
// CONSOLIDATED GROUPS (high-level security groups)
// ─────────────────────────────────────────────

export const consolidatedGroups = sqliteTable("consolidated_groups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  accessLevel: text("access_level"),
  domain: text("domain"),
  sortOrder: integer("sort_order"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// PERSONAS (security personas — AI-generated or manually uploaded)
// ─────────────────────────────────────────────

export const personas = sqliteTable("personas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  description: text("description"),
  businessFunction: text("business_function"),
  consolidatedGroupId: integer("consolidated_group_id").references(() => consolidatedGroups.id),
  source: text("source").notNull().default("ai"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// PERSONA ↔ SOURCE PERMISSION (characteristic permissions)
// ─────────────────────────────────────────────

export const personaSourcePermissions = sqliteTable("persona_source_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  sourcePermissionId: integer("source_permission_id").notNull().references(() => sourcePermissions.id, { onDelete: "cascade" }),
  weight: real("weight").default(1.0),
  isRequired: integer("is_required", { mode: "boolean" }).default(false),
});

// ─────────────────────────────────────────────
// USER-PERSONA ASSIGNMENTS (AI output or manual)
// ─────────────────────────────────────────────

export const userPersonaAssignments = sqliteTable("user_persona_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  personaId: integer("persona_id").references(() => personas.id),
  consolidatedGroupId: integer("consolidated_group_id").references(() => consolidatedGroups.id),
  confidenceScore: real("confidence_score"),
  aiReasoning: text("ai_reasoning"),
  aiModel: text("ai_model"),
  assignmentMethod: text("assignment_method"),
  jobRunId: integer("job_run_id").references(() => processingJobs.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// TARGET ROLES (future system roles)
// ─────────────────────────────────────────────

export const targetRoles = sqliteTable("target_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  roleId: text("role_id").notNull().unique(),
  roleName: text("role_name").notNull(),
  description: text("description"),
  system: text("system").default("S/4HANA"),
  domain: text("domain"),
  capabilities: text("capabilities"),
  roleOwner: text("role_owner"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// TARGET PERMISSIONS (future system permissions / Fiori apps)
// ─────────────────────────────────────────────

export const targetPermissions = sqliteTable("target_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  permissionId: text("permission_id").notNull().unique(),
  permissionName: text("permission_name"),
  description: text("description"),
  system: text("system").default("S/4HANA"),
  permissionType: text("permission_type"),
  riskLevel: text("risk_level"),
});

// ─────────────────────────────────────────────
// TARGET TASK ROLES (Tier 2 — focused permission bundles)
// ─────────────────────────────────────────────

export const targetTaskRoles = sqliteTable("target_task_roles", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  taskRoleId: text("task_role_id").notNull().unique(),
  taskRoleName: text("task_role_name").notNull(),
  description: text("description"),
  system: text("system").default("S/4HANA"),
  domain: text("domain"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// TARGET TASK ROLE ↔ PERMISSION (Tier 2 → Tier 1)
// ─────────────────────────────────────────────

export const targetTaskRolePermissions = sqliteTable("target_task_role_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetTaskRoleId: integer("target_task_role_id").notNull().references(() => targetTaskRoles.id, { onDelete: "cascade" }),
  targetPermissionId: integer("target_permission_id").notNull().references(() => targetPermissions.id, { onDelete: "cascade" }),
});

// ─────────────────────────────────────────────
// TARGET SECURITY ROLE ↔ TASK ROLE (Tier 3 → Tier 2)
// ─────────────────────────────────────────────

export const targetSecurityRoleTasks = sqliteTable("target_security_role_tasks", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetRoleId: integer("target_role_id").notNull().references(() => targetRoles.id, { onDelete: "cascade" }),
  targetTaskRoleId: integer("target_task_role_id").notNull().references(() => targetTaskRoles.id, { onDelete: "cascade" }),
});

// ─────────────────────────────────────────────
// TARGET ROLE ↔ PERMISSION (direct, Tier 3 → Tier 1)
// ─────────────────────────────────────────────

export const targetRolePermissions = sqliteTable("target_role_permissions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  targetRoleId: integer("target_role_id").notNull().references(() => targetRoles.id, { onDelete: "cascade" }),
  targetPermissionId: integer("target_permission_id").notNull().references(() => targetPermissions.id, { onDelete: "cascade" }),
});

// ─────────────────────────────────────────────
// PERSONA ↔ TARGET ROLE MAPPINGS
// ─────────────────────────────────────────────

export const personaTargetRoleMappings = sqliteTable("persona_target_role_mappings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  targetRoleId: integer("target_role_id").notNull().references(() => targetRoles.id, { onDelete: "cascade" }),
  mappingReason: text("mapping_reason"),
  coveragePercent: real("coverage_percent"),
  excessPercent: real("excess_percent"),
  confidence: text("confidence"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// RELEASES (top-level migration wave/project)
// ─────────────────────────────────────────────

export const releases = sqliteTable("releases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),                                     // e.g. "Wave 1 — Finance Go-Live"
  description: text("description"),
  status: text("status").notNull().default("planning"),              // planning | in_progress | approved | completed | archived
  releaseType: text("release_type").notNull().default("initial"),    // initial | incremental | remediation
  targetSystem: text("target_system"),                               // SAP S/4HANA | Oracle Cloud | Workday | etc.
  targetDate: text("target_date"),                                   // ISO date string
  completedDate: text("completed_date"),
  isActive: integer("is_active", { mode: "boolean" }).default(true), // the currently "open" wave new assignments belong to
  createdBy: text("created_by"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// USER ↔ TARGET ROLE ASSIGNMENTS
// ─────────────────────────────────────────────

export const userTargetRoleAssignments = sqliteTable("user_target_role_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  targetRoleId: integer("target_role_id").notNull().references(() => targetRoles.id),
  releaseId: integer("release_id").references(() => releases.id),   // null = legacy / pre-release tracking
  derivedFromPersonaId: integer("derived_from_persona_id").references(() => personas.id),
  assignmentType: text("assignment_type").notNull().default("persona_default"),
  status: text("status").notNull().default("draft"),
  releasePhase: text("release_phase").notNull().default("current"), // "existing" = previous wave (locked), "current" = this wave (editable)
  sodConflictCount: integer("sod_conflict_count").default(0),
  riskAcceptedBy: text("risk_accepted_by"),
  riskAcceptedAt: text("risk_accepted_at"),
  riskJustification: text("risk_justification"),
  approvedBy: text("approved_by"),
  approvedAt: text("approved_at"),
  sentBackReason: text("sent_back_reason"),
  mappedBy: text("mapped_by"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// SOD RULES (segregation of duties ruleset)
// ─────────────────────────────────────────────

export const sodRules = sqliteTable("sod_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ruleId: text("rule_id").notNull().unique(),
  ruleName: text("rule_name").notNull(),
  description: text("description"),
  permissionA: text("permission_a").notNull(),
  permissionB: text("permission_b").notNull(),
  severity: text("severity").notNull().default("medium"),
  riskDescription: text("risk_description"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// SOD CONFLICTS (detected violations)
// ─────────────────────────────────────────────

export const sodConflicts = sqliteTable("sod_conflicts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  sodRuleId: integer("sod_rule_id").notNull().references(() => sodRules.id, { onDelete: "cascade" }),
  roleIdA: integer("role_id_a").references(() => targetRoles.id),
  roleIdB: integer("role_id_b").references(() => targetRoles.id),
  permissionIdA: text("permission_id_a"),
  permissionIdB: text("permission_id_b"),
  severity: text("severity").notNull(),
  conflictType: text("conflict_type").notNull().default("between_role"), // "between_role" or "within_role"
  resolutionStatus: text("resolution_status").notNull().default("open"),
  resolvedBy: text("resolved_by"),
  resolvedAt: text("resolved_at"),
  resolutionNotes: text("resolution_notes"),
  riskExplanation: text("risk_explanation"),
  analysisJobId: integer("analysis_job_id").references(() => processingJobs.id),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// PERMISSION GAPS
// ─────────────────────────────────────────────

export const permissionGaps = sqliteTable("permission_gaps", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  personaId: integer("persona_id").notNull().references(() => personas.id, { onDelete: "cascade" }),
  sourcePermissionId: integer("source_permission_id").notNull().references(() => sourcePermissions.id),
  gapType: text("gap_type").notNull().default("no_coverage"),
  notes: text("notes"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// PROCESSING JOBS
// ─────────────────────────────────────────────

export const processingJobs = sqliteTable("processing_jobs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobType: text("job_type").notNull(),
  status: text("status").notNull().default("queued"),
  totalRecords: integer("total_records").default(0),
  processed: integer("processed").default(0),
  failed: integer("failed").default(0),
  config: text("config"),
  errorLog: text("error_log"),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// AUDIT LOG
// ─────────────────────────────────────────────

export const auditLog = sqliteTable("audit_log", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  entityType: text("entity_type").notNull(),
  entityId: integer("entity_id").notNull(),
  action: text("action").notNull(),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  actorEmail: text("actor_email"),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// SYSTEM SETTINGS (key-value configuration store)
// ─────────────────────────────────────────────

export const systemSettings = sqliteTable("system_settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedBy: text("updated_by"),
});

// ─────────────────────────────────────────────
// APP USERS (tool users — mappers, approvers, admins)
// ─────────────────────────────────────────────

export const appUsers = sqliteTable("app_users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  username: text("username").notNull().unique(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("viewer"),
  assignedOrgUnitId: integer("assigned_org_unit_id"),
  isActive: integer("is_active", { mode: "boolean" }).default(true),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// APP USER SESSIONS
// ─────────────────────────────────────────────

export const appUserSessions = sqliteTable("app_user_sessions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  sessionToken: text("session_token").notNull().unique(),
  appUserId: integer("app_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

// ─────────────────────────────────────────────
// WORK ASSIGNMENTS (mapper/approver → department/user)
// ─────────────────────────────────────────────

export const workAssignments = sqliteTable("work_assignments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appUserId: integer("app_user_id").notNull().references(() => appUsers.id, { onDelete: "cascade" }),
  assignmentType: text("assignment_type").notNull(),
  scopeType: text("scope_type").notNull(),
  scopeValue: text("scope_value").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});


// ═══════════════════════════════════════════════
// RELATIONS (for Drizzle query builder)
// ═══════════════════════════════════════════════

export const orgUnitsRelations = relations(orgUnits, ({ one, many }) => ({
  parent: one(orgUnits, { fields: [orgUnits.parentId], references: [orgUnits.id], relationName: "parentChild" }),
  children: many(orgUnits, { relationName: "parentChild" }),
  users: many(users),
  assignedAppUsers: many(appUsers),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  orgUnitRef: one(orgUnits, { fields: [users.orgUnitId], references: [orgUnits.id] }),
  sourceRoleAssignments: many(userSourceRoleAssignments),
  personaAssignments: many(userPersonaAssignments),
  targetRoleAssignments: many(userTargetRoleAssignments),
  sodConflicts: many(sodConflicts),
}));

export const sourceRolesRelations = relations(sourceRoles, ({ many }) => ({
  userAssignments: many(userSourceRoleAssignments),
  permissions: many(sourceRolePermissions),
}));

export const sourcePermissionsRelations = relations(sourcePermissions, ({ many }) => ({
  roleAssignments: many(sourceRolePermissions),
  personaPermissions: many(personaSourcePermissions),
  gaps: many(permissionGaps),
}));

export const sourceRolePermissionsRelations = relations(sourceRolePermissions, ({ one }) => ({
  sourceRole: one(sourceRoles, { fields: [sourceRolePermissions.sourceRoleId], references: [sourceRoles.id] }),
  sourcePermission: one(sourcePermissions, { fields: [sourceRolePermissions.sourcePermissionId], references: [sourcePermissions.id] }),
}));

export const userSourceRoleAssignmentsRelations = relations(userSourceRoleAssignments, ({ one }) => ({
  user: one(users, { fields: [userSourceRoleAssignments.userId], references: [users.id] }),
  sourceRole: one(sourceRoles, { fields: [userSourceRoleAssignments.sourceRoleId], references: [sourceRoles.id] }),
}));

export const consolidatedGroupsRelations = relations(consolidatedGroups, ({ many }) => ({
  personas: many(personas),
  assignments: many(userPersonaAssignments),
}));

export const personasRelations = relations(personas, ({ one, many }) => ({
  consolidatedGroup: one(consolidatedGroups, { fields: [personas.consolidatedGroupId], references: [consolidatedGroups.id] }),
  sourcePermissions: many(personaSourcePermissions),
  userAssignments: many(userPersonaAssignments),
  targetRoleMappings: many(personaTargetRoleMappings),
  permissionGaps: many(permissionGaps),
}));

export const personaSourcePermissionsRelations = relations(personaSourcePermissions, ({ one }) => ({
  persona: one(personas, { fields: [personaSourcePermissions.personaId], references: [personas.id] }),
  sourcePermission: one(sourcePermissions, { fields: [personaSourcePermissions.sourcePermissionId], references: [sourcePermissions.id] }),
}));

export const userPersonaAssignmentsRelations = relations(userPersonaAssignments, ({ one }) => ({
  user: one(users, { fields: [userPersonaAssignments.userId], references: [users.id] }),
  persona: one(personas, { fields: [userPersonaAssignments.personaId], references: [personas.id] }),
  consolidatedGroup: one(consolidatedGroups, { fields: [userPersonaAssignments.consolidatedGroupId], references: [consolidatedGroups.id] }),
  job: one(processingJobs, { fields: [userPersonaAssignments.jobRunId], references: [processingJobs.id] }),
}));

export const targetRolesRelations = relations(targetRoles, ({ many }) => ({
  directPermissions: many(targetRolePermissions),
  taskRoles: many(targetSecurityRoleTasks),
  personaMappings: many(personaTargetRoleMappings),
  userAssignments: many(userTargetRoleAssignments),
}));

export const targetTaskRolesRelations = relations(targetTaskRoles, ({ many }) => ({
  permissions: many(targetTaskRolePermissions),
  securityRoles: many(targetSecurityRoleTasks),
}));

export const targetTaskRolePermissionsRelations = relations(targetTaskRolePermissions, ({ one }) => ({
  targetTaskRole: one(targetTaskRoles, { fields: [targetTaskRolePermissions.targetTaskRoleId], references: [targetTaskRoles.id] }),
  targetPermission: one(targetPermissions, { fields: [targetTaskRolePermissions.targetPermissionId], references: [targetPermissions.id] }),
}));

export const targetSecurityRoleTasksRelations = relations(targetSecurityRoleTasks, ({ one }) => ({
  targetRole: one(targetRoles, { fields: [targetSecurityRoleTasks.targetRoleId], references: [targetRoles.id] }),
  targetTaskRole: one(targetTaskRoles, { fields: [targetSecurityRoleTasks.targetTaskRoleId], references: [targetTaskRoles.id] }),
}));

export const targetPermissionsRelations = relations(targetPermissions, ({ many }) => ({
  directRoleAssignments: many(targetRolePermissions),
  taskRoleAssignments: many(targetTaskRolePermissions),
}));

export const targetRolePermissionsRelations = relations(targetRolePermissions, ({ one }) => ({
  targetRole: one(targetRoles, { fields: [targetRolePermissions.targetRoleId], references: [targetRoles.id] }),
  targetPermission: one(targetPermissions, { fields: [targetRolePermissions.targetPermissionId], references: [targetPermissions.id] }),
}));

export const personaTargetRoleMappingsRelations = relations(personaTargetRoleMappings, ({ one }) => ({
  persona: one(personas, { fields: [personaTargetRoleMappings.personaId], references: [personas.id] }),
  targetRole: one(targetRoles, { fields: [personaTargetRoleMappings.targetRoleId], references: [targetRoles.id] }),
}));

export const releasesRelations = relations(releases, ({ many }) => ({
  assignments: many(userTargetRoleAssignments),
}));

export const userTargetRoleAssignmentsRelations = relations(userTargetRoleAssignments, ({ one }) => ({
  user: one(users, { fields: [userTargetRoleAssignments.userId], references: [users.id] }),
  targetRole: one(targetRoles, { fields: [userTargetRoleAssignments.targetRoleId], references: [targetRoles.id] }),
  derivedFromPersona: one(personas, { fields: [userTargetRoleAssignments.derivedFromPersonaId], references: [personas.id] }),
  release: one(releases, { fields: [userTargetRoleAssignments.releaseId], references: [releases.id] }),
}));

export const sodRulesRelations = relations(sodRules, ({ many }) => ({
  conflicts: many(sodConflicts),
}));

export const sodConflictsRelations = relations(sodConflicts, ({ one }) => ({
  user: one(users, { fields: [sodConflicts.userId], references: [users.id] }),
  sodRule: one(sodRules, { fields: [sodConflicts.sodRuleId], references: [sodRules.id] }),
  roleA: one(targetRoles, { fields: [sodConflicts.roleIdA], references: [targetRoles.id] }),
  analysisJob: one(processingJobs, { fields: [sodConflicts.analysisJobId], references: [processingJobs.id] }),
}));

export const permissionGapsRelations = relations(permissionGaps, ({ one }) => ({
  persona: one(personas, { fields: [permissionGaps.personaId], references: [personas.id] }),
  sourcePermission: one(sourcePermissions, { fields: [permissionGaps.sourcePermissionId], references: [sourcePermissions.id] }),
}));

export const appUsersRelations = relations(appUsers, ({ one, many }) => ({
  assignedOrgUnit: one(orgUnits, { fields: [appUsers.assignedOrgUnitId], references: [orgUnits.id] }),
  sessions: many(appUserSessions),
  workAssignments: many(workAssignments),
}));

export const appUserSessionsRelations = relations(appUserSessions, ({ one }) => ({
  appUser: one(appUsers, { fields: [appUserSessions.appUserId], references: [appUsers.id] }),
}));

export const workAssignmentsRelations = relations(workAssignments, ({ one }) => ({
  appUser: one(appUsers, { fields: [workAssignments.appUserId], references: [appUsers.id] }),
}));
