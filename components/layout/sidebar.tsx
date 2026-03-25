"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Upload,
  Users,
  UserCircle,
  Route,
  ShieldAlert,
  CheckCircle,
  FileText,
  FolderOpen,
  Target,
  BookOpen,
  Info,
  Cog,
  Activity,
  UserCog,
  GitBranch,
  Wrench,
  Layers,
  Bell,
  ShieldCheck,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

interface NavSection {
  label: string;
  items: NavItem[];
  adminOnly?: boolean;
  sysadminOnly?: boolean;
}

const navSections: NavSection[] = [
  {
    label: "WORKFLOW",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/releases", label: "Releases", icon: Layers },
      { href: "/upload", label: "Data Upload", icon: Upload },
      { href: "/personas", label: "Personas", icon: UserCircle },
      { href: "/mapping", label: "Role Mapping", icon: Route },
      { href: "/sod", label: "SOD Analysis", icon: ShieldAlert },
      { href: "/approvals", label: "Approvals", icon: CheckCircle },
      { href: "/notifications", label: "Send Reminders", icon: Bell },
    ],
  },
  {
    label: "DATA",
    items: [
      { href: "/users", label: "Users", icon: Users },
      { href: "/source-roles", label: "Source Roles", icon: FolderOpen },
      { href: "/target-roles", label: "Target Roles", icon: Target },
      { href: "/sod-rules", label: "SOD Rules", icon: BookOpen },
    ],
  },
  {
    label: "REPORTS",
    items: [
      { href: "/exports", label: "Exports", icon: FileText },
      { href: "/audit-log", label: "Audit Log", icon: Activity },
    ],
  },
  {
    label: "LEARN",
    items: [
      { href: "/methodology", label: "How It Works", icon: BookOpen },
      { href: "/overview", label: "Platform Overview", icon: Info },
    ],
  },
  {
    label: "ADMIN",
    adminOnly: true,
    items: [
      { href: "/admin/users", label: "App Users", icon: UserCog },
      { href: "/admin/assignments", label: "Assignments", icon: GitBranch },
    ],
  },
  {
    label: "SYSTEM",
    sysadminOnly: true,
    items: [
      { href: "/admin", label: "Config Console", icon: Wrench },
    ],
  },
  {
    label: "",
    items: [
      { href: "/jobs", label: "Jobs", icon: Cog },
    ],
  },
];

interface SidebarProps {
  userRole: string;
  userName?: string;
}

export function Sidebar({ userRole, userName }: SidebarProps) {
  const pathname = usePathname();

  const initials = userName
    ? userName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  const roleLabel =
    userRole === "system_admin"
      ? "System Admin"
      : userRole.charAt(0).toUpperCase() + userRole.slice(1);

  return (
    <aside className="flex h-screen w-64 flex-col bg-slate-900">
      {/* Brand header */}
      <div className="flex h-14 items-center border-b border-slate-700 px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-teal-400 flex-shrink-0" strokeWidth={2} />
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold tracking-tight leading-none text-white">
              Provisum
            </span>
            <span className="text-[10px] text-slate-400 leading-tight">
              Intelligent Role Mapping
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {navSections
          .filter((section) => {
            if (section.sysadminOnly) return userRole === "system_admin";
            if (section.adminOnly) return userRole === "admin" || userRole === "system_admin";
            return true;
          })
          .map((section, si) => (
            <div key={si} className="mb-3">
              {section.label && (
                <>
                  {si > 0 && <div className="border-t border-slate-700/50 my-2" />}
                  <p className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {section.label}
                  </p>
                </>
              )}
              {section.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-slate-800 text-white border-l-2 border-indigo-500"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    <item.icon className={cn("h-4 w-4", isActive ? "text-white" : "text-slate-400")} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
      </nav>

      {/* User section */}
      <div className="border-t border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-medium text-white">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">
              {userName || "User"}
            </span>
            <span className="text-xs text-slate-400">{roleLabel}</span>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-slate-600 text-center">
          Provisum v0.4.0
        </p>
      </div>
    </aside>
  );
}
