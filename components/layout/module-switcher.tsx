"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { resolveIcon } from "@/lib/module-icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SwitcherModule {
  id: string;
  label: string;
  iconName: string;
  color: string;
  defaultRoute: string;
}

interface ModuleSwitcherProps {
  activeModule: SwitcherModule;
  allModules: SwitcherModule[];
}

export function ModuleSwitcher({ activeModule, allModules }: ModuleSwitcherProps) {
  const router = useRouter();

  function handleSwitch(mod: SwitcherModule) {
    document.cookie = `airm_active_module=${mod.id};path=/;max-age=${60 * 60 * 24 * 30};samesite=lax`;
    router.push(mod.defaultRoute);
  }

  const ActiveIcon = resolveIcon(activeModule.iconName);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2.5 py-1.5 hover:bg-black/5 transition-colors text-brand-text border border-transparent hover:border-brand-border">
          <div className={cn("flex h-6 w-6 items-center justify-center rounded text-white", activeModule.color)}>
            <ActiveIcon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold hidden sm:inline">{activeModule.label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-brand-text-muted" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {allModules.map((mod) => {
          const ModIcon = resolveIcon(mod.iconName);
          return (
            <DropdownMenuItem
              key={mod.id}
              onClick={() => handleSwitch(mod)}
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                mod.id === activeModule.id && "bg-brand-accent/5"
              )}
            >
              <div className={cn("flex h-5 w-5 items-center justify-center rounded text-white", mod.color)}>
                <ModIcon className="h-3 w-3" />
              </div>
              <span className="text-sm">{mod.label}</span>
              {mod.id === activeModule.id && (
                <span className="ml-auto text-[10px] text-brand-accent font-medium">Active</span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
