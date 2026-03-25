# Release Scoping — Sprint 3 Design Spec

**Status:** Planned (Sprint 3)
**Author:** Claude + Jacob
**Date:** 2026-03-26

---

## Problem

Currently, all data in Provisum is displayed globally — there is no way to filter by release/wave. The schema has partial support (junction tables for users ↔ releases and org-units ↔ releases) but:

1. No queries filter by release
2. Source roles, target roles, and SOD rules have no release association
3. No UI selector to switch between releases
4. App users (coordinators, mappers, approvers) cannot be scoped to specific releases

## Data Hierarchy

```
Project
└── Release (Wave)
    ├── Users (many-to-many: a user can be in multiple releases)
    ├── Source Roles (many-to-many)
    ├── Target Roles (many-to-many)
    ├── SOD Rules (many-to-many)
    ├── Personas (generated per release context)
    ├── Mappings (scoped to release)
    └── Approvals (scoped to release)
```

## Schema Changes Required

### New Junction Tables

```sql
-- Source roles can apply to one or more releases
CREATE TABLE release_source_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  source_role_id INTEGER NOT NULL REFERENCES source_roles(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(release_id, source_role_id)
);

-- Target roles can apply to one or more releases
CREATE TABLE release_target_roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  target_role_id INTEGER NOT NULL REFERENCES target_roles(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(release_id, target_role_id)
);

-- SOD rules can apply to one or more releases
CREATE TABLE release_sod_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  sod_rule_id INTEGER NOT NULL REFERENCES sod_rules(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(release_id, sod_rule_id)
);

-- App users (mappers, approvers, coordinators) assigned to releases
CREATE TABLE app_user_releases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  app_user_id INTEGER NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  release_id INTEGER NOT NULL REFERENCES releases(id) ON DELETE CASCADE,
  assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(app_user_id, release_id)
);
```

### Existing Tables (Already Done)

- `release_users` — users ↔ releases (exists)
- `release_org_units` — org units ↔ releases (exists)
- `user_target_role_assignments.release_id` — assignment ↔ release (exists)

## UI Changes

### 1. Release Selector (Header)

The existing `ReleaseSelector` component in the header becomes a multi-select filter:

- **Default for admins:** "All Releases" (see everything)
- **Default for non-admins:** Only releases they are assigned to via `app_user_releases`
- **Selection options:** Individual releases + "All Releases"
- Persisted in a cookie or localStorage so it survives page navigation

### 2. Release Context Provider

```tsx
// lib/release-context.ts
// Server-side: reads selected release IDs from cookie
// Passes to all queries as optional filter
export function getSelectedReleaseIds(): number[] | null {
  // null = all releases (admin default)
  // [1, 2] = specific releases selected
}
```

### 3. Query Filter Pattern

Every major query function gains an optional `releaseIds` parameter:

```ts
export function getDashboardStats(releaseIds?: number[] | null) {
  // If releaseIds is null or undefined, return all data
  // If releaseIds is an array, filter users/roles/assignments by release
}
```

Affected queries (~15):
- `getDashboardStats()`
- `getDepartmentMappingStatus()`
- `getPersonas()`
- `getPersonaDetail()`
- `getMappingData()`
- `getSourceRoles()` / `getTargetRoles()`
- `getSODConflicts()`
- `getApprovals()`
- `getExportData()`
- `getAuditLog()`
- `getUserScope()` (intersect with release scope)

### 4. Upload Flow

When uploading data (users, roles, rules), the upload page should:
- Show which release(s) the data will be associated with
- Allow selecting target release(s) during upload
- Default to the currently selected release filter

### 5. Visibility Rules

| Role | Default View | Can See |
|------|-------------|---------|
| Admin / System Admin | All Releases | Everything |
| Coordinator | Assigned releases only | Their releases + org unit scope |
| Mapper | Assigned releases only | Their releases + org unit scope |
| Approver | Assigned releases only | Their releases + org unit scope |
| Viewer | Assigned releases only | Read-only within assigned releases |

## Implementation Order

1. Add schema tables + `pnpm db:push`
2. Build release context provider (cookie-based)
3. Update `ReleaseSelector` to multi-select with persistence
4. Add `releaseIds` filter to top 5 most-used queries
5. Update upload flow to associate data with releases
6. Add `app_user_releases` admin UI
7. Extend remaining queries
8. Test with multi-release seed data

## Estimated Effort

- Schema + migrations: 1 hour
- Release context provider: 1 hour
- UI selector update: 1 hour
- Query refactors (~15 queries): 3-4 hours
- Upload flow: 1-2 hours
- Admin UI: 1 hour
- Testing: 2 hours

**Total: ~10-12 hours (1 full sprint day)**

## Open Questions

1. Should personas be per-release or shared across releases? (If a user appears in Wave 1 and Wave 2, do they have different personas?)
2. When switching releases, should the pipeline progress (jobs) also filter, or is pipeline global?
3. Should the seed data create multiple releases for demo purposes?
