import { Zap } from "lucide-react"

import { getLevelProgress } from "@/features/gamification/domain/xp-system"
import { cn } from "@/utils/cn"

interface XpProgressProps {
  totalXp: number
  className?: string
  compact?: boolean
}

export function XpProgress({
  totalXp,
  className,
  compact = false,
}: XpProgressProps) {
  const progress = getLevelProgress(totalXp)

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            Nível {progress.level} · {progress.title}
          </p>
          {!compact && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              {progress.remainingXp} XP para o próximo nível
            </p>
          )}
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
          <Zap className="size-3.5" aria-hidden="true" />
          {progress.totalXp} XP
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-secondary"
        role="progressbar"
        aria-label={`Progresso do nível ${progress.level}`}
        aria-valuemin={0}
        aria-valuemax={progress.xpForNextLevel}
        aria-valuenow={progress.xpIntoLevel}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500"
          style={{ width: `${progress.percentage}%` }}
        />
      </div>
      {!compact && (
        <div className="flex justify-between text-[11px] text-muted-foreground">
          <span>{progress.xpIntoLevel} XP neste nível</span>
          <span>{progress.xpForNextLevel} XP</span>
        </div>
      )}
    </div>
  )
}
