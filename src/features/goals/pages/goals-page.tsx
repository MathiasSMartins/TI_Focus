import { Check, Gauge, LoaderCircle, Target } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { getITAreaConfig } from "@/config/it-area-config"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/features/auth"
import { useGoals } from "@/features/goals/hooks/use-goals"
import type { GoalCadence, GoalMetric } from "@/features/goals/types/goal"
import { GOAL_METRIC_LABELS, GOAL_REWARD_XP } from "@/features/goals/types/goal"

const cadenceLabels: Record<GoalCadence, string> = {
  daily: "Meta diária",
  weekly: "Meta semanal",
  monthly: "Meta mensal",
}
interface GoalDraft {
  metric: GoalMetric
  target: string
}

const defaultDrafts: Record<GoalCadence, GoalDraft> = {
  daily: { metric: "tasksCompleted", target: "1" },
  weekly: { metric: "tasksCompleted", target: "5" },
  monthly: { metric: "tasksCompleted", target: "20" },
}

export function GoalsPage() {
  const { user, profile } = useAuth()
  const areaConfig = getITAreaConfig(profile?.primaryArea)
  const timezone = profile?.settings?.timezone ?? "UTC"
  const goals = useGoals(user?.uid, timezone)
  const [drafts, setDrafts] = useState<Partial<Record<GoalCadence, GoalDraft>>>(
    {},
  )
  const [message, setMessage] = useState<string | null>(null)

  const getDraft = (cadence: GoalCadence) => {
    const goal = goals.goals.find((item) => item.cadence === cadence)
    const suggestion = areaConfig.goals.find((item) => item.cadence === cadence)
    return (
      drafts[cadence] ??
      (goal
        ? { metric: goal.metric, target: String(goal.target) }
        : suggestion
          ? { metric: suggestion.metric, target: String(suggestion.target) }
          : defaultDrafts[cadence])
    )
  }

  const save = async (cadence: GoalCadence) => {
    const draft = getDraft(cadence)
    setMessage(null)
    try {
      await goals.saveGoal(cadence, draft.metric, Number(draft.target))
      setMessage(
        "Meta salva. Alterações em metas existentes valem no próximo período.",
      )
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível salvar a meta.",
      )
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Badge variant="outline">Períodos civis · {timezone}</Badge>
        <h2 className="mt-3 text-3xl font-bold tracking-tight">
          {areaConfig.titles.goals}
        </h2>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Defina um alvo por cadência. As sugestões usam sua área principal como
          contexto, mas as métricas e o progresso consideram sua atividade
          global no app. O snapshot de cada período é congelado, então edições
          não alteram progresso já iniciado.
        </p>
      </div>

      <section className="grid gap-5 xl:grid-cols-3">
        {(["daily", "weekly", "monthly"] as GoalCadence[]).map((cadence) => {
          const goal = goals.goals.find((item) => item.cadence === cadence)
          const draft = getDraft(cadence)
          const progress = goals.currentProgress.get(cadence)
          const suggestion = areaConfig.goals.find(
            (item) => item.cadence === cadence,
          )
          const percentage = progress
            ? Math.min(
                100,
                Math.round((progress.current / progress.target) * 100),
              )
            : 0
          return (
            <Card key={cadence}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{cadenceLabels[cadence]}</CardTitle>
                    <CardDescription className="mt-1.5">
                      Recompensa: {GOAL_REWARD_XP[cadence]} XP
                    </CardDescription>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Target className="size-5" />
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!goal && suggestion && (
                  <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">
                      Sugestão contextual para {areaConfig.name}
                    </p>
                    <p className="mt-1 text-sm font-medium">
                      {suggestion.label}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {suggestion.description}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor={`${cadence}-metric`}>Métrica</Label>
                  <select
                    id={`${cadence}-metric`}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50"
                    value={draft.metric}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [cadence]: {
                          ...draft,
                          metric: event.target.value as GoalMetric,
                        },
                      }))
                    }
                  >
                    {(Object.keys(GOAL_METRIC_LABELS) as GoalMetric[]).map(
                      (metric) => (
                        <option key={metric} value={metric}>
                          {GOAL_METRIC_LABELS[metric]}
                        </option>
                      ),
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`${cadence}-target`}>
                    Alvo inteiro positivo
                  </Label>
                  <Input
                    id={`${cadence}-target`}
                    type="number"
                    min={1}
                    step={1}
                    value={draft.target}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [cadence]: { ...draft, target: event.target.value },
                      }))
                    }
                  />
                </div>

                {progress && (
                  <div className="rounded-lg border border-border bg-background/40 p-3">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      Progresso global do período
                    </p>
                    <div className="flex justify-between text-sm">
                      <span>
                        {progress.current} / {progress.target}
                      </span>
                      <span>{percentage}%</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    {progress.completed && (
                      <p className="mt-2 flex items-center gap-1 text-xs text-emerald-400">
                        <Check className="size-3" /> Período concluído
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    disabled={goals.isSaving}
                    onClick={() => void save(cadence)}
                  >
                    {goals.isSaving ? (
                      <LoaderCircle className="animate-spin" />
                    ) : (
                      <Gauge />
                    )}{" "}
                    Salvar
                  </Button>
                  {goal?.active && (
                    <Button
                      variant="outline"
                      disabled={goals.isSaving}
                      onClick={() => void goals.deactivateGoal(cadence)}
                    >
                      Desativar
                    </Button>
                  )}
                </div>
                {goal && (
                  <p className="text-xs text-muted-foreground">
                    Status: {goal.active ? "ativa" : "desativada"}
                  </p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </section>
      {(message || goals.error) && (
        <p className="text-sm text-muted-foreground">
          {message ?? goals.error}
        </p>
      )}
    </div>
  )
}
