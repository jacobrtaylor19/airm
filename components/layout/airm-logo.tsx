import { ShieldCheck, Network, Layers, Fingerprint, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIRMLogoProps {
  variant?: 1 | 2 | 3 | 4 | 5;
  size?: "sm" | "md";
  className?: string;
}

const variants = {
  1: { Icon: ShieldCheck, label: "Shield + Circuit" },
  2: { Icon: Network, label: "Network" },
  3: { Icon: Layers, label: "Layers" },
  4: { Icon: Fingerprint, label: "Fingerprint" },
  5: { Icon: KeyRound, label: "Lock + Key" },
} as const;

export function AIRMLogo({ variant = 1, size = "sm", className }: AIRMLogoProps) {
  const { Icon } = variants[variant];
  const sizeClass = size === "md" ? "h-8 w-8" : "h-5 w-5";

  return (
    <Icon
      className={cn(sizeClass, "text-primary", className)}
      strokeWidth={2}
    />
  );
}

export function AIRMLogoWithLabel({ variant = 1, size = "sm", className }: AIRMLogoProps) {
  const { label } = variants[variant];
  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <AIRMLogo variant={variant} size={size} />
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}
