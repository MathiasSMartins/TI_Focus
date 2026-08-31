import { AlertCircle, CheckCircle2 } from "lucide-react"

import { cn } from "@/utils/cn"

interface FormMessageProps {
  children: string
  variant?: "error" | "success"
}

export function FormMessage({ children, variant = "error" }: FormMessageProps) {
  const Icon = variant === "error" ? AlertCircle : CheckCircle2

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg border p-3 text-sm",
        variant === "error"
          ? "border-red-500/20 bg-red-500/10 text-red-300"
          : "border-emerald-500/20 bg-emerald-500/10 text-emerald-300",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  )
}
