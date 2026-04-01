import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function KpiCard({
  title,
  value,
  subtitle,
  trend,
  className,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  className?: string;
}) {
  return (
    <Card className={cn("glass-card glow-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-brand-text-light">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums text-brand-text mb-1">{value}</div>
        <div className="flex items-center justify-between">
          {subtitle && <span className="text-[11px] text-brand-text-muted">{subtitle}</span>}
          {trend && <span className="text-[11px] font-medium text-brand-accent">{trend}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
