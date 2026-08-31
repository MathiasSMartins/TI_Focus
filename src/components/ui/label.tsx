import type { ComponentProps } from "react"

import { cn } from "@/utils/cn"

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    <label
      data-slot="label"
      className={cn("text-sm font-medium leading-none", className)}
      {...props}
    />
  )
}
