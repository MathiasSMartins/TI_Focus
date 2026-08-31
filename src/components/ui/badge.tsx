import { cva, type VariantProps } from "class-variance-authority"
import type { ComponentProps } from "react"

import { cn } from "@/utils/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary/15 text-primary",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "border-border text-muted-foreground",
        success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

interface BadgeProps
  extends ComponentProps<"span">, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge }
