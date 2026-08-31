import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import { CalendarDays, GripVertical, Pencil, Zap } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  getTaskPriorityLabel,
  type Task,
  type TaskStatus,
} from "@/features/tasks/types/task"
import { cn } from "@/utils/cn"

const PROJECT_KANBAN_STATUSES = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "A Fazer" },
  { id: "in-progress", label: "Em andamento" },
  { id: "completed", label: "Concluídas" },
] as const satisfies ReadonlyArray<{ id: TaskStatus; label: string }>

interface ProjectKanbanProps {
  tasks: Task[]
  disabled?: boolean
  onEdit: (task: Task) => void
  onMove: (
    task: Task,
    status: TaskStatus,
    kanbanOrder: number,
  ) => Promise<boolean>
}

interface KanbanTaskProps {
  task: Task
  disabled: boolean
  onEdit: (task: Task) => void
  onSelectStatus: (task: Task, status: TaskStatus) => void
}

function KanbanTask({
  task,
  disabled,
  onEdit,
  onSelectStatus,
}: KanbanTaskProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, data: { task }, disabled })

  return (
    <article
      ref={setNodeRef}
      style={
        transform
          ? {
              transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
            }
          : undefined
      }
      className={cn(
        "rounded-lg border border-border bg-card p-3 shadow-sm",
        isDragging && "relative z-20 opacity-40",
      )}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-0.5 flex size-8 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30 disabled:opacity-50"
          aria-label={`Arrastar ${task.title}`}
          disabled={disabled}
          {...listeners}
          {...attributes}
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </button>
        <h4 className="min-w-0 flex-1 break-words text-sm font-medium">
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
        <Badge variant="outline">{getTaskPriorityLabel(task.priority)}</Badge>
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
            onSelectStatus(task, event.target.value as TaskStatus)
          }
          disabled={disabled}
          aria-label={`Mover ${task.title}`}
          className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring/20"
        >
          {PROJECT_KANBAN_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      </label>
    </article>
  )
}

interface KanbanColumnProps extends KanbanTaskProps {
  status: (typeof PROJECT_KANBAN_STATUSES)[number]
  tasks: Task[]
}

function KanbanColumn({
  status,
  tasks,
  disabled,
  onEdit,
  onSelectStatus,
}: Omit<KanbanColumnProps, "task">) {
  const { isOver, setNodeRef } = useDroppable({
    id: status.id,
    disabled,
  })

  return (
    <section
      ref={setNodeRef}
      className={cn(
        "w-[82vw] min-w-[17rem] max-w-sm snap-start rounded-xl border border-border bg-muted/20 transition-colors sm:w-72",
        isOver && "border-primary/70 bg-primary/5",
      )}
      aria-labelledby={`project-kanban-${status.id}`}
    >
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h4
          id={`project-kanban-${status.id}`}
          className="text-sm font-semibold"
        >
          {status.label}
        </h4>
        <Badge variant="secondary">{tasks.length}</Badge>
      </header>
      <div className="min-h-32 space-y-3 p-3">
        {tasks.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
            Solte uma tarefa aqui
          </p>
        )}
        {tasks.map((task) => (
          <KanbanTask
            key={task.id}
            task={task}
            disabled={disabled}
            onEdit={onEdit}
            onSelectStatus={onSelectStatus}
          />
        ))}
      </div>
    </section>
  )
}

export function ProjectKanban({
  tasks,
  disabled = false,
  onEdit,
  onMove,
}: ProjectKanbanProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null)
  const [optimisticStatuses, setOptimisticStatuses] = useState<
    Record<string, TaskStatus>
  >({})
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor),
  )

  const visibleTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.status !== "archived")
        .map((task) => ({
          ...task,
          status: optimisticStatuses[task.id] ?? task.status,
        }))
        .sort((first, second) => {
          const firstOrder = first.kanbanOrder ?? Number.MAX_SAFE_INTEGER
          const secondOrder = second.kanbanOrder ?? Number.MAX_SAFE_INTEGER
          if (firstOrder !== secondOrder) return firstOrder - secondOrder
          return second.updatedAt.toMillis() - first.updatedAt.toMillis()
        }),
    [optimisticStatuses, tasks],
  )

  async function moveTask(task: Task, status: TaskStatus) {
    const currentStatus = optimisticStatuses[task.id] ?? task.status
    if (status === currentStatus) return

    const targetOrders = visibleTasks
      .filter((item) => item.status === status && item.id !== task.id)
      .map((item) => item.kanbanOrder)
      .filter((order): order is number => typeof order === "number")
    const nextOrder =
      (targetOrders.length ? Math.max(...targetOrders) : 0) + 1000

    setOptimisticStatuses((current) => ({ ...current, [task.id]: status }))
    const success = await onMove(task, status, nextOrder)
    setOptimisticStatuses((current) => {
      const next = { ...current }
      delete next[task.id]
      return next
    })
    return success
  }

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((item) => item.id === event.active.id)
    setActiveTask(task ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null)
    if (!event.over) return
    const task = tasks.find((item) => item.id === event.active.id)
    const status = PROJECT_KANBAN_STATUSES.find(
      (item) => item.id === event.over?.id,
    )?.id
    if (task && status) void moveTask(task, status)
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragCancel={() => setActiveTask(null)}
      onDragEnd={handleDragEnd}
    >
      <div
        className="flex snap-x gap-4 overflow-x-auto pb-4"
        aria-label="Kanban do projeto"
      >
        {PROJECT_KANBAN_STATUSES.map((status) => (
          <KanbanColumn
            key={status.id}
            status={status}
            tasks={visibleTasks.filter((task) => task.status === status.id)}
            disabled={disabled}
            onEdit={onEdit}
            onSelectStatus={(task, nextStatus) =>
              void moveTask(task, nextStatus)
            }
          />
        ))}
      </div>
      <DragOverlay>
        {activeTask ? (
          <div className="w-64 rounded-lg border border-primary/50 bg-card p-3 text-sm font-medium shadow-xl">
            {activeTask.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
