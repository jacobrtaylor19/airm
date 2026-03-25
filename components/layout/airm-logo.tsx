import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AIRMLogoProps {
  variant?: 1;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function AIRMLogo({ size = "sm", className }: AIRMLogoProps) {
  const sizeClass =
    size === "lg" ? "h-10 w-10" :
    size === "md" ? "h-8 w-8" : "h-7 w-7";

  return (
    <ShieldCheck
      className={cn(sizeClass, "text-primary", className)}
      strokeWidth={2}
    />
  );
}
