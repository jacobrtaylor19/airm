# Provisum Developer Setup & Onboarding

Welcome to the Provisum team! This guide walks you through setting up your local development environment and understanding the codebase.

---

## Prerequisites

Before you start, make sure you have:

- **Node.js**: v18+ ([download](https://nodejs.org))
- **pnpm**: v8+ (faster, more reliable than npm)
  ```bash
  npm install -g pnpm
  pnpm --version  # verify
  ```
- **Git**: v2.30+ ([download](https://git-scm.com))
- **Code editor**: VS Code recommended (with TypeScript support)
- **Supabase account**: Free tier works for development ([supabase.com](https://supabase.com))
- **Anthropic Claude API key**: Get from [Anthropic Dashboard](https://console.anthropic.com)

---

## Step 1: Clone & Install

```bash
# Clone the repository
git clone https://github.com/your-org/airm.git
cd airm

# Install dependencies
pnpm install

# This installs:
# - Next.js 14 and dependencies
# - Drizzle ORM + postgres-js driver
# - @supabase/ssr for authentication
# - shadcn/ui and Tailwind CSS
# - TypeScript, ESLint, Vitest, etc.
```

---

## Step 2: Set Up Environment

Create a `.env.local` file in the project root by copying the example file:

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:

```
NODE_ENV=development
DATABASE_URL=postgresql://postgres.xxxxx:password@aws-1-us-east-1.pooler.supabase.com:6543/postgres
ANTHROPIC_API_KEY=sk-ant-v4-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Get your credentials**:
1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create or select a project
2. Under **Settings > Database**, copy the pooled connection string (port 6543) for `DATABASE_URL`
3. Under **Settings > API**, copy the project URL and anon key for the `NEXT_PUBLIC_SUPABASE_*` vars
4. Go to [Anthropic Console](https://console.anthropic.com) and copy your API key for `ANTHROPIC_API_KEY`

---

## Step 3: Initialize Database

```bash
# Push Drizzle schema to Supabase Postgres (creates all 51 tables)
pnpm db:push

# Load demo data (1K users, 17 auth users, SOD rules, roles, etc.)
pnpm db:seed
```

There is no local database file. All data lives in your Supabase Postgres instance and persists across dev server restarts.

**Verify it worked**: Open the Supabase Dashboard SQL Editor and run:
```sql
SELECT COUNT(*) FROM users;
-- Should return ~1000
```

---

## Step 4: Start Dev Server

```bash
pnpm dev
```

You should see:
```
  ▲ Next.js 14.2.0
  - Local:        http://localhost:3000
  - Environments: .env.local

✓ Ready in 2.5s
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Step 5: First Login

You'll be redirected to the login page. Demo credentials seeded by `pnpm db:seed`:

| Username | Password | Role |
|----------|----------|------|
| `demo.admin` | `DemoGuide2026!` | admin |
| `demo.mapper.finance` | `DemoGuide2026!` | mapper |
| `demo.mapper.operations` | `DemoGuide2026!` | mapper |
| `demo.approver` | `DemoGuide2026!` | approver |
| `demo.viewer` | `DemoGuide2026!` | viewer |
| `demo.coordinator` | `DemoGuide2026!` | coordinator |
| `demo.pm` | `DemoGuide2026!` | project_manager |
| `sysadmin` | `Sysadmin@2026!` | system_admin |
| `admin` | `AdminPass@2026!` | admin |

Quick-login pills are shown on the login page for convenience.

---

## Explore the Dashboard

After logging in, you'll see:
- **Dashboard**: Main entry point with KPIs, workflow status, and provisioning alerts
- **Sidebar**: Navigation to Mapping, Approvals, Personas, SOD analysis, Risk Analysis, Admin, etc.
- **Lumen**: AI chatbot assistant (bottom-right widget)
- **Top bar**: Your username, notifications, logout button

Familiarize yourself with the UI. You can upload sample data in the Admin section.

---

## Project Structure Overview

```
airm/
├── app/                       # Next.js App Router pages & API routes
│   ├── dashboard/page.tsx     # Main dashboard (server component)
│   ├── mapping/page.tsx       # Role mapping workspace
│   ├── approvals/page.tsx     # Approval queue
│   ├── risk-analysis/         # Risk quantification dashboard
│   ├── admin/                 # User management, settings, validation
│   ├── api/                   # API endpoints (mutations + integrations)
│   └── layout.tsx             # Root layout with Lumen chat widget
│
├── components/                # React components (UI only)
│   ├── layout/                # Sidebar, header, navigation
│   ├── dashboard/             # Dashboard-specific components
│   ├── chat/                  # Lumen chat widget
│   └── ui/                    # shadcn/ui components
│
├── db/                        # Database layer
│   ├── schema.ts              # Drizzle ORM schema (pgTable — single source of truth)
│   ├── index.ts               # Lazy database connection (postgres-js, prepare: false)
│   └── seed.ts                # Demo data seeding logic
│
├── lib/                       # Business logic & utilities
│   ├── auth.ts                # Session management, roles, permissions
│   ├── scope.ts               # Org-unit based user filtering
│   ├── queries/               # Database queries (11 domain modules)
│   │   ├── index.ts           # Barrel re-export
│   │   ├── dashboard.ts       # Dashboard stats
│   │   ├── users.ts           # User queries
│   │   ├── personas.ts        # Persona queries
│   │   ├── roles.ts           # Source/target role queries
│   │   ├── sod.ts             # SOD conflict queries
│   │   ├── approvals.ts       # Approval queue queries
│   │   ├── mapping.ts         # Gap analysis, refinement
│   │   ├── risk.ts            # Risk analysis queries
│   │   ├── common.ts          # Shared scoped queries
│   │   ├── jobs.ts            # Pipeline job queries
│   │   └── audit.ts           # Audit log queries
│   ├── ai/                    # Claude API integration
│   │   ├── types.ts           # Shared AI interfaces
│   │   ├── load-user-profiles.ts  # Bulk user profile loader
│   │   └── generatePersonas.ts    # Persona generation pipeline
│   ├── assistant/             # Lumen chatbot
│   │   ├── tools.ts           # Tool definitions for Lumen
│   │   └── rag-context.ts     # Retrieval-augmented context
│   ├── org-context.ts         # Multi-tenant helpers
│   ├── feature-flags.ts       # Feature flag system
│   ├── webhooks.ts            # Webhook dispatch
│   ├── scheduled-exports.ts   # Scheduled export jobs
│   ├── monitoring.ts          # Structured logging (Sentry integration)
│   ├── email.ts               # Resend email integration
│   ├── job-runner.ts          # Retry with dead-letter queue
│   ├── settings.ts            # Project configuration (key-value)
│   ├── strapline.ts           # Dashboard status messages
│   └── utils.ts               # Utility functions (formatting, etc.)
│
├── data/                      # Seed CSV files (demo data)
│   ├── users.csv
│   ├── sourceRoles.csv
│   └── ...
│
├── docs/                      # Documentation
│   ├── ARCHITECTURE.md        # System design & decisions
│   ├── DEPLOYMENT.md          # Production deployment guide
│   ├── CONTRIBUTING.md        # Code standards & PR process
│   ├── QA_TESTING_STRATEGY.md # 130+ test cases across 23 modules
│   ├── TECH_DEBT.md           # Prioritized tech debt register
│   └── DEVELOPER_SETUP.md    # This file
│
├── middleware.ts               # Auth middleware (default-secure model)
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
└── next.config.js             # Next.js configuration
```

---

## Common Development Tasks

### Add a New Page

```bash
# Create a new page
mkdir -p app/my-feature
touch app/my-feature/page.tsx
```

Example page:
```typescript
// app/my-feature/page.tsx
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function MyFeaturePage() {
  const user = await requireAuth(); // Throws redirect to /login if not authed

  return (
    <div>
      <h1>My Feature</h1>
      <p>Welcome, {user.username}!</p>
    </div>
  );
}
```

### Create an API Endpoint

```typescript
// app/api/my-endpoint/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  // Validate auth
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse request
  const body = await req.json();

  // Your logic here

  return NextResponse.json({ success: true });
}
```

### Add a Database Query

```typescript
// In lib/queries/<domain>.ts (pick the appropriate domain module)
export async function getMyData(userId: number) {
  const [row] = await db.select()
    .from(schema.users)
    .where(eq(schema.users.id, userId));
  return row;
}

// Re-export from lib/queries/index.ts if needed

// Use in a server component page
import { getMyData } from "@/lib/queries";

export default async function MyPage() {
  const data = await getMyData(123); // Async DB call in server component
  return <div>{JSON.stringify(data)}</div>;
}
```

### Add a Database Table

1. Edit `db/schema.ts`:
```typescript
export const myTable = pgTable("my_table", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  organizationId: integer("organization_id").references(() => organizations.id),
  createdAt: text("created_at").$defaultFn(() => new Date().toISOString()),
});
```

2. Sync to database:
```bash
pnpm db:push
```

3. Add queries to the appropriate domain module in `lib/queries/`:
```typescript
export async function getMyTableRows() {
  return await db.select().from(schema.myTable);
}
```

### Add a Component

```typescript
// components/MyComponent.tsx
"use client";
import { Button } from "@/components/ui/button";

interface MyComponentProps {
  title: string;
  onAction: () => void;
}

export function MyComponent({ title, onAction }: MyComponentProps) {
  return (
    <div className="p-4 border rounded">
      <h2 className="text-lg font-bold">{title}</h2>
      <Button onClick={onAction}>Click me</Button>
    </div>
  );
}
```

Use in a page:
```typescript
import { MyComponent } from "@/components/MyComponent";

export default async function Page() {
  return <MyComponent title="Example" onAction={() => console.log("Clicked")} />;
}
```

---

## Running Tests

The project uses Vitest with 41+ smoke tests across auth, settings, strapline, and middleware:

```bash
# Run tests
pnpm test

# Run in watch mode (re-run on file change)
pnpm test:watch

# Check code coverage
pnpm test:coverage
```

---

## Linting & Formatting

The project uses ESLint and Prettier to maintain code quality.

```bash
# Lint TypeScript and JSX
pnpm lint

# Auto-fix linting errors
pnpm lint --fix

# Format code with Prettier
pnpm format
```

---

## Building for Production

Test the production build locally:

```bash
pnpm build
pnpm start
```

This builds the app and starts the production server (slower start than `pnpm dev`, closer to production behavior). The build should complete with zero errors and zero warnings.

---

## Database Management

### Re-seed Demo Data

```bash
# Re-seed demo data (resets to known state)
pnpm db:seed
```

### Inspect Database

Use the **Supabase Dashboard SQL Editor** to query your database directly:

```sql
-- List all tables
SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Count users
SELECT COUNT(*) FROM users;

-- Inspect a specific table's schema
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'users' ORDER BY ordinal_position;
```

### Make Schema Changes

1. Edit `db/schema.ts`
2. Run `pnpm db:push` to apply
3. No migration files needed; Drizzle handles drift detection

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `DATABASE_URL` | Supabase Postgres pooled connection (port 6543) | `postgresql://postgres.xxx:pw@aws-1-us-east-1.pooler.supabase.com:6543/postgres` |
| `ANTHROPIC_API_KEY` | Claude API authentication | `sk-ant-v4-...` |
| `ENCRYPTION_KEY` | AES-256-GCM key for encrypting sensitive settings | base64 string |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (public, safe for client) | `eyJ...` |
| `RESEND_API_KEY` | Email transport via Resend (optional) | `re_...` |
| `CRON_SECRET` | Vercel cron job auth (optional, production only) | random string |

Provisum uses Supabase JWT sessions (httpOnly cookies managed by `@supabase/ssr`), so no `NEXTAUTH_SECRET` is required.

**Never commit `.env.local`** — it's gitignored and contains secrets.

---

## Debugging Tips

### Enable Debug Logging

Run the dev server with debug output:

```bash
DEBUG=* pnpm dev
```

This shows detailed logs from Next.js, Drizzle, and other libraries.

### Inspect Network Requests

Use your browser's **DevTools** (F12):
1. **Network tab**: See HTTP requests to API endpoints
2. **Console tab**: Check for JavaScript errors
3. **Application tab**: View cookies and local storage

### Debug a Specific Route

Add `console.log()` statements:

```typescript
export default async function MyPage() {
  const user = await requireAuth();
  console.log("User object:", user);

  const data = await getMyData(user.id);
  console.log("Query result:", data);

  return <div>{/* ... */}</div>;
}
```

View output in the terminal where you ran `pnpm dev`.

### Debug Database Queries

Check the Drizzle output in logs:

```bash
# Enable Drizzle debug output
DRIZZLE_DEBUG=true pnpm dev
```

---

## Common Issues & Solutions

### Error: `ECONNREFUSED` or connection timeout

**Cause**: Cannot reach Supabase Postgres.

**Solution**: Verify your `DATABASE_URL` uses port `6543` (pooled connection) and the correct host (`aws-1-us-east-1.pooler.supabase.com`, not `aws-0`). Check that your Supabase project is not paused.

### Error: Too many connections / connection pool exhausted

**Cause**: Too many open database connections.

**Solution**: The connection string should use the pooled endpoint (port 6543, transaction mode). The `db/index.ts` module uses a lazy connection with `prepare: false` — make sure you are not creating additional connection instances elsewhere.

### Error: Prepared statement already exists / cannot prepare

**Cause**: Supabase transaction pooler does not support prepared statements.

**Solution**: Ensure `db/index.ts` initializes Drizzle with `{ prepare: false }`. This is the default in the codebase — do not override it.

### Error: `Cannot find module '@/lib/auth'`

**Cause**: Path alias not resolved.

**Solution**: Restart the dev server (`Ctrl+C`, then `pnpm dev`).

### Error: `ANTHROPIC_API_KEY is required`

**Cause**: Environment variable not set.

**Solution**: Check `.env.local` has `ANTHROPIC_API_KEY=sk-ant-v4-...` and restart dev server.

### Error: `Cannot call requireAuth in client component`

**Cause**: Trying to use server-only functions (`requireAuth`, `getSessionUser`) in a `"use client"` component. Both functions read cookies via Next.js server APIs and cannot run in the browser.

**Solution**: Move auth checks to the server component (parent page), then pass the user down as a prop:
```typescript
// app/my-feature/page.tsx (Server Component)
import { requireAuth } from "@/lib/auth";
import { MyComponent } from "@/components/MyComponent";

export default async function MyFeaturePage() {
  const user = await requireAuth(); // Server-only — OK here
  return <MyComponent username={user.username} role={user.role} />;
}

// components/MyComponent.tsx (Client Component)
"use client";

interface MyComponentProps {
  username: string;
  role: string;
}

export function MyComponent({ username, role }: MyComponentProps) {
  return <div>Hello, {username}! Your role is {role}.</div>;
}
```

---

## Key Concepts to Understand

### Server Components vs. Client Components

- **Server components** (default): Render on the server; can access databases and secrets directly
- **Client components**: Render in the browser; have access to hooks and interactivity

```typescript
// Server Component (default — must be async for DB calls)
export default async function Page() {
  const data = await getFromDatabase(); // OK — async DB call
  return <div>{data}</div>;
}

// Client Component
"use client";
export function InteractiveButton() {
  const [count, setCount] = useState(0); // OK (use hook)
  return <button onClick={() => setCount(count + 1)}>{count}</button>;
}
```

### Org-Unit Scoping

Users see only data in their assigned org-unit subtree:

```typescript
// In lib/scope.ts
const scopedUserIds = await getUserScope(appUser);
// scopedUserIds = [1, 5, 7, 8]  (descendant users in their org unit)
// null = admin (no scoping)

// Use in queries
.where(scopedUserIds ? inArray(schema.users.id, scopedUserIds) : undefined)
```

### Settings (Key-Value Config)

Project settings are stored in the database and configurable via admin console:

```typescript
import { getSetting, setSetting } from "@/lib/settings";

const threshold = parseInt(await getSetting("least_access_threshold") ?? "30", 10);
// Default is 30 if setting not found
```

### Authentication Flow

1. User logs in at `/login` with username + password
2. Server validates credentials against Supabase Auth
3. Supabase JWT session cookie stored in browser (httpOnly, managed by `@supabase/ssr`)
4. On every request, middleware validates the JWT
5. Pages/API routes call `await requireAuth()` or `await getSessionUser()`

---

## Getting Help

### Documentation
- **CLAUDE.md**: Developer context and common patterns
- **ARCHITECTURE.md**: System design and technical decisions
- **CONTRIBUTING.md**: Code standards and PR process
- **QA_TESTING_STRATEGY.md**: 130+ test cases across 23 modules
- **TECH_DEBT.md**: Prioritized tech debt register

### Asking Questions
- Comment in the GitHub PR if stuck
- Open an issue for bugs or questions
- Ask the team in Slack/Discord (if available)

### Code Review
- Don't hesitate to ask for code review on your PR
- Reviewers will help catch issues and suggest improvements

---

## Next Steps

1. **Familiarize yourself with the UI**: Log in as `demo.admin` and explore the dashboard, mapping, approvals, risk analysis, etc.
2. **Read CLAUDE.md**: Understand the developer context and common patterns
3. **Read ARCHITECTURE.md**: Get a mental model of how the system works
4. **Make a small change**: Try adding a new setting or modifying a message
5. **Submit a PR**: Follow CONTRIBUTING.md guidelines
6. **Ask questions**: Don't hesitate to reach out if something is unclear

Welcome to the team! Looking forward to your contributions.
