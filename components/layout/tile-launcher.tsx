"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { resolveIcon } from "@/lib/module-icons";
import type { AppModule } from "@/lib/modules";

interface TileLauncherProps {
  modules: Array<AppModule & { defaultRoute: string }>;
  userName: string;
  userRole: string;
}

export function TileLauncher({ modules, userName, userRole }: TileLauncherProps) {
  const router = useRouter();

  const roleLabel =
    userRole === "system_admin"
      ? "System Admin"
      : userRole.charAt(0).toUpperCase() + userRole.slice(1).replace("_", " ");

  function handleTileClick(mod: AppModule & { defaultRoute: string }) {
    document.cookie = `airm_active_module=${mod.id};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
    router.push(mod.defaultRoute);
  }

  return (
    <div className="min-h-full bg-brand-cream p-8">
      {/* Welcome header */}
      <div className="mb-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-brand-text">
          Welcome back, {userName}
        </h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="secondary" className="text-xs">
            {roleLabel}
          </Badge>
          <span className="text-sm text-brand-text-muted">
            Select a module to get started
          </span>
        </div>
      </div>

      {/* Module grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
        {modules.map((mod) => {
          const Icon = resolveIcon(mod.iconName);
          return (
            <button
              key={mod.id}
              onClick={() => handleTileClick(mod)}
              className={cn(
                "group relative flex flex-col items-start gap-4 rounded-xl p-6 text-left",
                "glass-card glow-border",
                "transition-all duration-200",
                "hover:-translate-y-0.5",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
              )}
            >
              {/* Icon */}
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-lg text-white shadow-sm",
                  mod.color
                )}
              >
                <Icon className="h-5 w-5" />
              </div>

              {/* Text */}
              <div>
                <h2 className="text-sm font-semibold text-brand-text group-hover:text-brand-accent-dark transition-colors">
                  {mod.label}
                </h2>
                <p className="text-xs text-brand-text-muted mt-1 leading-relaxed">
                  {mod.description}
                </p>
              </div>

              {/* Nav item count */}
              <span className="absolute top-5 right-5 text-[10px] text-brand-text-light font-medium">
                {mod.nav.length} {mod.nav.length === 1 ? "page" : "pages"}
              </span>
            </button>
          );
        })}
      </div>

      {/* Version footer */}
      <p className="mt-12 text-center text-[10px] text-brand-text-light">
        Provisum v1.1.0
      </p>
    </div>
  );
}
