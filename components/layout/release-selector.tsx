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
}

export function ReleaseSelector({ releases, selectedId }: Props) {
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

  // Default to active release if no cookie selection
  const activeId = releases.find((r) => r.isActive)?.id ?? releases[0].id;
  const currentValue = String(selectedId ?? activeId);

  async function handleChange(value: string) {
    await fetch("/api/releases/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ releaseId: parseInt(value) }),
    });
    router.refresh();
  }

  return (
    <Select value={currentValue} onValueChange={handleChange}>
      <SelectTrigger className="h-7 w-[220px] text-xs border-dashed">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
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
