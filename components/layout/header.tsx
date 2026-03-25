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
import { LogOut, Bell } from "lucide-react";
import { ReleaseSelector } from "@/components/layout/release-selector";
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
  "/admin/users": { title: "Manage App Users", description: "Create and manage platform user accounts" },
  "/admin/assignments": { title: "Work Assignments", description: "Mapper and approver org unit assignments" },
  "/admin": { title: "System Settings", description: "Project configuration and AI settings" },
  "/notifications": { title: "Notifications", description: "Inbox and sent messages" },
  "/least-access": { title: "Provisioning Alerts", description: "Over-provisioning analysis" },
};

interface HeaderUser {
  username: string;
  displayName: string;
  role: string;
}

interface HeaderProps {
  user?: HeaderUser;
  releases?: ReleaseInfo[];
  selectedReleaseId?: number | null;
}

export function Header({ user, releases, selectedReleaseId }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const basePath = "/" + (pathname.split("/").slice(1, pathname.startsWith("/admin") ? 3 : 2).join("/") || "dashboard");
  const page = pageInfo[basePath] || { title: "Provisum" };

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
    <header className="flex h-14 items-center justify-between border-b border-slate-200 px-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">{page.title}</h1>
          {page.description && (
            <p className="text-xs text-slate-500 -mt-0.5">{page.description}</p>
          )}
        </div>
        {releases && releases.length > 0 && (
          <ReleaseSelector releases={releases} selectedId={selectedReleaseId ?? null} />
        )}
      </div>
      {user && (
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
            onClick={() => router.push("/notifications")}
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-100 transition-colors">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-medium text-white">
                  {initials}
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-slate-700 leading-tight">{user.displayName}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{roleLabel}</p>
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
