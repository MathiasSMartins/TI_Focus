import { Sparkles, Trophy, X, Zap } from "lucide-react"

import { Button } from "@/components/ui/button"
import { getLevelTitle } from "@/features/gamification/domain/xp-system"
import type { TaskCompletedEvent } from "@/features/tasks"

interface XpRewardFeedbackProps {
  event: TaskCompletedEvent
  onClose: () => void
}

export function XpRewardFeedback({ event, onClose }: XpRewardFeedbackProps) {
  const levelBefore = event.levelBefore ?? 1
  const levelAfter = event.levelAfter ?? levelBefore
  const leveledUp = event.xp > 0 && levelAfter > levelBefore

  return (
    <div
      className="pointer-events-none fixed inset-x-4 bottom-4 z-[70] flex justify-center sm:inset-x-auto sm:bottom-6 sm:right-6"
      role="status"
      aria-live="polite"
    >
      <section
        className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border p-5 shadow-2xl backdrop-blur-xl motion-safe:animate-[xp-pop_450ms_ease-out] ${
          leveledUp
            ? "border-amber-400/50 bg-amber-950/95"
            : "border-primary/35 bg-card/95"
        }`}
      >
        <div className="absolute -right-8 -top-8 size-28 rounded-full bg-primary/15 blur-2xl" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2"
          aria-label="Fechar aviso de XP"
          onClick={onClose}
        >
          <X />
        </Button>

        <div className="relative flex items-start gap-4 pr-7">
          <span
            className={`flex size-12 shrink-0 items-center justify-center rounded-2xl ${
              leveledUp
                ? "bg-amber-400/15 text-amber-300"
                : "bg-primary/12 text-primary"
            }`}
          >
            {leveledUp ? (
              <Trophy className="size-6" aria-hidden="true" />
            ) : event.xp > 0 ? (
              <Zap className="size-6" aria-hidden="true" />
            ) : (
              <Sparkles className="size-6" aria-hidden="true" />
            )}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              {leveledUp ? "Level up" : "Tarefa concluída"}
            </p>
            {event.xp > 0 ? (
              <>
                <p className="mt-1 text-2xl font-bold text-foreground">
                  +{event.xp} XP
                </p>
                {leveledUp && (
                  <p className="mt-1 text-sm font-medium text-amber-200">
                    Nível {levelAfter} · {getLevelTitle(levelAfter)}
                  </p>
                )}
              </>
            ) : (
              <p className="mt-1 text-sm font-medium text-foreground">
                {event.dailyLimitReached
                  ? "Limite de 1.000 XP neste ciclo de 24 horas atingido."
                  : "Esta tarefa já concedeu XP anteriormente."}
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
