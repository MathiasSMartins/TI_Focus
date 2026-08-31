import type { ComponentProps } from "react"

import { cn } from "@/utils/cn"

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      data-slot="input"
      className={cn(
        "h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  )
}
