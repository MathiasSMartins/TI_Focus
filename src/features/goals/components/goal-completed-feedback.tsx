import { CheckCircle2, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { GoalCompletedEvent } from "@/features/goals/types/goal"

interface GoalCompletedFeedbackProps {
  event: GoalCompletedEvent
  onClose: () => void
}

export function GoalCompletedFeedback({
  event,
  onClose,
}: GoalCompletedFeedbackProps) {
  return (
    <div className="fixed bottom-5 right-5 z-[80] w-[min(24rem,calc(100vw-2.5rem))] rounded-xl border border-emerald-500/30 bg-card p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
          <CheckCircle2 className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {event.cadence === "daily"
              ? "Meta diária concluída!"
              : "Meta concluída!"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            +{event.awardedXp} XP concedido pelo progresso do período.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Fechar"
        >
          <X />
        </Button>
      </div>
    </div>
  )
}
