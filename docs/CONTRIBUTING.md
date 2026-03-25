# Contributing to AIRM

Thank you for contributing to the AI Role Mapping Tool. This guide outlines how to set up your development environment, write code that fits the project, and submit your changes.

---

## Code of Conduct

Be respectful, inclusive, and collaborative. If you have concerns, reach out to the maintainers.

---

## Getting Started

### 1. Fork & Clone

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR-USERNAME/airm.git
cd airm
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Set Up Environment

Create `.env.local`:
```
NODE_ENV=development
ANTHROPIC_API_KEY=sk-ant-v4-... (get from Anthropic dashboard)
DATABASE_URL=file:./airm.db
```

### 4. Initialize Database

```bash
pnpm db:push      # Sync schema to SQLite
pnpm db:seed      # Load demo data
```

### 5. Start Dev Server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Log in with `admin` / `admin123` (or use `/setup` to create a new admin).

---

## Development Workflow

### Branch Naming

Use descriptive branch names:

```
feature/description-of-feature
fix/description-of-bug
docs/description-of-docs
refactor/description-of-refactor
test/description-of-test
```

**Examples**:
```
feature/add-excel-export
fix/sod-conflict-detection
docs/deployment-guide
refactor/simplify-auth-logic
test/persona-generation
```

### Making Changes

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature
   ```

2. **Make changes** following the code standards below

3. **Test locally**:
   ```bash
   pnpm dev                    # Start dev server
   pnpm test                   # Run tests (if available)
   pnpm build                  # Test production build
   ```

4. **Commit with clear messages**:
   ```bash
   git commit -m "Add Excel export support

   - Implement ExcelExporter class in lib/exporters
   - Add POST /api/exports/excel endpoint
   - Test with multiple worksheet formats
   - Fixes #42"
   ```

5. **Push to your fork**:
   ```bash
   git push origin feature/your-feature
   ```

6. **Open a Pull Request** on GitHub with:
   - Clear title and description
   - Reference to related issues (e.g., `Fixes #42`)
   - Screenshots/videos for UI changes

### Code Review

All PRs require approval before merging.

**Reviewers will check**:
- Code follows project conventions
- No breaking changes to existing APIs
- Tests pass and coverage is adequate
- Documentation is updated (if needed)
- Security & performance are acceptable

**Addressing feedback**:
- Push additional commits (don't rebase; makes review easier)
- Resolve conversations when feedback is addressed
- Ask clarifying questions if feedback is unclear

---

## Code Standards

### TypeScript

- **Strict mode**: All files use `strict: true` in `tsconfig.json`
- **No `any` type**: Use proper types. If truly unknown, use `unknown` with type guards
- **Exported types**: All exported functions should have explicit return types

```typescript
// Good
export function getUserIds(orgUnitId: number): number[] {
  return db.select({ id: schema.users.id }).from(...).all();
}

// Avoid
export function getUserIds(orgUnitId) {
  return db.select({ id: schema.users.id }).from(...).all(); // Missing return type
}
```

### File Organization

- **Components** in `components/` (UI only; no business logic)
- **Pages** in `app/` (Server components by default)
- **API routes** in `app/api/` (mutations and integrations)
- **Business logic** in `lib/` (queries, auth, AI, settings, etc.)
- **Database** in `db/` (schema, migrations, seed data)
- **Styles** colocated with components (Tailwind CSS classes)

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files (components) | PascalCase | `DashboardCard.tsx` |
| Files (utils/hooks) | camelCase | `useAuth.ts`, `formatDate.ts` |
| Functions | camelCase | `getUserIds()`, `validateEmail()` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `DEFAULT_THRESHOLD` |
| React components | PascalCase | `<Dashboard />`, `<PersonaForm />` |
| Hooks | camelCase starting with `use` | `useAuth()`, `useNotifications()` |
| Types/Interfaces | PascalCase | `type User`, `interface AppConfig` |

### Function Guidelines

**Keep functions small and focused**:
```typescript
// Good: single responsibility
export function getUserRole(userId: number): string {
  return getAppUser(userId)?.role ?? "viewer";
}

export function isAdmin(user: AppUser): boolean {
  return ["admin", "system_admin"].includes(user.role);
}

// Avoid: doing too much
export function getUserRoleAndPermissions(userId) {
  const user = getAppUser(userId);
  const role = user?.role;
  const permissions = getPermissionsForRole(role);
  // ... 30 more lines
}
```

**Document complex logic**:
```typescript
// Good: explain *why*
export function computeExcessPercent(persona: Persona, targetRole: TargetRole): number {
  // Excess % = (target role size / persona size) × 100
  // This indicates over-provisioning risk (e.g., 150% = 50% excess)
  return (targetRole.userCount / persona.userCount) * 100;
}
```

### Database Queries

Always use the query builder (not raw SQL):

```typescript
// Good: type-safe, readable
const user = db.select()
  .from(schema.users)
  .where(eq(schema.users.id, userId))
  .get();

// Avoid: raw SQL (unless absolutely necessary)
const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
```

**Centralize queries** in `lib/queries.ts`:
```typescript
// In lib/queries.ts
export function getApprovalQueue(appUser: AppUser): UserAssignment[] {
  const scopedUserIds = getUserScope(appUser);
  return db.select()
    .from(schema.userTargetRoleAssignments)
    .where(
      and(
        eq(schema.userTargetRoleAssignments.status, "pending"),
        scopedUserIds ? inArray(schema.userTargetRoleAssignments.userId, scopedUserIds) : undefined
      )
    )
    .all();
}

// In page
export default function ApprovalsPage() {
  const user = requireAuth();
  const queue = getApprovalQueue(user); // Centralized, reusable
  // ...
}
```

### API Routes

All API endpoints should:
1. Validate session & role
2. Parse request body
3. Validate input
4. Execute business logic
5. Return JSON (with appropriate status codes)

```typescript
// app/api/approvals/[id]/route.ts
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Validate auth
  const user = getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Validate role
  if (!["approver", "admin", "system_admin"].includes(user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Parse & validate input
  const body = await req.json();
  const assignmentId = parseInt(params.id, 10);
  if (!Number.isFinite(assignmentId)) {
    return NextResponse.json({ error: "Invalid assignment ID" }, { status: 400 });
  }

  if (!["approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  // 4. Execute logic
  const assignment = updateAssignmentStatus(assignmentId, body.status, user.id);

  // 5. Return result
  return NextResponse.json(assignment, { status: 200 });
}
```

### React Components

- **Server components by default**: Pages are server components (can call DB directly)
- **Client components when needed**: Use `"use client"` only for interactivity, forms, hooks
- **Prop types**: Always define with TypeScript

```typescript
// app/dashboard/page.tsx (Server Component)
export const dynamic = "force-dynamic";

export default function DashboardPage() {
  const user = requireAuth();
  const stats = getDashboardStats(); // Direct DB call
  return <Dashboard stats={stats} />;
}

// components/Dashboard.tsx (Client Component)
"use client";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";

interface DashboardProps {
  stats: DashboardStats;
}

export function Dashboard({ stats }: DashboardProps) {
  const router = useRouter();
  // Use hooks, event handlers, etc.
  return <div>...</div>;
}
```

**Styling**: Use Tailwind CSS classes (no CSS-in-JS):

```typescript
// Good
<button className="px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700">
  Approve
</button>

// Avoid
<button style={{ padding: "8px 16px", backgroundColor: "#10b981" }}>
  Approve
</button>
```

---

## Testing

A test runner and test files have not yet been configured (MVP priority). The commands below are placeholders that reflect the intended setup once a framework (Jest, Vitest, etc.) is added. Until then, use `pnpm build && pnpm lint` as the local quality gate.

When tests are added, the expected structure is:

1. **Unit tests** for pure functions (lib/utils, lib/queries)
2. **Integration tests** for API routes (jest + supertest)
3. **E2E tests** for critical workflows (Playwright or Cypress, future)

```bash
# Run tests (once configured)
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode (re-run on file change)
pnpm test:watch
```

**Test file naming**:
```
lib/auth.ts          → lib/__tests__/auth.test.ts
lib/queries.ts       → lib/__tests__/queries.test.ts
app/api/auth/route.ts → app/api/__tests__/auth.test.ts
```

---

## Documentation

Always update relevant docs when making changes:

1. **Code comments** — Explain *why*, not *what* (the code shows what)
2. **Function docstrings** — Especially for public APIs

```typescript
/**
 * Get all users assigned to a persona.
 * @param personaId - Persona ID to query
 * @returns Array of user IDs (may be empty)
 * @throws Will throw if persona doesn't exist
 */
export function getUsersForPersona(personaId: number): number[] {
  // ...
}
```

3. **Update CLAUDE.md** — If you change architecture, auth, or queries significantly
4. **Update README.md** — If you add user-facing features or change setup steps
5. **Update ROADMAP.md** — If you complete/change roadmap items
6. **Update CHANGELOG.md** — Add entry to [Unreleased] section

---

## Common Tasks & File Maps

| Task | Files to Touch |
|------|---------------|
| Add a new page | Create `app/[feature]/page.tsx`; update `components/layout/sidebar.tsx` |
| Add a database table | Edit `db/schema.ts`; run `pnpm db:push`; add queries to `lib/queries.ts` |
| Add a new role | Edit `lib/auth.ts` (ROLE_HIERARCHY); update `lib/scope.ts`; add UI for role selection |
| Add an API endpoint | Create `app/api/[path]/route.ts` following API route pattern |
| Add a setting | Add key to `lib/settings.ts`; add UI in `app/admin/admin-console-client.tsx` |
| Add a UI component | Create in `components/[category]/ComponentName.tsx`; use shadcn/ui or Tailwind |
| Fix a bug | Create test case first (if testable); fix bug; update CHANGELOG.md |
| Write docs | Create/edit `.md` file; keep clear and concise |

---

## Common Errors & Fixes

### `Cannot find module '@/lib/...'`

**Cause**: Path alias not resolved.

**Fix**: Check `tsconfig.json` and `next.config.js`; restart dev server after adding new files.

### `database disk image is malformed`

**Cause**: SQLite database is corrupted.

**Fix**: Delete `airm.db` and run `pnpm db:push && pnpm db:seed` to recreate.

### `Cannot call requireAuth in client component`

**Cause**: Trying to use server function in `"use client"` component.

**Fix**: Use `getSessionUser()` (returns null if not authed) instead, or keep as server component.

### `Type '[X]' is not assignable to type '[Y]'`

**Cause**: TypeScript type mismatch.

**Fix**: Check types match; use proper casting only as last resort:
```typescript
// If you're certain of type:
const value = something as ExpectedType;
```

### `pnpm db:push` fails

**Cause**: Schema change is not compatible with existing data.

**Fix**:
1. Check error message for which field/table is problematic
2. Adjust schema to be compatible
3. Or delete `airm.db` and recreate (for dev only)

---

## Performance Considerations

- **Avoid N+1 queries**: Fetch related data in a single query, not separate calls per row
- **Use pagination**: Don't load 10,000 rows; fetch 20 at a time with offset/limit
- **Cache frequently accessed data**: Org-unit tree, settings (though scale not yet a concern for MVP)
- **Minimize Claude API calls**: Batch persona clustering requests where possible
- **Test database queries**: Use `EXPLAIN QUERY PLAN` in SQLite to inspect query performance

---

## Security Best Practices

- **Never hardcode secrets**: Use environment variables for API keys, DB credentials
- **Validate all inputs**: User ID, email, role, before using in queries
- **Escape sensitive data**: Use Drizzle query builder (not raw SQL) to prevent SQL injection
- **Check user permissions**: Always verify role & org-unit scope before returning data
- **Use httpOnly cookies**: Don't expose session token to JavaScript
- **Log sensitive operations**: Especially approvals, exceptions, role changes (for audit trail)

---

## Commit Message Guidelines

Write clear, atomic commits:

```
Type: Short imperative summary (50 chars max)

Longer explanation of what and why (72 chars per line)
Reference related issues (e.g., Fixes #42, Related to #13)

- Bullet points for key changes
- One change per commit if possible
```

**Types**:
- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Code style (formatting, missing semicolons, etc.)
- `refactor:` Code refactoring without behavior change
- `test:` Adding or updating tests
- `chore:` Maintenance (dependencies, build process)

**Examples**:
```
feat: Add Excel export for provisioning data

Implements multi-worksheet Excel export with:
- Users sheet with assignment status
- Personas sheet with target role mappings
- SOD conflicts sheet with severity
- Provisioning alerts sheet with exception status

Adds POST /api/exports/excel endpoint and
ExcelExporter class in lib/exporters.

Fixes #42
```

---

## Getting Help

- **Ask in PRs**: Comment on your PR if you need clarification
- **Open issues**: For bugs or feature requests, open a GitHub issue first
- **Check CLAUDE.md**: Developer context and common patterns
- **Read ARCHITECTURE.md**: For system design questions
- **Slack/Discord**: (if team communication channel is available)

---

## Code Review Checklist (for Reviewers)

When reviewing a PR:

- [ ] Code follows naming conventions and style guidelines
- [ ] No large functions (>50 lines is a smell)
- [ ] Business logic is in `lib/`, not scattered across pages
- [ ] Database queries are in `lib/queries.ts`
- [ ] TypeScript is strict; no `any` types
- [ ] API endpoints validate auth and role
- [ ] User input is validated and escaped
- [ ] Tests pass and coverage is adequate
- [ ] Documentation is updated
- [ ] No hardcoded secrets or credentials
- [ ] Commit messages are clear and atomic

---

## Merging to Main

Only maintainers can merge to `main`. After approval:

1. Ensure tests pass
2. Squash commits if many small fixes (optional, but cleaner)
3. Merge (prefer "Squash and merge" for feature branches)
4. Delete branch
5. Update CHANGELOG.md with the merged feature
6. Tag release if appropriate (e.g., v0.3.1)

---

Thank you for contributing! Your effort helps make AIRM better for enterprise role migration teams.
