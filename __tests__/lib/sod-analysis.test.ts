import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Sequential result queue ────────────────────────────────────────
// The SOD analysis function makes many sequential DB calls.
// We track calls and return pre-configured results in order.
let selectCallIndex = 0;
const selectResults: unknown[][] = [];

function nextSelectResult() {
  const idx = selectCallIndex++;
  return Promise.resolve(selectResults[idx] ?? []);
}

const mockDeleteWhere = vi.fn().mockResolvedValue(undefined);
const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));
const mockInsertValues = vi.fn().mockResolvedValue(undefined);
const mockInsert = vi.fn(() => ({ values: mockInsertValues }));
const mockUpdateSetWhere = vi.fn().mockResolvedValue(undefined);
const mockUpdateSet = vi.fn(() => ({ where: mockUpdateSetWhere }));
const mockUpdate = vi.fn(() => ({ set: mockUpdateSet }));

// Build a chainable "query builder" mock that is also thenable (awaitable)
function makeQueryBuilder(): unknown {
  const builder: Record<string, unknown> = {};

  // Make a fresh promise for each terminal await
  const resultPromise = () => nextSelectResult();

  // Each chain method returns another builder (also thenable)
  builder.where = vi.fn(() => resultPromise());
  builder.innerJoin = vi.fn(() => {
    // innerJoin returns a new builder that is also thenable
    const inner = makeQueryBuilder();
    return inner;
  });

  // Make the builder itself thenable (for `await db.select().from(table)`)
  builder.then = (resolve: (v: unknown) => void, reject: (e: unknown) => void) => {
    return resultPromise().then(resolve, reject);
  };

  return builder;
}

vi.mock("@/db", () => ({
  db: {
    select: () => ({
      from: () => makeQueryBuilder(),
    }),
    delete: (...args: unknown[]) => {
      mockDelete(...args);
      return { where: mockDeleteWhere };
    },
    insert: (...args: unknown[]) => {
      mockInsert(...args);
      return { values: mockInsertValues };
    },
    update: (...args: unknown[]) => {
      mockUpdate(...args);
      return {
        set: (...sArgs: unknown[]) => {
          mockUpdateSet(...sArgs);
          return { where: mockUpdateSetWhere };
        },
      };
    },
  },
}));

vi.mock("@/db/schema", () => ({
  sodRules: { isActive: "is_active", id: "id" },
  userTargetRoleAssignments: {
    status: "status",
    userId: "user_id",
    targetRoleId: "target_role_id",
    releasePhase: "release_phase",
  },
  targetRolePermissions: { targetRoleId: "target_role_id", targetPermissionId: "target_permission_id" },
  targetPermissions: { id: "id", permissionId: "permission_id" },
  sodConflicts: { userId: "user_id", sodRuleId: "sod_rule_id" },
  userPersonaAssignments: { userId: "user_id" },
}));

vi.mock("drizzle-orm", () => ({
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  inArray: vi.fn((...args: unknown[]) => ({ type: "inArray", args })),
}));

vi.mock("@/lib/settings", () => ({
  getSetting: vi.fn().mockResolvedValue(null),
}));

import { runSodAnalysis } from "@/lib/sod/sod-analysis";
import { inArray } from "drizzle-orm";

describe("runSodAnalysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectCallIndex = 0;
    selectResults.length = 0;
  });

  it("returns zero conflicts when no SOD rules exist", async () => {
    // Call sequence for empty-rules path:
    // 0: sodRules.where(active) → []
    // 1: (update for pending_review → compliance_approved — handled by update mock)
    // 2: db.select().from(assignments) → awaited directly (thenable)
    selectResults.push(
      [],  // 0: no rules
      [],  // 1: totalDraft select (awaited via thenable, no .where)
    );

    const result = await runSodAnalysis();

    expect(result.conflictsFound).toBe(0);
    expect(result.usersWithConflicts).toBe(0);
  });

  it("scoped delete only removes conflicts for analyzed users (not global)", async () => {
    // Call sequence when rules exist (unscoped):
    // 0: sodRules.where(active) → rules
    // 1: assignments.where(pending_review) → draft
    // 2: assignments.where(existing) → existing
    // 3: trps via .innerJoin().innerJoin() → thenable → permissions
    selectResults.push(
      [{ id: 1, permissionA: "CREATE_PO", permissionB: "APPROVE_PO", severity: "high" }],
      [
        { userId: 10, targetRoleId: 100, status: "pending_review" },
        { userId: 20, targetRoleId: 200, status: "pending_review" },
      ],
      [], // no existing
      [], // no permissions → no conflicts
    );

    const result = await runSodAnalysis();

    expect(mockDelete).toHaveBeenCalled();
    expect(inArray).toHaveBeenCalled();
    expect(result.usersAnalyzed).toBe(2);
  });

  it("does NOT call delete when no users have draft assignments", async () => {
    selectResults.push(
      [{ id: 1, permissionA: "A", permissionB: "B", severity: "low" }],
      [], // no draft
      [], // no existing
      [], // no permissions
    );

    const result = await runSodAnalysis();

    expect(mockDelete).not.toHaveBeenCalled();
    expect(result.usersAnalyzed).toBe(0);
    expect(result.conflictsFound).toBe(0);
  });

  it("detects conflicts when user has conflicting permissions across roles", async () => {
    selectResults.push(
      [{ id: 1, permissionA: "CREATE_PO", permissionB: "APPROVE_PO", severity: "critical" }],
      [
        { userId: 10, targetRoleId: 100, status: "pending_review" },
        { userId: 10, targetRoleId: 200, status: "pending_review" },
      ],
      [],
      [
        { roleId: 100, permissionId: "CREATE_PO" },
        { roleId: 200, permissionId: "APPROVE_PO" },
      ],
    );

    const result = await runSodAnalysis();

    expect(result.conflictsFound).toBe(1);
    expect(result.usersWithConflicts).toBe(1);
    expect(result.usersClean).toBe(0);
    expect(result.usersAnalyzed).toBe(1);
    expect(mockInsert).toHaveBeenCalled();
  });

  it("marks clean users as compliance_approved", async () => {
    selectResults.push(
      [{ id: 1, permissionA: "X", permissionB: "Y", severity: "low" }],
      [{ userId: 10, targetRoleId: 100, status: "pending_review" }],
      [],
      [], // no matching permissions
    );

    const result = await runSodAnalysis();

    expect(result.usersClean).toBe(1);
    expect(result.conflictsFound).toBe(0);
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "compliance_approved" })
    );
  });

  it("marks conflicted users as sod_rejected", async () => {
    selectResults.push(
      [{ id: 1, permissionA: "PO_CREATE", permissionB: "PO_APPROVE", severity: "high" }],
      [
        { userId: 10, targetRoleId: 100, status: "pending_review" },
        { userId: 10, targetRoleId: 200, status: "pending_review" },
      ],
      [],
      [
        { roleId: 100, permissionId: "PO_CREATE" },
        { roleId: 200, permissionId: "PO_APPROVE" },
      ],
    );

    await runSodAnalysis();

    expect(mockUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "sod_rejected" })
    );
  });

  it("handles multiple users with mixed results", async () => {
    selectResults.push(
      [{ id: 1, permissionA: "A", permissionB: "B", severity: "medium" }],
      [
        { userId: 10, targetRoleId: 100, status: "pending_review" },
        { userId: 20, targetRoleId: 200, status: "pending_review" },
        { userId: 20, targetRoleId: 201, status: "pending_review" },
      ],
      [],
      [
        { roleId: 200, permissionId: "A" },
        { roleId: 201, permissionId: "B" },
      ],
    );

    const result = await runSodAnalysis();

    expect(result.usersAnalyzed).toBe(2);
    expect(result.conflictsFound).toBe(1);
    expect(result.usersWithConflicts).toBe(1);
    expect(result.usersClean).toBe(1);
  });

  it("detects within-role conflicts when same role has both permissions", async () => {
    selectResults.push(
      [{ id: 1, permissionA: "READ", permissionB: "WRITE", severity: "low" }],
      [{ userId: 10, targetRoleId: 100, status: "pending_review" }],
      [],
      [
        { roleId: 100, permissionId: "READ" },
        { roleId: 100, permissionId: "WRITE" },
      ],
    );

    const result = await runSodAnalysis();

    expect(result.conflictsFound).toBe(1);
    expect(mockInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ conflictType: "within_role" })
    );
  });
});
