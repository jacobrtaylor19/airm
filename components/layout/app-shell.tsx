"use client";

import { usePathname } from "next/navigation";
import { ModuleSidebar } from "@/components/layout/module-sidebar";
import { Header } from "@/components/layout/header";
import { resolveModuleFromPath } from "@/lib/modules";
import type { ModuleRoute } from "@/lib/modules";
import type { ReleaseInfo } from "@/lib/releases";

interface SwitcherModule {
  id: string;
  label: string;
  iconName: string;
  color: string;
  defaultRoute: string;
}

interface ModuleNavMap {
  [moduleId: string]: ModuleRoute[];
}

interface AppShellUser {
  username: string;
  displayName: string;
  role: string;
}

interface AppShellProps {
  user: AppShellUser;
  releases: ReleaseInfo[];
  selectedReleaseId: number | null;
  unreadNotificationCount: number;
  allModules: SwitcherModule[];
  moduleNavMap: ModuleNavMap;
  children: React.ReactNode;
}

export function AppShell({
  user,
  releases,
  selectedReleaseId,
  unreadNotificationCount,
  allModules,
  moduleNavMap,
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const isTileLauncher = pathname === "/home";

  // Read cookie for module context (shared pages like /target-roles)
  const cookieModuleId =
    typeof document !== "undefined"
      ? document.cookie.match(/airm_active_module=([^;]+)/)?.[1] ?? null
      : null;

  const activeModule = resolveModuleFromPath(pathname, cookieModuleId);
  const activeSwitcherModule = allModules.find((m) => m.id === activeModule.id) ?? allModules[0];
  const moduleNav = moduleNavMap[activeModule.id] ?? [];

  if (isTileLauncher) {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <Header
          user={user}
          releases={releases}
          selectedReleaseId={selectedReleaseId}
          unreadNotificationCount={unreadNotificationCount}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <ModuleSidebar
        module={{
          id: activeModule.id,
          label: activeModule.label,
          color: activeModule.color,
          iconName: activeModule.iconName,
          nav: moduleNav,
        }}
        allModules={activeModule.id === "dashboard" ? allModules : undefined}
        userRole={user.role}
        userName={user.displayName}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header
          user={user}
          releases={releases}
          selectedReleaseId={selectedReleaseId}
          unreadNotificationCount={unreadNotificationCount}
          activeModule={activeSwitcherModule}
          allModules={allModules}
        />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
