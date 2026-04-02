"use client";

import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Bell, LayoutGrid, ArrowLeft } from "lucide-react";
import { ReleaseSelector } from "@/components/layout/release-selector";
import { ModuleSwitcher } from "@/components/layout/module-switcher";
import type { ReleaseInfo } from "@/lib/releases";

const pageInfo: Record<string, { title: string; description?: string }> = {
  "/dashboard": { title: "Status Dashboard", description: "Project overview and workflow progress" },
  "/upload": { title: "Data Upload", description: "Import source data, target roles, and compliance rules" },
  "/personas": { title: "Personas", description: "AI-generated security personas and consolidated groups" },
  "/mapping": { title: "Role Mapping Workspace", description: "Map personas to target roles" },
  "/sod": { title: "SOD Conflict Analysis", description: "Segregation of duties conflict detection" },
  "/approvals": { title: "Approval Queue", description: "Review and approve role mapping assignments" },
  "/users": { title: "Users", description: "Source system users and mapping status" },
  "/source-roles": { title: "Source Roles", description: "Legacy role definitions from source systems" },
  "/target-roles": { title: "Target Roles", description: "Target role library for mapping" },
  "/sod-rules": { title: "SOD Rules", description: "Segregation of duties ruleset" },
  "/data": { title: "Legacy Access Browser" },
  "/releases": { title: "Releases", description: "Migration waves and release management" },
  "/exports": { title: "Exports", description: "Download reports and provisioning files" },
  "/audit-log": { title: "Audit Log", description: "Complete record of all system actions" },
  "/jobs": { title: "Processing Jobs", description: "Run pipeline stages and monitor progress" },
  "/methodology": { title: "How Provisum Works", description: "Methodology and workflow design" },
  "/overview": { title: "Platform Overview", description: "Capabilities, architecture, and security" },
  "/quick-reference": { title: "Quick Reference Guide", description: "Step-by-step guide for your role" },
  "/admin/users": { title: "Manage App Users", description: "Create and manage platform user accounts" },
  "/admin/assignments": { title: "Work Assignments", description: "Mapper and approver org unit assignments" },
  "/admin": { title: "System Settings", description: "Project configuration and AI settings" },
  "/inbox": { title: "Inbox", description: "Your notifications and workflow updates" },
  "/notifications": { title: "Send Reminders", description: "Send reminders to mappers and approvers" },
  "/least-access": { title: "Provisioning Alerts", description: "Over-provisioning analysis" },
  "/releases/compare": { title: "Release Comparison", description: "Side-by-side release metrics" },
  "/releases/timeline": { title: "Project Timeline", description: "Multi-release timeline overview" },
  "/review": { title: "External Review", description: "Read-only project snapshot" },
  "/home": { title: "Provisum" },
  "/help": { title: "Knowledge Base", description: "Help articles and guides" },
  "/risk-analysis": { title: "Risk Analysis", description: "Permission changes and adoption risk" },
  "/calibration": { title: "Calibration", description: "Confidence threshold tuning" },
  "/workspace/security": { title: "Security Workspace", description: "Security design triage and redesign" },
  "/workspace/compliance": { title: "Compliance Workspace", description: "SOD conflict resolution" },
  "/workstream": { title: "Workstream Tracker", description: "Track workstream progress" },
  "/admin/validation": { title: "Validation", description: "Pipeline attribution chain audit" },
  "/admin/evidence-package": { title: "Audit Evidence", description: "SOX/ITGC evidence package" },
  "/admin/security-design": { title: "Security Design", description: "Target system role management" },
  "/admin/incidents": { title: "Incidents", description: "Incident detection and triage" },
  "/admin/migration-health": { title: "Migration Health", description: "Migration readiness dashboard" },
};

interface HeaderUser {
  username: string;
  displayName: string;
  role: string;
}

interface SwitcherModule {
  id: string;
  label: string;
  iconName: string;
  color: string;
  defaultRoute: string;
}

interface HeaderProps {
  user?: HeaderUser;
  releases?: ReleaseInfo[];
  selectedReleaseId?: number | null;
  unreadNotificationCount?: number;
  activeModule?: SwitcherModule;
  allModules?: SwitcherModule[];
}

export function Header({ user, releases, selectedReleaseId, unreadNotificationCount = 0, activeModule, allModules }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = "/" + (pathname.split("/").slice(1, pathname.startsWith("/admin") ? 3 : 2).join("/") || "dashboard");
  const page = pageInfo[basePath] || { title: "Dashboard" };

  const roleLabel =
    user?.role === "system_admin"
      ? "System Admin"
      : user?.role
        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
        : "";

  const initials = user?.displayName
    ? user.displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-brand-border bg-brand-cream/80 backdrop-blur-sm px-3 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Module navigation */}
        {basePath === "/home" ? (
          /* Tile launcher: Provisum wordmark — Geist Sans Bold, no icon (per branding spec §5) */
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold tracking-tight text-brand-accent-dark">Provisum</span>
            <span className="text-[10px] font-mono font-normal text-brand-text-light border border-brand-border rounded px-1.5 py-0.5">beta</span>
          </div>
        ) : (
          <>
            {activeModule && allModules && (
              <div className="flex items-center gap-1 mr-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-brand-text-muted hover:text-brand-text"
                  onClick={() => router.push("/home")}
                  title="All Modules"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-brand-border mx-1" />
                <ModuleSwitcher activeModule={activeModule} allModules={allModules} />
              </div>
            )}

            <div className="h-4 w-px bg-brand-border" />

            {/* Back button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-brand-text-muted hover:text-brand-text shrink-0"
              onClick={() => router.back()}
              title="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>

            <div className="min-w-0">
              <h1 className="text-base sm:text-lg font-semibold text-brand-text truncate">{page.title}</h1>
              {page.description && (
                <p className="text-xs text-brand-text-muted -mt-0.5 hidden md:block">{page.description}</p>
              )}
            </div>
          </>
        )}
        {releases && releases.length > 0 && (
          <ReleaseSelector releases={releases} selectedId={selectedReleaseId ?? null} isAdmin={["admin", "system_admin"].includes(user?.role ?? "")} />
        )}
      </div>
      {user && (
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Button
            variant="ghost"
            size="sm"
            className="relative h-8 w-8 p-0 text-brand-text-muted hover:text-brand-text"
            onClick={() => router.push("/inbox")}
            title="Inbox"
          >
            <Bell className="h-4 w-4" />
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-accent px-1 text-[9px] font-bold text-white">
                {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
              </span>
            )}
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/60 transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-accent text-[10px] font-medium text-white">
                  {initials}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-brand-text leading-tight">{user.displayName}</p>
                  <p className="text-[10px] text-brand-text-light leading-tight">{roleLabel}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.displayName}</p>
                <Badge variant="secondary" className="text-[10px] mt-0.5">
                  {roleLabel}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                <LogOut className="h-3.5 w-3.5 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </header>
  );
}
