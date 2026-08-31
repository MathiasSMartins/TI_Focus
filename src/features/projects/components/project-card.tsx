import {
  Archive,
  CalendarDays,
  Clock3,
  ExternalLink,
  Pencil,
  Trash2,
  Zap,
} from "lucide-react"
import { Link } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import {
  formatInvestedTime,
  getProjectStatusLabel,
  type Project,
  type ProjectMetrics,
} from "@/features/projects/types/project"

interface ProjectCardProps {
  project: Project
  metrics: ProjectMetrics
  disabled?: boolean
  onEdit: (project: Project) => void
  onArchive: (project: Project) => void
  onDelete: (project: Project) => void
}

export function ProjectCard({
  project,
  metrics,
  disabled = false,
  onEdit,
  onArchive,
  onDelete,
}: ProjectCardProps) {
  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={
                  project.status === "archived" ? "outline" : "secondary"
                }
              >
                {getProjectStatusLabel(project.status)}
              </Badge>
              {project.category && (
                <span className="text-xs text-muted-foreground">
                  {project.category}
                </span>
              )}
            </div>
            <h3 className="mt-3 break-words text-lg font-semibold">
              {project.name}
            </h3>
          </div>
          <Button asChild variant="ghost" size="icon">
            <Link
              to={`/projects/${project.id}`}
              aria-label={`Abrir ${project.name}`}
            >
              <ExternalLink />
            </Link>
          </Button>
        </div>
        <p className="line-clamp-3 min-h-10 text-sm text-muted-foreground">
          {project.description ?? "Projeto sem descrição."}
        </p>
      </CardHeader>

      <CardContent className="flex-1 space-y-4 px-5 pb-4">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progresso</span>
            <strong>{metrics.progress}%</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${metrics.progress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {metrics.completedTasks} de {metrics.totalTasks} tarefas concluídas
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Zap className="size-3.5 text-primary" aria-hidden="true" />
            {metrics.accumulatedXp} XP
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock3 className="size-3.5" aria-hidden="true" />
            {formatInvestedTime(metrics.investedMinutes)}
          </span>
          <span className="col-span-2 inline-flex items-center gap-1.5">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {project.dueAt
              ? new Intl.DateTimeFormat("pt-BR", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                }).format(project.dueAt.toDate())
              : "Sem prazo"}
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex flex-wrap gap-2 border-t border-border p-4">
        <Button asChild size="sm" className="flex-1">
          <Link to={`/projects/${project.id}`}>Abrir projeto</Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Editar ${project.name}`}
          onClick={() => onEdit(project)}
          disabled={disabled}
        >
          <Pencil />
        </Button>
        {project.status !== "archived" && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label={`Arquivar ${project.name}`}
            onClick={() => onArchive(project)}
            disabled={disabled}
          >
            <Archive />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Excluir ${project.name}`}
          onClick={() => onDelete(project)}
          disabled={disabled}
        >
          <Trash2 />
        </Button>
      </CardFooter>
    </Card>
  )
}
