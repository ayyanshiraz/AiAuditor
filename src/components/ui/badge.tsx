import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--surface-muted)] text-[var(--foreground)]",
        success: "border-transparent bg-[var(--success-bg)] text-[var(--success)]",
        danger: "border-transparent bg-[var(--danger-bg)] text-[var(--danger)]",
        warning: "border-transparent bg-[var(--warning-bg)] text-[var(--warning)]",
        outline: "border-[var(--border-strong)] text-[var(--foreground)]",
        primary: "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)]",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, className }))} {...props} />;
}
