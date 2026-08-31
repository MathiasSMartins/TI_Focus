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
import {
  MAX_PROJECT_CATEGORY_LENGTH,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_INVESTED_MINUTES,
  MAX_PROJECT_NAME_LENGTH,
  PROJECT_STATUSES,
  type CreateProjectInput,
  type Project,
  type ProjectStatus,
} from "@/features/projects/types/project"

interface ProjectFormDialogProps {
  project?: Project | null
  isSubmitting: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (input: CreateProjectInput) => Promise<boolean>
}

function toDateInputValue(project: Project | null | undefined) {
  if (!project?.dueAt) return ""
  const date = project.dueAt.toDate()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${date.getFullYear()}-${month}-${day}`
}

function fromDateInputValue(value: string) {
  if (!value) return null
  const date = new Date(`${value}T23:59:59`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function ProjectFormDialog({
  project,
  isSubmitting,
  error,
  onClose,
  onSubmit,
}: ProjectFormDialogProps) {
  const [name, setName] = useState(project?.name ?? "")
  const [description, setDescription] = useState(project?.description ?? "")
  const [status, setStatus] = useState<ProjectStatus>(
    project?.status ?? "planning",
  )
  const [dueDate, setDueDate] = useState(toDateInputValue(project))
  const [category, setCategory] = useState(project?.category ?? "")
  const [investedMinutes, setInvestedMinutes] = useState(
    project?.investedMinutes.toString() ?? "0",
  )
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
    if (!name.trim()) {
      setValidationError("Informe um nome para o projeto.")
      return
    }

    const minutes = Number(investedMinutes)
    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      minutes > MAX_PROJECT_INVESTED_MINUTES
    ) {
      setValidationError("Informe um tempo investido válido em minutos.")
      return
    }

    setValidationError(null)
    const success = await onSubmit({
      name,
      description,
      status,
      dueDate: fromDateInputValue(dueDate),
      category,
      investedMinutes: minutes,
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
        aria-labelledby="project-form-title"
        onKeyDown={handleDialogKeyDown}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card shadow-2xl"
      >
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-card/95 p-5 backdrop-blur">
          <div>
            <h2 id="project-form-title" className="text-xl font-semibold">
              {project ? "Editar projeto" : "Novo projeto"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Organize escopo, prazo e tempo investido em um só lugar.
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
            <Label htmlFor="project-name">Nome</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={MAX_PROJECT_NAME_LENGTH}
              autoFocus
              disabled={isSubmitting}
              placeholder="Ex.: Migração para a nuvem"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Descrição</Label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              maxLength={MAX_PROJECT_DESCRIPTION_LENGTH}
              rows={4}
              disabled={isSubmitting}
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/20 disabled:opacity-50"
              placeholder="Objetivo, escopo e resultado esperado..."
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="project-status">Status</Label>
              <select
                id="project-status"
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as ProjectStatus)
                }
                disabled={isSubmitting}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
              >
                {PROJECT_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-category">Categoria</Label>
              <Input
                id="project-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                maxLength={MAX_PROJECT_CATEGORY_LENGTH}
                disabled={isSubmitting}
                placeholder="Ex.: Infraestrutura"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-due-date">Prazo</Label>
              <Input
                id="project-due-date"
                type="date"
                value={dueDate}
                onChange={(event) => setDueDate(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-invested-minutes">
                Tempo investido em minutos
              </Label>
              <Input
                id="project-invested-minutes"
                type="number"
                min={0}
                max={MAX_PROJECT_INVESTED_MINUTES}
                value={investedMinutes}
                onChange={(event) => setInvestedMinutes(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <footer className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-end">
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
                : project
                  ? "Salvar alterações"
                  : "Criar projeto"}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  )
}
