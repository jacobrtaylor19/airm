"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";
import { LayoutGrid } from "lucide-react";
import { resolveIcon } from "@/lib/module-icons";
import type { ModuleRoute } from "@/lib/modules";

interface ModuleSidebarProps {
  module: {
    id: string;
    label: string;
    color: string;
    iconName: string;
    nav: ModuleRoute[];
  };
  /** All modules visible to this user (for quick-nav on Dashboard) */
  allModules?: Array<{ id: string; label: string; iconName: string; defaultRoute: string }>;
  userRole: string;
  userName?: string;
}

export function ModuleSidebar({ module, allModules, userRole, userName }: ModuleSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pendingHref, setPendingHref] = useState<string | null>(null);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

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
      : userRole.charAt(0).toUpperCase() + userRole.slice(1).replace("_", " ");

  const ModuleIcon = resolveIcon(module.iconName);

  return (
    <aside className="flex h-screen w-64 flex-col bg-brand-accent-dark" aria-label={`${module.label} module navigation`}>
      {/* Module header */}
      <div className="flex h-14 items-center border-b border-white/10 px-4">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("flex h-6 w-6 items-center justify-center rounded text-white", module.color)}>
            <ModuleIcon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-bold tracking-tight text-white truncate">
            {module.label}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3" aria-label="Module pages">
        {/* Back to modules */}
        <Link
          href="/home"
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-white/40 hover:bg-white/5 hover:text-white/70 transition-colors mb-3"
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          All Modules
        </Link>

        <div className="border-t border-white/10 mb-3" />

        {/* Module nav items */}
        {module.nav.map((item) => {
          const ItemIcon = resolveIcon(item.iconName);
          const exactMatchOnly = ["/dashboard", "/admin"];
          const isActive =
            pathname === item.href ||
            (!exactMatchOnly.includes(item.href) && pathname.startsWith(item.href + "/"));
          const isPending = pendingHref === item.href;
          const showActive = isActive || isPending;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => {
                // Always set cookie so shared pages keep this module's sidebar
                document.cookie = `airm_active_module=${module.id};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
                if (isActive) return;
                e.preventDefault();
                setPendingHref(item.href);
                startTransition(() => {
                  router.push(item.href);
                });
              }}
              aria-current={showActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                showActive
                  ? "bg-white/10 text-white border-l-2 border-teal-300"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80",
                isPending && "opacity-80"
              )}
            >
              <ItemIcon
                className={cn(
                  "h-4 w-4",
                  showActive ? "text-white" : "text-white/50",
                  isPending && "animate-pulse"
                )}
              />
              {item.label}
            </Link>
          );
        })}

        {/* Quick-nav links to other modules (visible in all sidebars) */}
        {allModules && allModules.length > 0 && (
          <>
            <div className="border-t border-white/10 my-3" />
            <p id="quick-nav-heading" className="mb-1 px-2 text-xs font-semibold uppercase tracking-wider text-white/30">
              Quick Nav
            </p>
            {allModules
              .filter((m) => m.id !== module.id)
              .map((m) => {
                const MIcon = resolveIcon(m.iconName);
                return (
                  <Link
                    key={m.id}
                    href={m.defaultRoute}
                    onClick={() => {
                      document.cookie = `airm_active_module=${m.id};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-white/50 hover:bg-white/5 hover:text-white/80 transition-colors"
                  >
                    <MIcon className="h-4 w-4 text-white/50" />
                    {m.label}
                  </Link>
                );
              })}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 px-4 py-3" role="contentinfo" aria-label="Current user">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs font-medium text-white">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-white truncate">
              {userName || "User"}
            </span>
            <span className="text-xs text-white/40">{roleLabel}</span>
          </div>
        </div>
        <p className="mt-2 text-[10px] text-white/20 text-center">
          Provisum v1.3.0
        </p>
      </div>
    </aside>
  );
}
