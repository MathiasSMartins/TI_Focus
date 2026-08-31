import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Copy,
  Pencil,
  RotateCcw,
  Tag,
  Trash2,
  Zap,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  getTaskPriorityLabel,
  getTaskStatusLabel,
  type Task,
} from "@/features/tasks/types/task"

interface TaskCardProps {
  task: Task
  projectName?: string | null
  disabled?: boolean
  onComplete: (task: Task) => void
  onReopen: (task: Task) => void
  onEdit: (task: Task) => void
  onDuplicate: (task: Task) => void
  onDelete: (task: Task) => void
}

const PRIORITY_STYLES: Record<Task["priority"], string> = {
  low: "border-sky-500/40 text-sky-400",
  medium: "border-amber-500/40 text-amber-400",
  high: "border-orange-500/40 text-orange-400",
  critical: "border-red-500/40 text-red-400",
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date)
}

function getDueIndicator(task: Task) {
  if (!task.dueAt) return null
  const dueDate = task.dueAt.toDate()
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dueDay = new Date(dueDate)
  dueDay.setHours(0, 0, 0, 0)
  const isFinished = task.status === "completed" || task.status === "archived"

  if (isFinished) {
    return { label: formatDate(dueDate), className: "text-muted-foreground" }
  }
  if (dueDay.getTime() < today.getTime()) {
    return {
      label: `Atrasada · ${formatDate(dueDate)}`,
      className: "text-red-400",
    }
  }
  if (dueDay.getTime() === today.getTime()) {
    return { label: "Vence hoje", className: "text-amber-400" }
  }
  return { label: formatDate(dueDate), className: "text-muted-foreground" }
}

export function TaskCard({
  task,
  projectName,
  disabled = false,
  onComplete,
  onReopen,
  onEdit,
  onDuplicate,
  onDelete,
}: TaskCardProps) {
  const isCompleted = task.status === "completed"
  const dueIndicator = getDueIndicator(task)

  return (
    <Card className={isCompleted ? "border-primary/25 bg-primary/[0.03]" : ""}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <button
            type="button"
            className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border transition ${
              isCompleted
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-primary hover:text-primary"
            }`}
            aria-label={
              isCompleted ? `Reabrir ${task.title}` : `Concluir ${task.title}`
            }
            onClick={() => (isCompleted ? onReopen(task) : onComplete(task))}
            disabled={disabled || task.status === "archived"}
          >
            {isCompleted && (
              <CheckCircle2 className="size-4" aria-hidden="true" />
            )}
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h3
                  className={`break-words text-sm font-semibold ${
                    isCompleted ? "text-muted-foreground line-through" : ""
                  }`}
                >
                  {task.title}
                </h3>
                {task.description && (
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Editar ${task.title}`}
                  title="Editar"
                  onClick={() => onEdit(task)}
                  disabled={disabled}
                >
                  <Pencil />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Duplicar ${task.title}`}
                  title="Duplicar"
                  onClick={() => onDuplicate(task)}
                  disabled={disabled}
                >
                  <Copy />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="hover:text-red-400"
                  aria-label={`Excluir ${task.title}`}
                  title="Excluir"
                  onClick={() => onDelete(task)}
                  disabled={disabled}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="secondary">
                {getTaskStatusLabel(task.status)}
              </Badge>
              <Badge
                variant="outline"
                className={PRIORITY_STYLES[task.priority]}
              >
                {getTaskPriorityLabel(task.priority)}
              </Badge>
              {task.category && (
                <Badge variant="outline">{task.category}</Badge>
              )}
              {(projectName ?? task.project) && (
                <span className="text-xs text-muted-foreground">
                  Projeto: {projectName ?? task.project}
                </span>
              )}
              {dueIndicator && (
                <span
                  className={`flex items-center gap-1 text-xs ${dueIndicator.className}`}
                >
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  {dueIndicator.label}
                </span>
              )}
              {task.estimateMinutes && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" aria-hidden="true" />
                  {task.estimateMinutes} min
                </span>
              )}
              <span className="flex items-center gap-1 text-xs font-medium text-primary">
                <Zap className="size-3.5" aria-hidden="true" />
                {task.xp} XP
              </span>
            </div>

            {task.tags.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Tag
                  className="size-3.5 text-muted-foreground"
                  aria-hidden="true"
                />
                {task.tags.map((taskTag) => (
                  <span
                    key={taskTag}
                    className="rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    #{taskTag}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>Criada em {formatDate(task.createdAt.toDate())}</span>
              {task.completedAt && (
                <span>
                  Concluída em {formatDate(task.completedAt.toDate())}
                </span>
              )}
              {isCompleted && (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                  onClick={() => onReopen(task)}
                  disabled={disabled}
                >
                  <RotateCcw className="size-3" aria-hidden="true" /> Reabrir
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
