import {
  ArrowUpRight,
  CheckCircle2,
  Clock3,
  Flame,
  Sparkles,
  Target,
  Trophy,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface StatItem {
  label: string
  value: string
  detail: string
  icon: LucideIcon
}

const stats: StatItem[] = [
  {
    label: "Tarefas concluídas",
    value: "12",
    detail: "+3 esta semana",
    icon: CheckCircle2,
  },
  {
    label: "Tempo em foco",
    value: "1h 45m",
    detail: "4 sessões",
    icon: Clock3,
  },
  { label: "XP semanal", value: "680", detail: "68% da meta", icon: Trophy },
  { label: "Sequência", value: "7 dias", detail: "Recorde atual", icon: Flame },
]

const recentTasks = [
  {
    title: "Revisar alertas críticos do ambiente",
    category: "Segurança",
    status: "Em andamento",
  },
  {
    title: "Documentar fluxo de implantação",
    category: "DevOps",
    status: "Planejada",
  },
  {
    title: "Analisar métricas da última sprint",
    category: "Dados",
    status: "Concluída",
  },
]

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Badge variant="outline">Visão demonstrativa</Badge>
          <h2 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Continue construindo seu progresso.
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            A fundação do seu workspace está pronta para receber tarefas, foco e
            gamificação.
          </p>
        </div>
        <Button>
          <Sparkles /> Iniciar planejamento
        </Button>
      </section>

      <section
        className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
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

      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Prioridades recentes</CardTitle>
              <CardDescription className="mt-1.5">
                Uma prévia da futura gestão de tarefas.
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm">
              Ver tarefas <ArrowUpRight />
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.map((task) => (
              <div
                key={task.title}
                className="flex flex-col gap-3 rounded-lg border border-border bg-background/35 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{task.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {task.category}
                  </p>
                </div>
                <Badge
                  variant={
                    task.status === "Concluída" ? "success" : "secondary"
                  }
                >
                  {task.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Progresso de nível</CardTitle>
                <CardDescription className="mt-1.5">
                  Nível 01 · Operador
                </CardDescription>
              </div>
              <span className="flex size-11 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
                <Trophy className="size-5" aria-hidden="true" />
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold">120 XP</span>
              <span className="text-xs text-muted-foreground">de 1.000 XP</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
              <div className="h-full w-[12%] rounded-full bg-primary" />
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <Target className="size-4 text-primary" />
                <p className="mt-2 text-xs text-muted-foreground">Meta ativa</p>
                <p className="mt-1 text-sm font-medium">5 dias de foco</p>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-3">
                <Flame className="size-4 text-orange-400" />
                <p className="mt-2 text-xs text-muted-foreground">Streak</p>
                <p className="mt-1 text-sm font-medium">7 dias</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
