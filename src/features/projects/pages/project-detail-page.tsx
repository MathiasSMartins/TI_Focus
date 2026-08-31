import {
  Archive,
  ArrowLeft,
  FolderX,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth"
import { ProjectDashboard } from "@/features/projects/components/project-dashboard"
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog"
import { ProjectKanban } from "@/features/projects/components/project-kanban"
import { useProjects } from "@/features/projects/hooks/use-projects"
import {
  getProjectMetrics,
  getProjectStatusLabel,
  isTaskInProject,
  type CreateProjectInput,
} from "@/features/projects/types/project"
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog"
import { useTasks } from "@/features/tasks/hooks/use-tasks"
import type {
  CreateTaskInput,
  Task,
  TaskStatus,
} from "@/features/tasks/types/task"

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const projectState = useProjects(user?.uid)
  const taskState = useTasks(user?.uid)
  const [quickTitle, setQuickTitle] = useState("")
  const [editorTask, setEditorTask] = useState<Task | null | undefined>()
  const [showProjectEditor, setShowProjectEditor] = useState(false)
  const [moveFeedback, setMoveFeedback] = useState<string | null>(null)

  const project = projectState.projects.find((item) => item.id === projectId)
  const projectTasks = useMemo(
    () =>
      project
        ? taskState.tasks.filter((task) =>
            isTaskInProject(task, project, projectState.projects),
          )
        : [],
    [project, projectState.projects, taskState.tasks],
  )
  const metrics = project ? getProjectMetrics(project, projectTasks) : null

  async function handleQuickCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quickTitle.trim() || !project) return
    const success = await taskState.createTask({
      title: quickTitle,
      status: "backlog",
      projectId: project.id,
      project: project.name,
      kanbanOrder: null,
    })
    if (success) setQuickTitle("")
  }

  async function handleTaskSubmit(input: CreateTaskInput) {
    if (!project) return false
    return editorTask
      ? taskState.updateTask(editorTask.id, input)
      : taskState.createTask({
          ...input,
          projectId: project.id,
          project: project.name,
        })
  }

  async function handleMoveTask(
    task: Task,
    status: TaskStatus,
    kanbanOrder: number,
  ) {
    if (!project) return false
    const success = await taskState.updateTask(task.id, {
      status,
      kanbanOrder,
      ...(task.projectId
        ? {}
        : { projectId: project.id, project: project.name }),
    })
    if (success) {
      setMoveFeedback(
        `“${task.title}” movida para ${
          status === "completed" ? "Concluídas" : "a nova coluna"
        }.`,
      )
    }
    return success
  }

  async function handleProjectSubmit(input: CreateProjectInput) {
    if (!project) return false

    const legacyTasks = projectTasks.filter((task) => !task.projectId)
    if (legacyTasks.length > 0) {
      const migrationResults = await Promise.all(
        legacyTasks.map((task) =>
          taskState.updateTask(task.id, {
            projectId: project.id,
            project: project.name,
          }),
        ),
      )
      if (!migrationResults.every(Boolean)) return false
    }

    return projectState.updateProject(project.id, input)
  }

  function handleArchive() {
    if (!project) return
    if (window.confirm(`Arquivar o projeto “${project.name}”?`)) {
      void projectState.archiveProject(project.id)
    }
  }

  async function handleDelete() {
    if (!project) return
    const linkedMessage =
      projectTasks.length > 0
        ? ` As ${projectTasks.length} tarefa(s) continuarão disponíveis na lista geral.`
        : ""
    if (
      window.confirm(
        `Excluir “${project.name}” da área de projetos?${linkedMessage}`,
      )
    ) {
      const success = await projectState.deleteProject(project.id)
      if (success) navigate("/projects")
    }
  }

  if (projectState.isLoading || taskState.isLoading) {
    return (
      <Card>
        <CardContent className="flex min-h-72 items-center justify-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="animate-spin" /> Carregando projeto...
        </CardContent>
      </Card>
    )
  }

  if (!project || !metrics) {
    return (
      <Card>
        <CardContent className="flex min-h-72 flex-col items-center justify-center p-6 text-center">
          <FolderX
            className="size-12 text-muted-foreground"
            aria-hidden="true"
          />
          <h2 className="mt-4 text-xl font-semibold">Projeto não encontrado</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            O projeto pode ter sido removido ou não pertence à sua conta.
          </p>
          <Button asChild className="mt-5">
            <Link to="/projects">Voltar para projetos</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const isArchived = project.status === "archived"
  const error = projectState.error ?? taskState.error

  return (
    <div className="space-y-7">
      <Link
        to="/projects"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Voltar para projetos
      </Link>

      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={isArchived ? "outline" : "secondary"}>
              {getProjectStatusLabel(project.status)}
            </Badge>
            {project.category && (
              <Badge variant="outline">{project.category}</Badge>
            )}
          </div>
          <h2 className="mt-3 break-words text-2xl font-bold tracking-tight sm:text-3xl">
            {project.name}
          </h2>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            {project.description ?? "Projeto sem descrição."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              projectState.clearError()
              setShowProjectEditor(true)
            }}
          >
            <Pencil /> Editar
          </Button>
          {!isArchived && (
            <Button type="button" variant="outline" onClick={handleArchive}>
              <Archive /> Arquivar
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            onClick={() => void handleDelete()}
          >
            <Trash2 /> Excluir
          </Button>
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
      {moveFeedback && (
        <div
          role="status"
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"
        >
          {moveFeedback}
        </div>
      )}

      <ProjectDashboard project={project} metrics={metrics} />

      <section className="space-y-4" aria-labelledby="project-kanban-title">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="project-kanban-title" className="text-lg font-semibold">
              Kanban de tarefas
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Arraste entre colunas ou use o seletor em cada card.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              taskState.clearError()
              setEditorTask(null)
            }}
            disabled={isArchived}
          >
            <Plus /> Nova tarefa
          </Button>
        </div>

        <form
          className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4 sm:flex-row"
          onSubmit={handleQuickCreate}
        >
          <Input
            aria-label="Título da nova tarefa do projeto"
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            maxLength={160}
            placeholder="Adicionar tarefa ao backlog..."
            disabled={isArchived || taskState.isMutating}
          />
          <Button
            type="submit"
            disabled={isArchived || taskState.isMutating || !quickTitle.trim()}
          >
            {taskState.isMutating ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <Plus />
            )}
            Adicionar
          </Button>
        </form>

        {isArchived && (
          <p className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
            Projeto arquivado: edite o status para voltar a criar ou mover
            tarefas.
          </p>
        )}

        <ProjectKanban
          tasks={projectTasks}
          disabled={isArchived || taskState.isMutating}
          onEdit={(task) => {
            taskState.clearError()
            setEditorTask(task)
          }}
          onMove={handleMoveTask}
        />

        {projectTasks.some((task) => task.status === "archived") && (
          <p className="text-xs text-muted-foreground">
            {projectTasks.filter((task) => task.status === "archived").length}{" "}
            tarefa(s) arquivada(s) não aparecem no Kanban.
          </p>
        )}
      </section>

      {editorTask !== undefined && (
        <TaskFormDialog
          key={editorTask?.id ?? "new-project-task"}
          task={editorTask}
          projectContext={{ id: project.id, name: project.name }}
          isSubmitting={taskState.isMutating}
          error={taskState.error}
          onClose={() => {
            taskState.clearError()
            setEditorTask(undefined)
          }}
          onSubmit={handleTaskSubmit}
        />
      )}

      {showProjectEditor && (
        <ProjectFormDialog
          project={project}
          isSubmitting={projectState.isMutating}
          error={projectState.error}
          onClose={() => {
            projectState.clearError()
            setShowProjectEditor(false)
          }}
          onSubmit={handleProjectSubmit}
        />
      )}
    </div>
  )
}
