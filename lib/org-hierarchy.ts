import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface OrgUnit {
  id: number;
  name: string;
  level: string;
  parentId: number | null;
  description: string | null;
}

export interface OrgTreeNode extends OrgUnit {
  children: OrgTreeNode[];
  userCount: number;
  assignedMapper: string | null;
  assignedApprover: string | null;
}

// ─────────────────────────────────────────────
// Basic queries
// ─────────────────────────────────────────────

export async function getOrgUnit(id: number): Promise<OrgUnit | null> {
  const [row] = await db.select().from(schema.orgUnits).where(eq(schema.orgUnits.id, id));
  return row ?? null;
}

export async function getAllOrgUnits(): Promise<OrgUnit[]> {
  return await db.select().from(schema.orgUnits);
}

// ─────────────────────────────────────────────
// Tree construction
// ─────────────────────────────────────────────

export async function getOrgTree(): Promise<OrgTreeNode[]> {
  const allUnits = await getAllOrgUnits();
  if (allUnits.length === 0) return [];

  // Get user counts per org unit
  const userCounts = new Map<number, number>();
  const userRows = await db.select({
    orgUnitId: schema.users.orgUnitId,
  }).from(schema.users);
  for (const u of userRows) {
    if (u.orgUnitId) {
      userCounts.set(u.orgUnitId, (userCounts.get(u.orgUnitId) || 0) + 1);
    }
  }

  // Get assigned mappers/approvers per org unit
  const appUserAssignments = await db.select({
    id: schema.appUsers.id,
    displayName: schema.appUsers.displayName,
    role: schema.appUsers.role,
    assignedOrgUnitId: schema.appUsers.assignedOrgUnitId,
  }).from(schema.appUsers);

  const mapperByOu = new Map<number, string>();
  const approverByOu = new Map<number, string>();
  for (const au of appUserAssignments) {
    if (au.assignedOrgUnitId) {
      if (au.role === "mapper") mapperByOu.set(au.assignedOrgUnitId, au.displayName);
      if (au.role === "approver") approverByOu.set(au.assignedOrgUnitId, au.displayName);
    }
  }

  // Build tree nodes
  const nodeMap = new Map<number, OrgTreeNode>();
  for (const unit of allUnits) {
    nodeMap.set(unit.id, {
      ...unit,
      children: [],
      userCount: userCounts.get(unit.id) || 0,
      assignedMapper: mapperByOu.get(unit.id) || null,
      assignedApprover: approverByOu.get(unit.id) || null,
    });
  }

  // Link children
  const roots: OrgTreeNode[] = [];
  nodeMap.forEach((node) => {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else if (!node.parentId) {
      roots.push(node);
    }
  });

  // Propagate user counts upward
  function sumUsers(node: OrgTreeNode): number {
    let total = node.userCount;
    for (const child of node.children) {
      total += sumUsers(child);
    }
    node.userCount = total;
    return total;
  }
  for (const root of roots) {
    sumUsers(root);
  }

  return roots;
}

// ─────────────────────────────────────────────
// Descendant resolution
// ─────────────────────────────────────────────

/**
 * Returns all descendant org unit IDs (inclusive of the given orgUnitId).
 * If assigned to L1, returns all L2 and L3 children.
 * If assigned to L2, returns all L3 children.
 */
export async function getDescendantOrgUnitIds(orgUnitId: number): Promise<number[]> {
  const allUnits = await getAllOrgUnits();
  const childMap = new Map<number, number[]>();
  for (const u of allUnits) {
    if (u.parentId) {
      if (!childMap.has(u.parentId)) childMap.set(u.parentId, []);
      childMap.get(u.parentId)!.push(u.id);
    }
  }

  const result: number[] = [orgUnitId];
  const queue = [orgUnitId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const children = childMap.get(current) || [];
    for (const childId of children) {
      result.push(childId);
      queue.push(childId);
    }
  }

  return result;
}

/**
 * Returns all user IDs within the org scope of a given org unit.
 * This includes all users in the org unit itself and all descendant org units.
 */
export async function getUsersInOrgScope(orgUnitId: number): Promise<number[]> {
  const ouIds = await getDescendantOrgUnitIds(orgUnitId);
  if (ouIds.length === 0) return [];

  const users = await db.select({ id: schema.users.id })
    .from(schema.users)
    .where(inArray(schema.users.orgUnitId, ouIds));

  return users.map(u => u.id);
}

/**
 * Returns the list of department names within the org scope.
 */
export async function getDepartmentsInOrgScope(orgUnitId: number): Promise<string[]> {
  const ouIds = await getDescendantOrgUnitIds(orgUnitId);
  const allUnits = await getAllOrgUnits();
  return allUnits
    .filter(u => ouIds.includes(u.id))
    .map(u => u.name);
}
