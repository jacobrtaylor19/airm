import { describe, it, expect } from "vitest";
import { generateStrapline, type StraplineResult } from "@/lib/strapline";

function emptyStats() {
  return {
    totalUsers: 0,
    totalPersonas: 0,
    usersWithPersona: 0,
    personasWithMapping: 0,
    totalAssignments: 0,
    approvedAssignments: 0,
    readyForApproval: 0,
    pendingReview: 0,
    draftAssignments: 0,
    sodRulesCount: 0,
    sodConflictsBySeverity: [],
    lowConfidence: 0,
  };
}

function fullStats() {
  return {
    totalUsers: 100,
    totalPersonas: 10,
    usersWithPersona: 100,
    personasWithMapping: 10,
    totalAssignments: 50,
    approvedAssignments: 45,
    readyForApproval: 0,
    pendingReview: 0,
    draftAssignments: 0,
    sodRulesCount: 20,
    sodConflictsBySeverity: [],
    lowConfidence: 0,
  };
}

function partialStats() {
  return {
    totalUsers: 100,
    totalPersonas: 10,
    usersWithPersona: 60,
    personasWithMapping: 5,
    totalAssignments: 30,
    approvedAssignments: 10,
    readyForApproval: 5,
    pendingReview: 3,
    draftAssignments: 2,
    sodRulesCount: 20,
    sodConflictsBySeverity: [{ severity: "critical", count: 3 }],
    lowConfidence: 2,
  };
}

describe("generateStrapline", () => {
  it("returns neutral tone with guidance for zero stats (fresh project)", () => {
    const result = generateStrapline(emptyStats(), "admin", null, "Admin");
    expect(result.tone).toBe("neutral");
    expect(result.project).toContain("No data loaded");
    expect(result.area).toBeNull();
  });

  it("returns positive tone for near-complete project (admin)", () => {
    const result = generateStrapline(fullStats(), "admin", null, "Admin");
    expect(result.tone).toBe("positive");
    expect(result.project).toContain("Final stretch");
  });

  it("shows blockers for partial completion (admin)", () => {
    const result = generateStrapline(partialStats(), "admin", null, "Admin");
    expect(result.project).toContain("Blockers");
    expect(["warning", "action"]).toContain(result.tone);
  });

  it("returns action tone for mapper with unmapped personas", () => {
    const stats = partialStats();
    const result = generateStrapline(stats, "mapper", null, "Mapper");
    expect(result.tone).toBe("action");
    expect(result.project).toContain("persona");
  });

  it("returns action tone for approver with items ready for review", () => {
    const stats = partialStats();
    const result = generateStrapline(stats, "approver", null, "Approver");
    expect(result.tone).toBe("action");
    expect(result.project).toContain("ready for your review");
  });

  it("returns area strapline for coordinator with scoped stats", () => {
    const stats = partialStats();
    const scopedStats = {
      deptCount: 3,
      userCount: 25,
      mappedPersonaCount: 4,
      totalPersonaCount: 8,
      pendingApprovals: 2,
    };
    const result = generateStrapline(stats, "coordinator", scopedStats, "Coord");
    expect(result.area).not.toBeNull();
    expect(result.area).toContain("department");
  });

  it("returns null area for viewer (no scoped stats)", () => {
    const result = generateStrapline(partialStats(), "viewer", null, "Viewer");
    expect(result.area).toBeNull();
    expect(result.tone).toBe("neutral");
  });
});
