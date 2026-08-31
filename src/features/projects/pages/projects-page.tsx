import { FolderKanban, LoaderCircle, Plus, Search } from "lucide-react"
import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth"
import { ProjectCard } from "@/features/projects/components/project-card"
import { ProjectFormDialog } from "@/features/projects/components/project-form-dialog"
import { useProjects } from "@/features/projects/hooks/use-projects"
import {
  PROJECT_STATUSES,
  getProjectMetrics,
  isTaskInProject,
  type CreateProjectInput,
  type Project,
  type ProjectStatus,
} from "@/features/projects/types/project"
import { useTasks } from "@/features/tasks/hooks/use-tasks"

export function ProjectsPage() {
  const { user } = useAuth()
  const projectState = useProjects(user?.uid)
  const taskState = useTasks(user?.uid)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all")
  const [editorProject, setEditorProject] = useState<
    Project | null | undefined
  >()

  const filteredProjects = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR")
    return projectState.projects.filter((project) => {
      if (statusFilter !== "all" && project.status !== statusFilter) {
        return false
      }
      if (!normalizedSearch) return true
      return [project.name, project.description, project.category].some(
        (value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
      )
    })
  }, [projectState.projects, search, statusFilter])

  function openEditor(project: Project | null) {
    projectState.clearError()
    setEditorProject(project)
  }

  function closeEditor() {
    projectState.clearError()
    setEditorProject(undefined)
  }

  async function handleSubmit(input: CreateProjectInput) {
    if (!editorProject) return projectState.createProject(input)

    const legacyTasks = taskState.tasks.filter(
      (task) =>
        isTaskInProject(task, editorProject, projectState.projects) &&
        !task.projectId,
    )
    if (legacyTasks.length > 0) {
      const migrationResults = await Promise.all(
        legacyTasks.map((task) =>
          taskState.updateTask(task.id, {
            projectId: editorProject.id,
            project: editorProject.name,
          }),
        ),
      )
      if (!migrationResults.every(Boolean)) return false
    }

    return projectState.updateProject(editorProject.id, input)
  }

  function handleArchive(project: Project) {
    if (window.confirm(`Arquivar o projeto “${project.name}”?`)) {
      void projectState.archiveProject(project.id)
    }
  }

  function handleDelete(project: Project) {
    const linkedTasks = taskState.tasks.filter((task) =>
      isTaskInProject(task, project, projectState.projects),
    ).length
    const linkedMessage =
      linkedTasks > 0
        ? ` As ${linkedTasks} tarefa(s) vinculada(s) continuarão disponíveis na lista geral.`
        : ""
    if (
      window.confirm(
        `Excluir “${project.name}” da área de projetos?${linkedMessage}`,
      )
    ) {
      void projectState.deleteProject(project.id)
    }
  }

  const error = projectState.error ?? taskState.error
  const archivedCount = projectState.projects.filter(
    (project) => project.status === "archived",
  ).length

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Projetos
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Reúna tarefas, progresso, XP e tempo investido por iniciativa.
          </p>
        </div>
        <Button type="button" onClick={() => openEditor(null)}>
          <Plus /> Novo projeto
        </Button>
      </section>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            className="underline"
            onClick={() => {
              projectState.clearError()
              taskState.clearError()
            }}
          >
            Fechar
          </button>
        </div>
      )}

      <section
        className="grid gap-3 sm:grid-cols-3"
        aria-label="Resumo dos projetos"
      >
        {[
          { label: "Total", value: projectState.projects.length },
          {
            label: "Em andamento",
            value: projectState.projects.filter(
              (project) => project.status === "in-progress",
            ).length,
          },
          { label: "Arquivados", value: archivedCount },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="p-4">
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-muted-foreground">{item.label}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section
        className="flex flex-col gap-3 sm:flex-row"
        aria-label="Busca e filtro de projetos"
      >
        <label className="relative flex-1">
          <span className="sr-only">Buscar projetos</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar por nome, descrição ou categoria..."
            className="pl-9"
          />
        </label>
        <select
          aria-label="Filtrar projetos por status"
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value as ProjectStatus | "all")
          }
          className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
        >
          <option value="all">Todos os status</option>
          {PROJECT_STATUSES.map((status) => (
            <option key={status.id} value={status.id}>
              {status.label}
            </option>
          ))}
        </select>
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filteredProjects.length}{" "}
          {filteredProjects.length === 1 ? "projeto" : "projetos"}
        </p>
        {statusFilter !== "all" && (
          <Badge variant="outline">Filtro ativo</Badge>
        )}
      </div>

      {projectState.isLoading || taskState.isLoading ? (
        <Card>
          <CardContent className="flex min-h-56 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="animate-spin" /> Carregando projetos...
          </CardContent>
        </Card>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-64 flex-col items-center justify-center p-6 text-center">
            <FolderKanban
              className="size-11 text-primary/60"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">
              {projectState.projects.length === 0
                ? "Crie seu primeiro projeto"
                : "Nenhum projeto encontrado"}
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {projectState.projects.length === 0
                ? "Organize tarefas relacionadas e acompanhe o progresso em um Kanban dedicado."
                : "Ajuste a busca ou o filtro para encontrar outros projetos."}
            </p>
            {projectState.projects.length === 0 && (
              <Button className="mt-5" onClick={() => openEditor(null)}>
                <Plus /> Criar projeto
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {filteredProjects.map((project) => {
            const tasks = taskState.tasks.filter((task) =>
              isTaskInProject(task, project, projectState.projects),
            )
            return (
              <ProjectCard
                key={project.id}
                project={project}
                metrics={getProjectMetrics(project, tasks)}
                disabled={projectState.isMutating}
                onEdit={openEditor}
                onArchive={handleArchive}
                onDelete={handleDelete}
              />
            )
          })}
        </div>
      )}

      {editorProject !== undefined && (
        <ProjectFormDialog
          key={editorProject?.id ?? "new-project"}
          project={editorProject}
          isSubmitting={projectState.isMutating}
          error={projectState.error}
          onClose={closeEditor}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  )
}
