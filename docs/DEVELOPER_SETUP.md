# AIRM Developer Setup & Onboarding

Welcome to the AIRM team! This guide walks you through setting up your local development environment and understanding the codebase.

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
# - Drizzle ORM for database
# - shadcn/ui and Tailwind CSS
# - TypeScript, ESLint, etc.
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
ANTHROPIC_API_KEY=sk-ant-v4-YOUR-KEY-HERE
DATABASE_URL=file:./airm.db
```

**Get your API key**:
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create or use an existing API key
3. Copy and paste into `ANTHROPIC_API_KEY`

---

## Step 3: Initialize Database

```bash
# Sync Drizzle schema to SQLite
pnpm db:push

# Load demo data (users, roles, etc.)
pnpm db:seed
```

This creates `airm.db` (SQLite database file) in the project root. The file is gitignored and only exists locally.

**Verify it worked**:
```bash
# Check if airm.db was created
ls -lh airm.db
# Should show: -rw-r--r--  1 user  group  XXK  Mar 24 12:34 airm.db
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

You'll be redirected to the login page. Default credentials:

| Username | Password |
|----------|----------|
| `admin` | `admin123` |

Or, create a new admin account via the `/setup` page (if it's your first run and no admin exists).

---

## Explore the Dashboard

After logging in, you'll see:
- **Dashboard**: Main entry point with KPIs and workflow status
- **Sidebar**: Navigation to Mapping, Approvals, Personas, SOD analysis, Admin, etc.
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
│   ├── admin/                 # User management + settings
│   ├── api/                   # API endpoints (mutations)
│   └── middleware.ts          # Auth middleware (runs on every request)
│
├── components/                # React components (UI only)
│   ├── layout/                # Sidebar, header, navigation
│   ├── dashboard/             # Dashboard-specific components
│   └── ui/                    # shadcn/ui components
│
├── db/                        # Database layer
│   ├── schema.ts              # Drizzle ORM schema (single source of truth)
│   ├── index.ts               # Database connection setup
│   └── seed.ts                # CSV seeding logic
│
├── lib/                       # Business logic & utilities
│   ├── auth.ts                # Session management, roles, permissions
│   ├── scope.ts               # Org-unit based user filtering
│   ├── queries.ts             # Centralized database queries
│   ├── settings.ts            # Project configuration (key-value)
│   ├── strapline.ts           # Dashboard status messages
│   ├── ai/                    # Claude API integration
│   └── utils.ts               # Utility functions (formatting, etc.)
│
├── data/                      # Seed CSV files (demo data)
│   ├── users.csv
│   ├── sourceRoles.csv
│   └── ...
│
├── docs/                      # Documentation (this is here!)
│   ├── ARCHITECTURE.md        # System design & decisions
│   ├── DEPLOYMENT.md          # Production deployment guide
│   ├── CONTRIBUTING.md        # Code standards & PR process
│   └── DEVELOPER_SETUP.md     # This file
│
├── package.json               # Dependencies & scripts
├── tsconfig.json              # TypeScript configuration
├── next.config.js             # Next.js configuration
├── middleware.ts              # Auth middleware
└── airm.db                    # SQLite database (gitignored)
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

export default function MyFeaturePage() {
  const user = requireAuth(); // Throws redirect to /login if not authed

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
  const user = getSessionUser();
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
// In lib/queries.ts
export function getMyData(userId: number) {
  return db.select()
    .from(schema.users)
    .where(eq(schema.users.id, userId))
    .get();
}

// Use in a page
import { getMyData } from "@/lib/queries";

export default function MyPage() {
  const data = getMyData(123); // Direct call in server component
  return <div>{JSON.stringify(data)}</div>;
}
```

### Add a Database Table

1. Edit `db/schema.ts`:
```typescript
export const myTable = sqliteTable("my_table", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }),
});
```

2. Sync to database:
```bash
pnpm db:push
```

3. Add queries to `lib/queries.ts`:
```typescript
export function getMyTableRows() {
  return db.select().from(schema.myTable).all();
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

export default function Page() {
  return <MyComponent title="Example" onAction={() => console.log("Clicked")} />;
}
```

---

## Running Tests

Tests aren't comprehensive yet, but you can set up a testing framework:

```bash
# Run tests (when available)
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

This builds the app and starts the production server (slower start than `pnpm dev`, closer to production behavior).

---

## Database Management

### Reset Database (Start Fresh)

```bash
# Delete the database file
rm airm.db

# Recreate schema and load demo data
pnpm db:push
pnpm db:seed
```

### Inspect Database

Use SQLite CLI:
```bash
sqlite3 airm.db

# In the sqlite3 prompt:
.tables              # List all tables
.schema users        # Show schema for 'users' table
SELECT COUNT(*) FROM users;  # Count rows
.exit                # Exit
```

Or use a GUI like [sqlitebrowser](https://sqlitebrowser.org).

### Make Schema Changes

1. Edit `db/schema.ts`
2. Run `pnpm db:push` to apply
3. No migration files needed; Drizzle handles drift detection

---

## Environment Variables Explained

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Development or production mode | `development` |
| `ANTHROPIC_API_KEY` | Claude API authentication | `sk-ant-v4-...` |
| `DATABASE_URL` | SQLite database location | `file:./airm.db` |

AIRM uses custom cookie-based sessions (not NextAuth), so no `NEXTAUTH_SECRET` is required.

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
export default function MyPage() {
  const user = requireAuth();
  console.log("User object:", user);

  const data = getMyData(user.id);
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

### Error: `Cannot find module '@/lib/auth'`

**Cause**: Path alias not resolved.

**Solution**: Restart the dev server (`Ctrl+C`, then `pnpm dev`).

### Error: `database disk image is malformed`

**Cause**: SQLite database is corrupted.

**Solution**: Delete `airm.db` and recreate:
```bash
rm airm.db
pnpm db:push
pnpm db:seed
```

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

- **Server components** (default): Render on the server; can access databases and secrets
- **Client components**: Render in the browser; have access to hooks, interactivity

```typescript
// Server Component (default)
export default function Page() {
  const data = getFromDatabase(); // OK
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
const scopedUserIds = getUserScope(appUser);
// scopedUserIds = [1, 5, 7, 8]  (descendant users in their org unit)
// null = admin (no scoping)

// Use in queries
.where(scopedUserIds ? inArray(schema.users.id, scopedUserIds) : undefined)
```

### Settings (Key-Value Config)

Project settings are stored in the database and configurable via admin console:

```typescript
import { getSetting, setSetting } from "@/lib/settings";

const threshold = parseInt(getSetting("least_access_threshold") ?? "30", 10);
// Default is 30 if setting not found
```

### Authentication Flow

1. User logs in at `/login` with username + password
2. Server validates password hash and creates session
3. Session cookie (`airm_session`) stored in browser
4. On every request, middleware validates the cookie
5. Pages/API routes call `requireAuth()` or `getSessionUser()`

---

## Getting Help

### Documentation
- **CLAUDE.md**: Developer context and common patterns
- **ARCHITECTURE.md**: System design and technical decisions
- **CONTRIBUTING.md**: Code standards and PR process
- **README.md**: Project overview and quick start

### Asking Questions
- Comment in the GitHub PR if stuck
- Open an issue for bugs or questions
- Ask the team in Slack/Discord (if available)

### Code Review
- Don't hesitate to ask for code review on your PR
- Reviewers will help catch issues and suggest improvements

---

## Next Steps

1. **Familiarize yourself with the UI**: Log in and explore the dashboard, mapping, approvals, etc.
2. **Read CLAUDE.md**: Understand the developer context and common patterns
3. **Read ARCHITECTURE.md**: Get a mental model of how the system works
4. **Make a small change**: Try adding a new setting or modifying a message
5. **Submit a PR**: Follow CONTRIBUTING.md guidelines
6. **Ask questions**: Don't hesitate to reach out if something is unclear

Welcome to the team! Looking forward to your contributions.
