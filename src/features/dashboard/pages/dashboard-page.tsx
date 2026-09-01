import {
  CheckCircle2,
  CircleDot,
  Flame,
  LoaderCircle,
  Sparkles,
  Target,
  Trophy,
  Zap,
  type LucideIcon,
} from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { AreaIcon } from "@/components/area-icon"
import { Badge } from "@/components/ui/badge"
import { getITAreaConfig, type ITAreaStatKey } from "@/config/it-area-config"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useAuth } from "@/features/auth"
import {
  XpProgress,
  useXpEarnedSince,
  useXpTransactions,
  type XpTransaction,
} from "@/features/gamification"
import { GOAL_METRIC_LABELS, useGoals } from "@/features/goals"
import { useTasks } from "@/features/tasks/hooks/use-tasks"

interface StatItem {
  label: string
  value: string
  detail: string
  icon: LucideIcon
}

const AREA_STAT_ICONS: Record<ITAreaStatKey, LucideIcon> = {
  areaTasksCompleted: CheckCircle2,
  areaTasksPending: CircleDot,
  areaTasksTotal: Target,
  areaCompletionRate: Trophy,
}

function formatTransactionDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function getTransactionTitle(transaction: XpTransaction) {
  if (transaction.eventType === "TASK_COMPLETED") return transaction.taskTitle
  if (transaction.eventType === "ACHIEVEMENT_UNLOCKED") {
    return transaction.achievementName
  }
  return `Meta ${transaction.cadence === "daily" ? "diária" : transaction.cadence === "weekly" ? "semanal" : "mensal"}`
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const areaConfig = getITAreaConfig(profile?.primaryArea)
  const taskState = useTasks(user?.uid)
  const xpState = useXpTransactions(user?.uid, 8)
  const [weeklyStart] = useState(() => Date.now() - 7 * 24 * 60 * 60 * 1_000)
  const weeklyXp = useXpEarnedSince(user?.uid, weeklyStart)
  const goals = useGoals(user?.uid, profile?.settings?.timezone ?? "UTC")
  const dailyProgress = goals.currentProgress.get("daily")
  const dailyPercentage = dailyProgress
    ? Math.min(
        100,
        Math.round((dailyProgress.current / dailyProgress.target) * 100),
      )
    : 0

  const completedTasks = taskState.tasks.filter(
    (task) => task.status === "completed",
  ).length
  const pendingTasks = taskState.tasks.filter(
    (task) => task.status !== "completed" && task.status !== "archived",
  ).length
  const areaTasks = taskState.tasks.filter(
    (task) =>
      profile?.primaryArea != null && task.areaId === profile.primaryArea,
  )
  const areaCompletedTasks = areaTasks.filter(
    (task) => task.status === "completed",
  ).length
  const areaPendingTasks = areaTasks.filter(
    (task) => task.status !== "completed" && task.status !== "archived",
  ).length
  const areaCompletionRate =
    areaTasks.length === 0
      ? 0
      : Math.round((areaCompletedTasks / areaTasks.length) * 100)
  const areaStatValues: Record<ITAreaStatKey, string> = {
    areaTasksCompleted: String(areaCompletedTasks),
    areaTasksPending: String(areaPendingTasks),
    areaTasksTotal: String(areaTasks.length),
    areaCompletionRate: `${areaCompletionRate}%`,
  }
  const areaStats: StatItem[] = areaConfig.stats.map((stat) => ({
    label: stat.label,
    value: areaStatValues[stat.key],
    detail: stat.description,
    icon: AREA_STAT_ICONS[stat.key],
  }))

  const stats: StatItem[] = [
    {
      label: "Tarefas concluídas",
      value: String(completedTasks),
      detail: `${taskState.tasks.length} tarefas registradas`,
      icon: CheckCircle2,
    },
    {
      label: "Tarefas pendentes",
      value: String(pendingTasks),
      detail: "Backlog, a fazer e em andamento",
      icon: CircleDot,
    },
    {
      label: "XP nos últimos 7 dias",
      value: weeklyXp.isLoading ? "…" : String(weeklyXp.amount),
      detail: `${profile?.xp ?? 0} XP acumulado`,
      icon: Trophy,
    },
    {
      label: "Streak atual",
      value: `${goals.streak?.current ?? profile?.streak ?? 0} dias`,
      detail: "Metas diárias consecutivas",
      icon: Flame,
    },
    {
      label: "Melhor streak",
      value: `${goals.streak?.best ?? 0} dias`,
      detail: "Melhor sequência registrada",
      icon: Trophy,
    },
    {
      label: "Dias produtivos",
      value: String(goals.streak?.productiveDays ?? 0),
      detail: "Metas diárias concluídas",
      icon: CheckCircle2,
    },
  ]

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <AreaIcon icon={areaConfig.icon} className="size-5" />
            </span>
            <Badge variant="outline">{areaConfig.name}</Badge>
          </div>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            {areaConfig.titles.dashboard}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            {profile?.name
              ? `${profile.name}, ${areaConfig.description}`
              : areaConfig.description}
          </p>
        </div>
        <Button type="button" onClick={() => navigate("/tasks")}>
          <Sparkles /> Planejar tarefas
        </Button>
      </section>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        aria-label="Resumo de produtividade"
      >
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {stat.label}
                    </p>
                    <p className="mt-2 text-2xl font-bold tracking-tight">
                      {stat.value}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {stat.detail}
                    </p>
                  </div>
                  <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </section>

      <section aria-labelledby="area-stats-title" className="space-y-3">
        <div>
          <h3 id="area-stats-title" className="text-lg font-semibold">
            Estatísticas de {areaConfig.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Apenas tarefas registradas nesta área; itens históricos sem área não
            entram neste recorte.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {areaStats.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold tracking-tight">
                        {stat.value}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {stat.detail}
                      </p>
                    </div>
                    <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div>
              <CardTitle>Meta diária</CardTitle>
              <CardDescription className="mt-1.5">
                {dailyProgress
                  ? `${dailyProgress.current} de ${dailyProgress.target} · ${GOAL_METRIC_LABELS[dailyProgress.metric]}`
                  : "Crie uma meta diária para acompanhar seu progresso."}
              </CardDescription>
            </div>
            <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="size-5" />
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <span>
              {dailyProgress?.completed
                ? "Meta diária concluída!"
                : "Progresso de hoje"}
            </span>
            <span className="font-semibold">{dailyPercentage}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${dailyPercentage}%` }}
            />
          </div>
          {!dailyProgress && (
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => navigate("/goals")}
            >
              Criar meta
            </Button>
          )}
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Histórico de XP</CardTitle>
            <CardDescription>
              Recompensas auditáveis de tarefas, conquistas e metas.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {xpState.isLoading ? (
              <div className="flex min-h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" /> Carregando
                transações...
              </div>
            ) : xpState.transactions.length === 0 ? (
              <div className="flex min-h-32 flex-col items-center justify-center text-center">
                <Zap className="size-8 text-primary/60" aria-hidden="true" />
                <p className="mt-3 text-sm font-medium">
                  Sua primeira recompensa aparecerá aqui
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Conclua uma tarefa para receber XP.
                </p>
              </div>
            ) : (
              xpState.transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-border bg-background/35 p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {getTransactionTitle(transaction)}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {transaction.reason} ·{" "}
                      {formatTransactionDate(transaction.createdAt.toDate())}
                    </p>
                  </div>
                  <Badge
                    variant={transaction.amount > 0 ? "success" : "secondary"}
                  >
                    +{transaction.amount} XP
                  </Badge>
                </div>
              ))
            )}
            {xpState.error && (
              <p className="text-xs text-destructive">{xpState.error}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Progresso de nível</CardTitle>
                <CardDescription className="mt-1.5">
                  Curva progressiva baseada no XP total.
                </CardDescription>
              </div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Trophy className="size-5" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <XpProgress totalXp={profile?.xp ?? 0} />
            <div className="mt-6 rounded-lg border border-border bg-background/40 p-4">
              <p className="text-xs text-muted-foreground">
                Proteção anti-abuso
              </p>
              <p className="mt-1 text-sm font-medium">
                Uma recompensa por fonte · 1.000 XP por ciclo individual de 24h
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
