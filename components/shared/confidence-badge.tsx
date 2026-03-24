import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null || score === undefined) {
    return <Badge variant="outline" className="text-xs text-muted-foreground">N/A</Badge>;
  }

  const rounded = Math.round(score);
  let className = "";
  if (rounded >= 85) className = "bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  else if (rounded >= 65) className = "bg-yellow-100 text-yellow-700 hover:bg-yellow-100";
  else className = "bg-red-100 text-red-700 hover:bg-red-100";

  return (
    <Badge variant="secondary" className={cn("text-xs font-medium tabular-nums", className)}>
      {rounded}%
    </Badge>
  );
}
