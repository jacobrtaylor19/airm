import { z } from "zod";

export const createUserSchema = z.object({
  username: z.string().min(1).max(100),
  displayName: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  email: z.string().email().max(200).optional().nullable(),
  role: z.enum(["system_admin", "admin", "project_manager", "approver", "coordinator", "mapper", "viewer"]),
  assignedOrgUnitId: z.number().int().positive().optional().nullable(),
});

export const updateUserSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  email: z.string().email().max(200).optional().nullable(),
  role: z.enum(["system_admin", "admin", "project_manager", "approver", "coordinator", "mapper", "viewer"]).optional(),
  assignedOrgUnitId: z.number().int().positive().optional().nullable(),
  isActive: z.boolean().optional(),
});

export const settingsSchema = z.record(z.string().max(500), z.string().max(5000));

export const bulkDeleteSchema = z.object({
  entityType: z.string().min(1).max(50),
  ids: z.array(z.number().int().positive()).min(1).max(1000),
});

// Feature flags
export const featureFlagUpsertSchema = z.object({
  key: z.string().min(1, "key is required").max(200),
  description: z.string().max(2000).optional().nullable(),
  enabled: z.boolean({ message: "enabled must be a boolean" }),
  enabledForRoles: z.array(z.string()).optional().nullable(),
  enabledForUsers: z.array(z.number()).optional().nullable(),
  percentage: z.number().min(0).max(100).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const featureFlagDeleteSchema = z.object({
  key: z.string().min(1, "key is required"),
});

// Webhooks
export const webhookCreateSchema = z.object({
  url: z.string().min(1).url().refine((v) => v.startsWith("https://"), { message: "url must be a valid HTTPS URL" }),
  description: z.string().max(2000).optional().nullable(),
  events: z.array(z.string()).min(1, "events must be a non-empty array"),
  enabled: z.boolean().optional().default(true),
});

export const webhookUpdateSchema = z.object({
  id: z.number().int().positive("id is required"),
  url: z.string().url().optional(),
  description: z.string().max(2000).optional().nullable(),
  events: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

export const webhookDeleteSchema = z.object({
  id: z.number().int().positive("id is required"),
});

// Scheduled exports
export const scheduledExportCreateSchema = z.object({
  name: z.string().min(1, "name is required").max(200),
  exportType: z.enum(["excel", "csv_users", "csv_mappings", "csv_sod", "provisioning"], { message: "Invalid export type" }),
  schedule: z.enum(["daily", "weekly", "monthly"], { message: "Invalid schedule" }),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  hour: z.number().int().min(0).max(23).optional().default(6),
  enabled: z.boolean().optional().default(true),
});

export const scheduledExportUpdateSchema = z.object({
  id: z.number().int().positive("id is required"),
  name: z.string().min(1).max(200).optional(),
  schedule: z.enum(["daily", "weekly", "monthly"]).optional(),
  dayOfWeek: z.number().int().min(0).max(6).optional().nullable(),
  dayOfMonth: z.number().int().min(1).max(31).optional().nullable(),
  hour: z.number().int().min(0).max(23).optional(),
  enabled: z.boolean().optional(),
});

export const scheduledExportDeleteSchema = z.object({
  id: z.number().int().positive("id is required"),
});

// Incidents
export const incidentCreateSchema = z.object({
  title: z.string().min(1, "title is required").max(500),
  description: z.string().min(1, "description is required").max(5000),
  severity: z.enum(["critical", "high", "medium", "low"], { message: "severity must be critical, high, medium, or low" }),
  affectedComponent: z.string().max(200).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// Notifications
export const notificationSendSchema = z.object({
  toUserIds: z.array(z.number().int().positive()).min(1, "toUserIds is required"),
  notificationType: z.string().max(50).optional().default("reminder"),
  subject: z.string().min(1, "subject is required").max(500),
  message: z.string().min(1, "message is required").max(5000),
  relatedEntityType: z.string().max(100).optional().nullable(),
  relatedEntityId: z.number().int().optional().nullable(),
});

export const notificationReadSchema = z.object({
  id: z.number().int().positive("id is required"),
});

export const assignmentsSchema = z.object({
  assignments: z.array(
    z.object({
      appUserId: z.number().int().positive(),
      assignmentType: z.string().min(1).max(50),
      scopeType: z.string().min(1).max(50),
      scopeValue: z.string().min(1).max(200),
    })
  ).min(1),
});
