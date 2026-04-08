// ---------------------------------------------------------------------------
// Module configuration — all data is JSON-serializable (no React components).
// Icon names are resolved client-side via `resolveIcon()` in module-icons.ts.
// ---------------------------------------------------------------------------

export type RoleName =
  | "system_admin"
  | "admin"
  | "project_manager"
  | "approver"
  | "security_architect"
  | "compliance_officer"
  | "coordinator"
  | "mapper"
  | "viewer";

export interface ModuleRoute {
  href: string;
  label: string;
  iconName: string;
  /** If set, only these roles see this nav item within the module */
  visibleTo?: RoleName[];
  /** Landing page when entering this module via tile click */
  isDefault?: boolean;
}

export interface AppModule {
  id: string;
  label: string;
  description: string;
  iconName: string;
  /** Tailwind color class for the tile accent */
  color: string;
  /** Roles that see this tile. Empty array = ALL roles. */
  visibleTo: RoleName[];
  /** Ordered nav items shown in the module sidebar */
  nav: ModuleRoute[];
  /**
   * URL prefixes that belong to this module.
   * Used by `resolveModuleFromPath` to determine which sidebar to show.
   * More-specific prefixes should come first.
   */
  routePrefixes: string[];
}

// ---------------------------------------------------------------------------
// All roles shorthand
// ---------------------------------------------------------------------------
const ALL: RoleName[] = [];

const ADMIN_ROLES: RoleName[] = ["system_admin", "admin"];
const PM_ROLES: RoleName[] = ["system_admin", "admin", "project_manager"];
const PM_COORD_ROLES: RoleName[] = ["system_admin", "admin", "project_manager", "coordinator"];
const MAPPER_PLUS: RoleName[] = ["system_admin", "admin", "mapper"];
const COMPLIANCE_ROLES: RoleName[] = ["system_admin", "admin", "compliance_officer"];

// ---------------------------------------------------------------------------
// Module Definitions
// ---------------------------------------------------------------------------

export const MODULES: AppModule[] = [
  // 1. Dashboard
  {
    id: "dashboard",
    label: "Dashboard",
    description: "Project overview and workflow progress",
    iconName: "LayoutDashboard",
    color: "bg-teal-600",
    visibleTo: ALL,
    nav: [
      { href: "/dashboard", label: "Dashboard", iconName: "LayoutDashboard", isDefault: true },
    ],
    routePrefixes: ["/dashboard"],
  },

  // 2. Personas
  {
    id: "personas",
    label: "Personas",
    description: "View detailed persona information",
    iconName: "UserCircle",
    color: "bg-teal-600",
    visibleTo: ALL,
    nav: [
      { href: "/personas", label: "Personas", iconName: "UserCircle", isDefault: true },
    ],
    routePrefixes: ["/personas"],
  },

  // 3. Role Mapping
  {
    id: "role-mapping",
    label: "Role Mapping",
    description: "Map personas to target roles with SOD analysis and approvals",
    iconName: "Route",
    color: "bg-teal-600",
    visibleTo: ALL,
    nav: [
      { href: "/mapping", label: "End User Mapping", iconName: "Route", isDefault: true },
      { href: "/sod", label: "SOD Analysis", iconName: "ShieldAlert" },
      { href: "/approvals", label: "Approvals", iconName: "CheckCircle" },
      { href: "/risk-analysis", label: "Risk Analysis", iconName: "BarChart3" },
      { href: "/calibration", label: "Calibration", iconName: "Brain", visibleTo: MAPPER_PLUS },
      { href: "/exports", label: "Exports", iconName: "FileText" },
      { href: "/admin/evidence-package", label: "Audit Evidence", iconName: "FileSpreadsheet", visibleTo: ADMIN_ROLES },
      { href: "/admin/validation", label: "Validation", iconName: "FlaskConical" },
      { href: "/target-roles", label: "Target Roles", iconName: "Target" },
    ],
    routePrefixes: ["/mapping", "/sod", "/approvals", "/risk-analysis", "/calibration", "/exports", "/admin/validation", "/least-access"],
  },

  // 4. Program Management
  {
    id: "program-management",
    label: "Program Management",
    description: "Releases, timelines, workstreams, and project oversight",
    iconName: "Layers",
    color: "bg-teal-600",
    visibleTo: PM_COORD_ROLES,
    nav: [
      { href: "/releases", label: "Releases", iconName: "Layers", isDefault: true },
      { href: "/releases/compare", label: "Release Comparison", iconName: "GitCompare", visibleTo: PM_ROLES },
      { href: "/releases/timeline", label: "Project Timeline", iconName: "Calendar", visibleTo: PM_ROLES },
      { href: "/workstream", label: "Workstream Tracker", iconName: "ClipboardList" },
      { href: "/upload", label: "Data Upload", iconName: "Upload" },
      { href: "/audit-log", label: "Audit Log", iconName: "FileText" },
      { href: "/notifications", label: "Send Reminders", iconName: "Bell", visibleTo: ["system_admin", "admin", "coordinator"] },
      { href: "/jobs", label: "Jobs", iconName: "Cog" },
    ],
    routePrefixes: ["/releases", "/workstream", "/upload", "/audit-log", "/notifications", "/jobs"],
  },

  // 5. Security Workspace
  {
    id: "security-workspace",
    label: "Security Workspace",
    description: "Security design review and role redesign triage",
    iconName: "ShieldCheck",
    color: "bg-teal-600",
    visibleTo: ALL, // view-only for non-security roles
    nav: [
      { href: "/workspace/security", label: "Security Triage", iconName: "ShieldCheck", isDefault: true },
      { href: "/target-roles", label: "Target Roles", iconName: "Target" },
      { href: "/admin/security-design", label: "Security Design Admin", iconName: "Shield", visibleTo: ["system_admin"] },
    ],
    routePrefixes: ["/workspace/security", "/admin/security-design"],
  },

  // 6. Compliance Workspace
  {
    id: "compliance-workspace",
    label: "Compliance Workspace",
    description: "Compliance triage and SOD conflict resolution",
    iconName: "Scale",
    color: "bg-teal-600",
    visibleTo: COMPLIANCE_ROLES,
    nav: [
      { href: "/workspace/compliance", label: "Compliance Triage", iconName: "Scale", isDefault: true },
    ],
    routePrefixes: ["/workspace/compliance"],
  },

  // 7. Data
  {
    id: "data",
    label: "Data",
    description: "Users, source roles, target roles, and SOD rules",
    iconName: "Database",
    color: "bg-teal-600",
    visibleTo: ALL,
    nav: [
      { href: "/users", label: "Users", iconName: "Users", isDefault: true },
      { href: "/source-roles", label: "Source Roles", iconName: "FolderOpen" },
      { href: "/target-roles", label: "Target Roles", iconName: "Target" },
      { href: "/sod-rules", label: "SOD Rules", iconName: "BookOpen" },
      { href: "/data/existing-access", label: "Existing Prod Access", iconName: "Database" },
    ],
    routePrefixes: ["/users", "/source-roles", "/target-roles", "/sod-rules", "/data"],
  },

  // 8. Learn
  {
    id: "learn",
    label: "Learn",
    description: "Knowledge base, methodology, and quick reference",
    iconName: "GraduationCap",
    color: "bg-teal-600",
    visibleTo: ALL,
    nav: [
      { href: "/help", label: "Knowledge Base", iconName: "HelpCircle", isDefault: true },
      { href: "/methodology", label: "How It Works", iconName: "BookOpen" },
      { href: "/overview", label: "Platform Overview", iconName: "Info" },
      { href: "/quick-reference", label: "Quick Reference", iconName: "BookOpen" },
    ],
    routePrefixes: ["/help", "/methodology", "/overview", "/quick-reference"],
  },

  // 9. Admin
  {
    id: "admin",
    label: "Admin",
    description: "System settings, user management, and monitoring",
    iconName: "Wrench",
    color: "bg-teal-600",
    visibleTo: ADMIN_ROLES,
    nav: [
      { href: "/admin", label: "Config Console", iconName: "Wrench", isDefault: true, visibleTo: ["system_admin"] },
      { href: "/admin/users", label: "App Users", iconName: "UserCog" },
      { href: "/admin/assignments", label: "Assignments", iconName: "GitBranch" },
      { href: "/upload", label: "Data Upload", iconName: "Upload" },
      { href: "/admin/incidents", label: "Incidents", iconName: "AlertTriangle", visibleTo: ["system_admin"] },
      { href: "/admin/migration-health", label: "Migration Health", iconName: "HeartPulse", visibleTo: ["system_admin"] },
      { href: "/inbox", label: "Inbox", iconName: "Inbox" },
    ],
    routePrefixes: ["/admin", "/inbox"],
  },
];

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const moduleMap = new Map(MODULES.map((m) => [m.id, m]));

/** Get a module by ID */
export function getModule(id: string): AppModule | undefined {
  return moduleMap.get(id);
}

/** Get modules visible to a given role. Empty visibleTo = all roles. */
export function getVisibleModules(role: string): AppModule[] {
  return MODULES.filter(
    (m) => m.visibleTo.length === 0 || m.visibleTo.includes(role as RoleName)
  );
}

/** Get a module's nav items filtered by role visibility. */
export function getModuleNav(moduleId: string, role: string): ModuleRoute[] {
  const mod = moduleMap.get(moduleId);
  if (!mod) return [];
  return mod.nav.filter(
    (item) => !item.visibleTo || item.visibleTo.includes(role as RoleName)
  );
}

/** Get the default (landing) route for a module, respecting role visibility. */
export function getModuleDefaultRoute(moduleId: string, role: string): string {
  const nav = getModuleNav(moduleId, role);
  const explicit = nav.find((item) => item.isDefault);
  return explicit?.href ?? nav[0]?.href ?? "/home";
}

/**
 * Resolve which module owns a given pathname.
 *
 * Priority:
 *  1. If `cookieModuleId` is set and that module contains the pathname, use it.
 *  2. Otherwise, find the module with the longest matching route prefix.
 *  3. Fallback to "dashboard".
 */
export function resolveModuleFromPath(
  pathname: string,
  cookieModuleId?: string | null
): AppModule {
  // 1. Cookie preference
  if (cookieModuleId) {
    const cookieMod = moduleMap.get(cookieModuleId);
    if (cookieMod && moduleOwnsPath(cookieMod, pathname)) {
      return cookieMod;
    }
  }

  // 2. Longest prefix match
  let best: AppModule | null = null;
  let bestLen = 0;
  for (const mod of MODULES) {
    for (const prefix of mod.routePrefixes) {
      if (
        (pathname === prefix || pathname.startsWith(prefix + "/")) &&
        prefix.length > bestLen
      ) {
        best = mod;
        bestLen = prefix.length;
      }
    }
  }

  return best ?? MODULES[0]; // fallback to Dashboard
}

/** Check if a module owns a path (route prefix match OR nav href match). */
function moduleOwnsPath(mod: AppModule, pathname: string): boolean {
  // Check route prefixes first
  const prefixMatch = mod.routePrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
  );
  if (prefixMatch) return true;

  // Also check nav hrefs — shared pages (e.g. /target-roles) may appear in
  // multiple modules' navs without being in each module's routePrefixes.
  // This lets the cookie preference stick when navigating to shared pages.
  return mod.nav.some(
    (item) => pathname === item.href || pathname.startsWith(item.href + "/")
  );
}
