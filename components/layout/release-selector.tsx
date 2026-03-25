"use client";

import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import type { ReleaseInfo } from "@/lib/releases";

interface Props {
  releases: ReleaseInfo[];
  selectedId: number | null;
  isAdmin?: boolean;
}

export function ReleaseSelector({ releases, selectedId, isAdmin = false }: Props) {
  const router = useRouter();

  if (releases.length === 0) return null;

  // Single release — show static badge, no toggle needed
  if (releases.length === 1) {
    return (
      <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
        {releases[0].name}
      </Badge>
    );
  }

  // Default: "all" for admins, first release for others
  const currentValue = selectedId === null
    ? "all"
    : String(selectedId);

  async function handleChange(value: string) {
    // Persist selection in cookie via API
    const releaseId = value === "all" ? null : parseInt(value);
    document.cookie = `provisum_releases=${value === "all" ? "all" : JSON.stringify([releaseId])}; path=/; max-age=${60 * 60 * 24 * 365}`;
    await fetch("/api/releases/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId }),
    });
    router.refresh();
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-[220px] text-xs border-dashed">
        <SelectValue placeholder="Select release..." />
      </SelectTrigger>
      <SelectContent>
        {isAdmin && (
          <SelectItem value="all" className="text-xs font-medium">
            All Releases
          </SelectItem>
        )}
        {releases.map((r) => (
          <SelectItem key={r.id} value={String(r.id)} className="text-xs">
            {r.name}
            {r.isActive && (
              <span className="ml-1.5 text-emerald-600 font-medium">● active</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
