import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIRMLogoProps {
  variant?: 1;
  size?: "sm" | "md";
  className?: string;
}

export function AIRMLogo({ size = "sm", className }: AIRMLogoProps) {
  const sizeClass = size === "md" ? "h-8 w-8" : "h-5 w-5";

  return (
    <ShieldCheck
      className={cn(sizeClass, "text-primary", className)}
      strokeWidth={2}
    />
  );
}
