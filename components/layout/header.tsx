"use client";

import { usePathname, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { ReleaseSelector } from "@/components/layout/release-selector";
import type { ReleaseInfo } from "@/lib/releases";

const pageTitles: Record<string, string> = {
  "/dashboard": "Status Dashboard",
  "/upload": "Data Upload",
  "/personas": "Personas",
  "/mapping": "Role Mapping Workspace",
  "/sod": "SOD Conflict Analysis",
  "/approvals": "Approval Queue",
  "/users": "Users",
  "/source-roles": "Source Roles",
  "/target-roles": "Target Roles",
  "/sod-rules": "SOD Rules",
  "/data": "Legacy Access Browser",
  "/releases": "Releases",
  "/exports": "Exports",
  "/audit-log": "Audit Log",
  "/jobs": "Processing Jobs",
  "/methodology": "How Provisum Works",
  "/overview": "Platform Overview",
  "/admin/users": "Manage App Users",
  "/admin/assignments": "Work Assignments",
  "/admin": "System Settings",
};

const roleColors: Record<string, string> = {
  system_admin: "bg-red-100 text-red-800",
  admin: "bg-purple-100 text-purple-800",
  mapper: "bg-blue-100 text-blue-800",
  approver: "bg-green-100 text-green-800",
  viewer: "bg-slate-100 text-slate-700",
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
  const title = pageTitles[basePath] || "Provisum";

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="flex h-14 items-center justify-between border-b px-6">
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold">{title}</h1>
        {releases && releases.length > 0 && (
          <ReleaseSelector releases={releases} selectedId={selectedReleaseId ?? null} />
        )}
      </div>
      {user && (
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-sm font-medium">{user.displayName}</p>
            <Badge variant="secondary" className={`text-xs ${roleColors[user.role] ?? ""}`}>
              {user.role}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      )}
    </header>
  );
}
