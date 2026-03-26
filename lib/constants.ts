/**
 * Centralized constants — eliminates magic numbers scattered across the codebase.
 * Change values here rather than hunting through individual files.
 */

export const AUTH = {
  /** Maximum failed login attempts before lockout */
  MAX_LOGIN_ATTEMPTS: 5,
  /** Lockout duration in milliseconds (5 minutes) */
  LOCKOUT_DURATION_MS: 5 * 60 * 1000,
  /** Session cookie duration in milliseconds (24 hours) */
  SESSION_DURATION_MS: 24 * 60 * 60 * 1000,
  /** Session cookie max age in seconds (24 hours) */
  SESSION_MAX_AGE_SECONDS: 24 * 60 * 60,
  /** bcrypt hash rounds */
  BCRYPT_ROUNDS: 12,
  /** Session cookie name */
  COOKIE_NAME: "airm_session",
} as const;

export const RATE_LIMITS = {
  /** Global IP rate limit — high threshold, secondary defense only */
  LOGIN_LIMIT: 50,
  /** Login rate limit window in ms (1 minute) */
  LOGIN_WINDOW_MS: 60 * 1000,
  /** AI endpoint requests per user within the window */
  AI_LIMIT: 10,
  /** AI rate limit window in ms (1 minute) */
  AI_WINDOW_MS: 60 * 1000,
  /** Bulk operation requests per user within the window */
  BULK_LIMIT: 5,
  /** Bulk rate limit window in ms (1 minute) */
  BULK_WINDOW_MS: 60 * 1000,
} as const;

export const AI = {
  /** Batch size for concurrent persona/mapping processing */
  BATCH_SIZE: 5,
  /** Confidence score below which assignments are flagged as "low confidence" */
  LOW_CONFIDENCE_THRESHOLD: 65,
} as const;

export const WORKFLOW = {
  /** Assignment statuses that can be approved */
  APPROVABLE_STATUSES: ["ready_for_approval", "compliance_approved", "sod_risk_accepted"] as readonly string[],
  /** Statuses that can be submitted for review */
  SUBMITTABLE_STATUSES: ["draft"] as readonly string[],
  /** Statuses that SOD analysis operates on */
  SOD_ANALYZABLE_STATUSES: ["pending_review"] as readonly string[],
  /** Statuses where role assignments can be edited */
  EDITABLE_STATUSES: ["draft"] as readonly string[],
  /** Over-provisioning threshold default (%) */
  DEFAULT_LEAST_ACCESS_THRESHOLD: 30,
} as const;

/** Roles allowed to perform admin operations */
export const ADMIN_ROLES = ["admin", "system_admin"] as const;

/** Roles allowed to map personas to target roles */
export const MAPPER_ROLES = ["mapper", "admin", "system_admin"] as const;

/** Roles allowed to send notifications/reminders */
export const NOTIFICATION_SENDER_ROLES = ["admin", "system_admin", "coordinator"] as const;
