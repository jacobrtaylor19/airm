"use client";

import { usePathname } from "next/navigation";


const pageTitles: Record<string, string> = {
  "/dashboard": "Migration Dashboard",
  "/upload": "Data Upload",
  "/personas": "Personas",
  "/mapping": "Role Mapping Workspace",
  "/sod": "SOD Conflict Analysis",
  "/approvals": "Approval Queue",
  "/users": "Users",
  "/source-roles": "Source Roles",
  "/target-roles": "Target Roles",
  "/sod-rules": "SOD Rules",
  "/exports": "Exports",
  "/audit-log": "Audit Log",
  "/jobs": "Processing Jobs",
};

export function Header() {
  const pathname = usePathname();
  const basePath = "/" + (pathname.split("/")[1] || "dashboard");
  const title = pageTitles[basePath] || "AIRM";

  return (
    <header className="flex h-14 items-center border-b px-6">
      <h1 className="text-lg font-semibold">{title}</h1>
    </header>
  );
}
