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
import { LogOut, Bell, LayoutGrid } from "lucide-react";
import { ReleaseSelector } from "@/components/layout/release-selector";
import { ModuleSwitcher } from "@/components/layout/module-switcher";
import type { ReleaseInfo } from "@/lib/releases";

// Page titles moved to content area — header only shows module switcher + user controls

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
    <header className="flex h-14 items-center justify-between border-b border-brand-border bg-brand-cream/80 backdrop-blur-sm px-3 sm:px-6" role="banner">
      {/* Skip to main content link — visible on focus for keyboard users */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-brand-accent focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:top-2 focus:left-2">
        Skip to main content
      </a>
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {/* Module navigation */}
        {pathname === "/home" ? (
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
                  aria-label="All Modules"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <div className="h-4 w-px bg-brand-border mx-1" />
                <ModuleSwitcher activeModule={activeModule} allModules={allModules} />
              </div>
            )}

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
            aria-label={`Inbox${unreadNotificationCount > 0 ? ` (${unreadNotificationCount} unread)` : ""}`}
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
              <button className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-white/60 transition-colors" aria-label={`User menu: ${user.displayName}`}>
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
