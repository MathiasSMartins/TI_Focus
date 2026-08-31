import { LoaderCircle, X } from "lucide-react"
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
} from "react"

import { Button } from "@/components/ui/button"
import { FormMessage } from "@/components/ui/form-message"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getTaskXpReward } from "@/features/gamification"
import {
  MAX_TASK_ESTIMATE_MINUTES,
  MAX_TASK_TAG_LENGTH,
  MAX_TASK_TAGS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type CreateTaskInput,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/features/tasks/types/task"

interface TaskFormDialogProps {
  task?: Task | null
  projectContext?: { id: string; name: string }
  isSubmitting: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (input: CreateTaskInput) => Promise<boolean>
}

function toDateInputValue(task: Task | null | undefined) {
  if (!task?.dueAt) return ""
  const date = task.dueAt.toDate()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function fromDateInputValue(value: string) {
  if (!value) return null
  const date = new Date(`${value}T23:59:59`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function TaskFormDialog({
  task,
  projectContext,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: TaskFormDialogProps) {
  const [title, setTitle] = useState(task?.title ?? "")
  const [description, setDescription] = useState(task?.description ?? "")
  const [category, setCategory] = useState(task?.category ?? "")
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? "medium",
  )
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "todo")
  const [project, setProject] = useState(
    projectContext?.name ?? task?.project ?? "",
  )
  const [dueDate, setDueDate] = useState(toDateInputValue(task))
  const [estimate, setEstimate] = useState(
    task?.estimateMinutes?.toString() ?? "",
  )
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "")
  const [validationError, setValidationError] = useState<string | null>(null)
  const dialogRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previousFocus = document.activeElement as HTMLElement | null
    return () => previousFocus?.focus()
  }, [])

  function handleDialogKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
    if (event.key === "Escape" && !isSubmitting) {
      event.preventDefault()
      onClose()
      return
    }
    if (event.key !== "Tab" || !dialogRef.current) return

    const focusable = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    )
    const first = focusable[0]
    const last = focusable.at(-1)
    if (!first || !last) return

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget && !isSubmitting) onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setValidationError("Informe um título para a tarefa.")
      return
    }

    const estimateMinutes = estimate ? Number(estimate) : null
    if (
      estimateMinutes != null &&
      (!Number.isInteger(estimateMinutes) ||
        estimateMinutes < 1 ||
        estimateMinutes > MAX_TASK_ESTIMATE_MINUTES)
    ) {
      setValidationError("A estimativa deve estar entre 1 e 1440 minutos.")
      return
    }
    const normalizedTags = [
      ...new Set(tags.split(",").map((tag) => tag.trim())),
    ].filter(Boolean)
    if (normalizedTags.length > MAX_TASK_TAGS) {
      setValidationError(`Use no máximo ${MAX_TASK_TAGS} tags.`)
      return
    }
    if (normalizedTags.some((tag) => tag.length > MAX_TASK_TAG_LENGTH)) {
      setValidationError(
        `Cada tag deve ter até ${MAX_TASK_TAG_LENGTH} caracteres.`,
      )
      return
    }

    setValidationError(null)
    const success = await onSubmit({
      title,
      description,
      category,
      priority,
      status,
      ...(projectContext
        ? task?.projectId
          ? {}
          : {
              project: projectContext.name,
              projectId: projectContext.id,
              ...(task ? {} : { kanbanOrder: null }),
            }
        : task?.projectId
          ? {}
          : { project }),
      dueDate: fromDateInputValue(dueDate),
      estimateMinutes,
      tags: normalizedTags,
    })
    if (success) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
        onKeyDown={handleDialogKeyDown}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card/95 p-5 backdrop-blur">
          <div>
            <h2 id="task-form-title" className="text-xl font-semibold">
              {task ? "Editar tarefa" : "Nova tarefa"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Apenas o título é obrigatório. Os demais campos são opcionais.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar formulário"
            onClick={onClose}
            disabled={isSubmitting}
          >
            <X />
          </Button>
        </header>

        <form className="space-y-5 p-5" onSubmit={handleSubmit}>
          {(validationError || error) && (
            <FormMessage>{validationError ?? error ?? ""}</FormMessage>
          )}

          <div className="space-y-2">
            <Label htmlFor="task-title">Título</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={160}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Descrição</Label>
            <textarea
              id="task-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={5000}
              rows={4}
              disabled={isSubmitting}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/50 focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
              placeholder="Contexto, critérios ou próximos passos..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="task-status">Status</Label>
              <select
                id="task-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as TaskStatus)
                }
                disabled={isSubmitting}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
              >
                {TASK_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-priority">Prioridade</Label>
              <select
                id="task-priority"
                value={priority}
                onChange={(event) =>
                  setPriority(event.target.value as TaskPriority)
                }
                disabled={isSubmitting}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
              >
                {TASK_PRIORITIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-category">Categoria</Label>
              <Input
                id="task-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={80}
                placeholder="Ex.: Desenvolvimento"
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-project">Projeto</Label>
              <Input
                id="task-project"
                value={project}
                onChange={(event) => setProject(event.target.value)}
                maxLength={80}
                placeholder="Opcional"
                disabled={
                  isSubmitting || Boolean(projectContext || task?.projectId)
                }
              />
              {(projectContext || task?.projectId) && (
                <p className="text-xs text-muted-foreground">
                  {task?.projectId
                    ? "O projeto é definido pelo vínculo atual da tarefa."
                    : "Esta tarefa ficará vinculada ao projeto aberto."}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-due-date">Prazo</Label>
              <Input
                id="task-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="task-estimate">Estimativa em minutos</Label>
              <Input
                id="task-estimate"
                type="number"
                min={1}
                max={MAX_TASK_ESTIMATE_MINUTES}
                value={estimate}
                onChange={(event) => setEstimate(event.target.value)}
                placeholder="Ex.: 45"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-tags">Tags</Label>
            <Input
              id="task-tags"
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="frontend, urgente, cliente"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Separe por vírgulas. Máximo de 10 tags.
            </p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-medium text-foreground">
              Recompensa ao concluir: {getTaskXpReward(priority)} XP
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              O valor é calculado pela dificuldade e concedido apenas uma vez
              por tarefa.
            </p>
          </div>

          <footer className="flex justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" />}
              {isSubmitting
                ? "Salvando..."
                : task
                  ? "Salvar alterações"
                  : "Criar tarefa"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  )
}
