import { CalendarDays, Pencil, Zap } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  TASK_STATUSES,
  getTaskPriorityLabel,
  type Task,
  type TaskStatus,
} from "@/features/tasks/types/task"

interface TaskKanbanProps {
  tasks: Task[]
  disabled?: boolean
  onEdit: (task: Task) => void
  onMove: (task: Task, status: TaskStatus) => void
}

export function TaskKanban({
  tasks,
  disabled = false,
  onEdit,
  onMove,
}: TaskKanbanProps) {
  return (
    <div className="grid gap-4 xl:grid-cols-5">
      {TASK_STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status.id)
        return (
          <section
            key={status.id}
            className="min-w-0 rounded-xl border border-border bg-muted/20"
            aria-labelledby={`kanban-${status.id}`}
          >
            <header className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 id={`kanban-${status.id}`} className="text-sm font-semibold">
                {status.label}
              </h3>
              <Badge variant="secondary">{columnTasks.length}</Badge>
            </header>
            <div className="space-y-3 p-3">
              {columnTasks.length === 0 && (
                <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
                  Nenhuma tarefa
                </p>
              )}
              {columnTasks.map((task) => (
                <article
                  key={task.id}
                  className="rounded-lg border border-border bg-card p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="break-words text-sm font-medium">
                      {task.title}
                    </h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-8 shrink-0"
                      aria-label={`Editar ${task.title}`}
                      onClick={() => onEdit(task)}
                      disabled={disabled}
                    >
                      <Pencil />
                    </Button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Badge variant="outline">
                      {getTaskPriorityLabel(task.priority)}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Zap className="size-3" aria-hidden="true" /> {task.xp} XP
                    </span>
                    {task.dueAt && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarDays className="size-3" aria-hidden="true" />
                        {new Intl.DateTimeFormat("pt-BR", {
                          day: "2-digit",
                          month: "short",
                        }).format(task.dueAt.toDate())}
                      </span>
                    )}
                  </div>
                  <label className="mt-3 block text-xs text-muted-foreground">
                    Mover para
                    <select
                      value={task.status}
                      onChange={(event) =>
                        onMove(task, event.target.value as TaskStatus)
                      }
                      disabled={disabled}
                      aria-label={`Mover ${task.title}`}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/20"
                    >
                      {TASK_STATUSES.map((targetStatus) => (
                        <option key={targetStatus.id} value={targetStatus.id}>
                          {targetStatus.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
