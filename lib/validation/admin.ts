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
