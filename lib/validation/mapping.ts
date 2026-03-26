import { z } from "zod";

export const bulkAssignSchema = z.object({
  personaIds: z.array(z.number().int().positive()).min(1).max(500),
  targetRoleId: z.number().int().positive(),
});

export const sodAcceptRiskSchema = z.object({
  conflictId: z.number().int().positive(),
  justification: z.string().min(1, "Justification is required").max(2000),
});

export const sodEscalateSchema = z.object({
  conflictId: z.number().int().positive(),
  reason: z.string().min(1).max(2000).optional(),
});

export const sodFixMappingSchema = z.object({
  conflictId: z.number().int().positive(),
  resolution: z.string().min(1).max(2000).optional(),
});

export const personaConfirmSchema = z.object({
  orgUnitId: z.number().int().positive(),
});

export const refinementSaveSchema = z.object({
  personaId: z.number().int().positive(),
  changes: z.record(z.string(), z.unknown()),
});
