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
  Cog,
  Activity,
  UserCog,
  GitBranch,
  Wrench,
  Layers,
  Bell,
} from "lucide-react";
import { AIRMLogo } from "@/components/layout/airm-logo";

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
      { href: "/notifications", label: "Notifications", icon: Bell },
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

export function Sidebar({ userRole, projectName }: { userRole: string; projectName?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-muted/40">
      {/* Brand header */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <AIRMLogo size="sm" />
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-tight leading-none">
              {projectName || "AIRM"}
            </span>
            <span className="text-[10px] font-medium text-muted-foreground leading-tight">
              AI Role Mapping
            </span>
          </div>
        </Link>
      </div>

      {/* Separator */}
      <div className="mx-3 border-b" />

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
                <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/70">
                  {section.label}
                </p>
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
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          ))}
      </nav>

      {/* Footer */}
      <div className="border-t px-4 py-3">
        <p className="text-[10px] text-muted-foreground/60 text-center">
          AIRM v1.0 &middot; AI Role Mapping
        </p>
      </div>
    </aside>
  );
}
