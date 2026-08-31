import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  ListTodo,
  TrendingUp,
  Zap,
} from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import {
  formatInvestedTime,
  type Project,
  type ProjectMetrics,
} from "@/features/projects/types/project"

interface ProjectDashboardProps {
  project: Project
  metrics: ProjectMetrics
}

export function ProjectDashboard({ project, metrics }: ProjectDashboardProps) {
  const items = [
    {
      label: "Percentual concluído",
      value: `${metrics.progress}%`,
      icon: TrendingUp,
    },
    {
      label: "Tarefas concluídas",
      value: metrics.completedTasks,
      icon: CheckCircle2,
    },
    { label: "Tarefas pendentes", value: metrics.pendingTasks, icon: ListTodo },
    { label: "XP acumulado", value: `${metrics.accumulatedXp} XP`, icon: Zap },
    {
      label: "Tempo investido",
      value: formatInvestedTime(metrics.investedMinutes),
      icon: Clock3,
    },
    {
      label: "Prazo",
      value: project.dueAt
        ? new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }).format(project.dueAt.toDate())
        : "Sem prazo",
      icon: CalendarDays,
    },
  ]

  return (
    <section className="space-y-4" aria-labelledby="project-dashboard-title">
      <div className="flex items-center justify-between gap-4">
        <h3 id="project-dashboard-title" className="text-lg font-semibold">
          Dashboard do projeto
        </h3>
        <span className="text-sm font-semibold text-primary">
          {metrics.completedTasks}/{metrics.totalTasks} concluídas
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">Progresso</span>
            <strong>{metrics.progress}%</strong>
          </div>
          <div
            className="h-3 overflow-hidden rounded-full bg-secondary"
            role="progressbar"
            aria-label="Progresso do projeto"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={metrics.progress}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${metrics.progress}%` }}
            />
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
