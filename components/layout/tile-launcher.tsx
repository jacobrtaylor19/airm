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
    <div className="relative min-h-full overflow-hidden">
      {/* Background with subtle gradient + glow blobs */}
      <div className="absolute inset-0 bg-brand-cream" />
      <div
        className="absolute -top-32 -right-32 h-96 w-96 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "radial-gradient(circle, #0d9488, #38bdb8)" }}
      />
      <div
        className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full opacity-[0.05] blur-3xl"
        style={{ background: "radial-gradient(circle, #c9a84c, #d4956b)" }}
      />

      {/* Content */}
      <div className="relative z-10 p-8">
        {/* Welcome header */}
        <div className="mb-10 max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-brand-text tracking-tight">
            Welcome back, {userName}
          </h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant="secondary" className="text-xs px-3 py-0.5">
              {roleLabel}
            </Badge>
            <span className="text-sm text-brand-text-muted">
              Select a module to get started
            </span>
          </div>
          {/* Gradient divider */}
          <div
            className="mt-6 h-px w-full max-w-md"
            style={{
              background: "linear-gradient(90deg, rgba(13,148,136,0.3), rgba(201,168,76,0.2), transparent)",
            }}
          />
        </div>

        {/* Module grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {modules.map((mod, i) => {
            const Icon = resolveIcon(mod.iconName);
            return (
              <button
                key={mod.id}
                onClick={() => handleTileClick(mod)}
                className={cn(
                  "group relative flex flex-col items-start rounded-xl p-6 text-left",
                  "bg-white/70 backdrop-blur-sm",
                  "border border-white/80",
                  "shadow-[0_1px_3px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.6)]",
                  "transition-all duration-300 ease-out",
                  "hover:bg-white/90 hover:shadow-[0_4px_20px_rgba(13,148,136,0.08),0_1px_3px_rgba(0,0,0,0.04)]",
                  "hover:border-brand-accent/20 hover:-translate-y-1",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent focus-visible:ring-offset-2"
                )}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                {/* Icon with glow ring on hover */}
                <div className="relative mb-4">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl text-white",
                      "shadow-md transition-shadow duration-300",
                      "group-hover:shadow-[0_4px_14px_rgba(13,148,136,0.35)]",
                      mod.color
                    )}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                </div>

                {/* Text */}
                <h2 className="text-[15px] font-semibold text-brand-text group-hover:text-brand-accent-dark transition-colors">
                  {mod.label}
                </h2>
                <p className="text-xs text-brand-text-muted mt-1.5 leading-relaxed">
                  {mod.description}
                </p>

                {/* Page count pill */}
                <div className="mt-4 flex items-center gap-1.5">
                  <div className="h-1 w-1 rounded-full bg-brand-accent/40" />
                  <span className="text-[10px] text-brand-text-light font-medium">
                    {mod.nav.length} {mod.nav.length === 1 ? "page" : "pages"}
                  </span>
                </div>

                {/* Hover arrow indicator */}
                <div className="absolute top-6 right-5 text-brand-text-light/0 group-hover:text-brand-accent/60 transition-all duration-300 group-hover:translate-x-0.5">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3l5 5-5 5" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>

        {/* Version footer */}
        <p className="mt-16 text-center text-[10px] text-brand-text-light">
          Provisum v1.1.0
        </p>
      </div>
    </div>
  );
}
