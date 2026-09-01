import { Coffee, Play, RotateCcw, Timer } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/features/auth"
import { usePomodoro } from "@/features/pomodoro/providers/pomodoro-context"
import type { PomodoroMode } from "@/features/pomodoro/types/pomodoro"
import { cn } from "@/utils/cn"

const labels: Record<PomodoroMode, string> = {
  focus: "Foco",
  shortBreak: "Pausa curta",
  longBreak: "Pausa longa",
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`
}

export function PomodoroPage() {
  const { profile } = useAuth()
  const pomodoro = usePomodoro()
  const [mode, setMode] = useState<PomodoroMode>("focus")
  const selectedMinutes = profile
    ? mode === "focus"
      ? profile.settings.pomodoro.focusMinutes
      : mode === "shortBreak"
        ? profile.settings.pomodoro.shortBreakMinutes
        : profile.settings.pomodoro.longBreakMinutes
    : 0
  const remaining = pomodoro.current
    ? pomodoro.now === null
      ? pomodoro.current.plannedSeconds
      : Math.max(
          0,
          Math.ceil(
            (pomodoro.current.expectedEndAt.toMillis() - pomodoro.now) / 1_000,
          ),
        )
    : selectedMinutes * 60
  const visibleMode = pomodoro.current?.mode ?? mode

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Badge variant="outline">Timer persistido</Badge>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">Pomodoro</h2>
        <p className="mt-2 text-muted-foreground">
          O timer continua válido ao navegar ou recarregar. Sessões canceladas
          não geram crédito.
        </p>
      </div>

      <Card>
        <CardHeader className="text-center">
          <CardTitle>{labels[visibleMode]}</CardTitle>
          <CardDescription>
            {pomodoro.current
              ? "Sessão em andamento"
              : "Escolha um ciclo para começar"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {!pomodoro.current && (
            <div className="grid gap-2 sm:grid-cols-3">
              {(Object.keys(labels) as PomodoroMode[]).map((item) => (
                <Button
                  key={item}
                  type="button"
                  variant={mode === item ? "secondary" : "outline"}
                  onClick={() => setMode(item)}
                >
                  {item === "focus" ? <Timer /> : <Coffee />} {labels[item]}
                </Button>
              ))}
            </div>
          )}

          <div className="flex justify-center">
            <div
              className={cn(
                "flex size-64 items-center justify-center rounded-full border-8 text-6xl font-bold tabular-nums shadow-inner",
                visibleMode === "focus"
                  ? "border-primary/25 bg-primary/5"
                  : "border-emerald-500/25 bg-emerald-500/5",
              )}
            >
              {formatTime(remaining)}
            </div>
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {pomodoro.current ? (
              <Button
                type="button"
                variant="outline"
                disabled={pomodoro.isSubmitting}
                onClick={() => void pomodoro.cancel()}
              >
                <RotateCcw /> Cancelar sem crédito
              </Button>
            ) : (
              <Button
                type="button"
                disabled={pomodoro.isSubmitting || selectedMinutes <= 0}
                onClick={() => void pomodoro.start(mode)}
              >
                <Play /> Iniciar {selectedMinutes} min
              </Button>
            )}
          </div>
          {pomodoro.error && (
            <p className="text-center text-sm text-destructive">
              {pomodoro.error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
