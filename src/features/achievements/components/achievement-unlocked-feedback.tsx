import { Sparkles, Trophy, X, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { AchievementUnlockedEvent } from "@/features/achievements/types/achievement"
import { getLevelTitle } from "@/features/gamification/domain/xp-system"

interface AchievementUnlockedFeedbackProps {
  event: AchievementUnlockedEvent
  onClose: () => void
}

export function AchievementUnlockedFeedback({
  event,
  onClose,
}: AchievementUnlockedFeedbackProps) {
  const leveledUp = event.levelAfter > event.levelBefore

  return (
    <div
      className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex justify-center sm:inset-x-auto sm:right-6 sm:top-6"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <section
        className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border p-5 shadow-2xl backdrop-blur-xl motion-safe:animate-[xp-pop_450ms_ease-out] ${
          leveledUp
            ? "border-amber-400/50 bg-amber-950/95"
            : "border-violet-400/40 bg-card/95"
        }`}
      >
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-violet-500/20 blur-2xl" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          aria-label="Fechar aviso de conquista"
          onClick={onClose}
        >
          <X />
        </Button>

        <div className="relative flex items-start gap-4 pr-7">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
              leveledUp
                ? "bg-amber-400/15 text-amber-300"
                : "bg-violet-500/15 text-violet-300"
            }`}
          >
            {leveledUp ? (
              <Trophy className="size-6" aria-hidden="true" />
            ) : (
              <Sparkles className="size-6" aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {leveledUp ? "Conquista e level up" : "Conquista desbloqueada"}
            </p>
            <p className="mt-1 text-lg font-bold text-foreground">
              {event.achievement.name}
            </p>
            <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-amber-300">
              <Zap className="size-4" aria-hidden="true" />
              {event.xpAwarded > 0
                ? `+${event.xpAwarded} XP`
                : "Sem XP adicional"}
            </p>
            {event.dailyLimitReached && (
              <p className="mt-1 text-xs text-muted-foreground">
                Limite de XP do ciclo atual atingido.
              </p>
            )}
            {leveledUp && (
              <p className="mt-2 text-sm font-medium text-amber-200">
                Nível {event.levelAfter} · {getLevelTitle(event.levelAfter)}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
