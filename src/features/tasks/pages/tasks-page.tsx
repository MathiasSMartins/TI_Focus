import {
  AlertTriangle,
  CheckCircle2,
  CircleDot,
  Columns3,
  Filter,
  List,
  LoaderCircle,
  Plus,
  Search,
  X,
} from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"

import { getITAreaConfig } from "@/config/it-area-config"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useAuth } from "@/features/auth"
import { useProjects } from "@/features/projects/hooks/use-projects"
import { TaskCard } from "@/features/tasks/components/task-card"
import { TaskFormDialog } from "@/features/tasks/components/task-form-dialog"
import { TaskKanban } from "@/features/tasks/components/task-kanban"
import { useTasks } from "@/features/tasks/hooks/use-tasks"
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  getTaskPriorityRank,
  type CreateTaskInput,
  type Task,
  type TaskPriority,
  type TaskSort,
  type TaskStatus,
  type TaskView,
} from "@/features/tasks/types/task"

function timestampValue(task: Task, field: "createdAt" | "updatedAt") {
  return task[field].toMillis()
}

function isOverdue(task: Task) {
  if (
    !task.dueAt ||
    task.status === "completed" ||
    task.status === "archived"
  ) {
    return false
  }
  const due = task.dueAt.toDate()
  due.setHours(23, 59, 59, 999)
  return due.getTime() < Date.now()
}

export function TasksPage() {
  const { user, profile } = useAuth()
  const areaConfig = getITAreaConfig(profile?.primaryArea)
  const taskState = useTasks(user?.uid)
  const projectState = useProjects(user?.uid)
  const [quickTitle, setQuickTitle] = useState("")
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all")
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all",
  )
  const [dueFilter, setDueFilter] = useState<"all" | "overdue" | "with-date">(
    "all",
  )
  const [sort, setSort] = useState<TaskSort>("updated-desc")
  const [view, setView] = useState<TaskView>("list")
  const [showFilters, setShowFilters] = useState(false)
  const [editorTask, setEditorTask] = useState<Task | null | undefined>()
  const [completedFeedback, setCompletedFeedback] = useState<Task | null>(null)

  const projectNames = useMemo(
    () =>
      new Map(
        projectState.projects.map((project) => [project.id, project.name]),
      ),
    [projectState.projects],
  )

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase("pt-BR")
    return taskState.tasks
      .filter((task) => statusFilter === "all" || task.status === statusFilter)
      .filter(
        (task) => priorityFilter === "all" || task.priority === priorityFilter,
      )
      .filter((task) => {
        if (dueFilter === "overdue") return isOverdue(task)
        if (dueFilter === "with-date") return Boolean(task.dueAt)
        return true
      })
      .filter((task) => {
        if (!normalizedSearch) return true
        return [
          task.title,
          task.description,
          task.category,
          task.projectId
            ? (projectNames.get(task.projectId) ?? task.project)
            : task.project,
          ...task.tags,
        ].some((value) =>
          value?.toLocaleLowerCase("pt-BR").includes(normalizedSearch),
        )
      })
      .slice()
      .sort((first, second) => {
        if (sort === "created-desc") {
          return (
            timestampValue(second, "createdAt") -
            timestampValue(first, "createdAt")
          )
        }
        if (sort === "due-asc") {
          return (
            (first.dueAt?.toMillis() ?? Number.MAX_SAFE_INTEGER) -
            (second.dueAt?.toMillis() ?? Number.MAX_SAFE_INTEGER)
          )
        }
        if (sort === "priority-desc") {
          return (
            getTaskPriorityRank(second.priority) -
            getTaskPriorityRank(first.priority)
          )
        }
        if (sort === "xp-desc") return second.xp - first.xp
        return (
          timestampValue(second, "updatedAt") -
          timestampValue(first, "updatedAt")
        )
      })
  }, [
    dueFilter,
    priorityFilter,
    projectNames,
    search,
    sort,
    statusFilter,
    taskState.tasks,
  ])

  const activeCount = taskState.tasks.filter(
    (task) => task.status !== "completed" && task.status !== "archived",
  ).length
  const inProgressCount = taskState.tasks.filter(
    (task) => task.status === "in-progress",
  ).length
  const completedCount = taskState.tasks.filter(
    (task) => task.status === "completed",
  ).length
  const overdueCount = taskState.tasks.filter(isOverdue).length

  function openEditor(task: Task | null) {
    taskState.clearError()
    setEditorTask(task)
  }

  function closeEditor() {
    taskState.clearError()
    setEditorTask(undefined)
  }

  async function handleQuickCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quickTitle.trim()) return
    const success = await taskState.createTask({
      title: quickTitle,
      ...(profile?.primaryArea ? { areaId: profile.primaryArea } : {}),
    })
    if (success) setQuickTitle("")
  }

  async function handleEditorSubmit(input: CreateTaskInput) {
    const wasCompleted = editorTask?.status === "completed"
    const success = editorTask
      ? await taskState.updateTask(editorTask.id, input)
      : await taskState.createTask(input)

    if (
      success &&
      editorTask &&
      input.status === "completed" &&
      !wasCompleted
    ) {
      setCompletedFeedback(editorTask)
    }
    return success
  }

  async function handleComplete(task: Task) {
    if (await taskState.completeTask(task.id)) setCompletedFeedback(task)
  }

  async function handleReopen(task: Task) {
    if (await taskState.reopenTask(task.id)) {
      if (completedFeedback?.id === task.id) setCompletedFeedback(null)
    }
  }

  async function handleMove(task: Task, status: TaskStatus) {
    if (status === task.status) return
    const success = await taskState.updateTask(task.id, { status })
    if (success && status === "completed") setCompletedFeedback(task)
  }

  function handleDelete(task: Task) {
    if (window.confirm(`Excluir definitivamente “${task.title}”?`)) {
      void taskState.deleteTask(task.id)
    }
  }

  const hasActiveFilters =
    statusFilter !== "all" || priorityFilter !== "all" || dueFilter !== "all"

  function clearFilters() {
    setStatusFilter("all")
    setPriorityFilter("all")
    setDueFilter("all")
  }

  const pageError = taskState.error ?? projectState.error

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            {areaConfig.titles.tasks}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Capture rapidamente, organize prioridades e acompanhe sua execução.
          </p>
        </div>
        <Button type="button" onClick={() => openEditor(null)}>
          <Plus /> Nova tarefa
        </Button>
      </section>

      <form
        className="flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/[0.04] p-4 sm:flex-row"
        onSubmit={handleQuickCreate}
      >
        <div className="relative flex-1">
          <Plus className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
          <Input
            aria-label="Título da nova tarefa"
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            maxLength={160}
            placeholder="Adicionar uma tarefa rapidamente..."
            className="pl-9"
            disabled={taskState.isMutating}
          />
        </div>
        <Button
          type="submit"
          disabled={taskState.isMutating || !quickTitle.trim()}
        >
          {taskState.isMutating ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <Plus />
          )}
          Adicionar
        </Button>
      </form>

      {completedFeedback && (
        <div
          role="status"
          className="flex flex-col gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-300 sm:flex-row sm:items-center"
        >
          <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />
          <p className="flex-1 text-sm">
            <strong>Tarefa concluída!</strong> A recompensa foi processada e
            registrada no seu histórico de XP.
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void handleReopen(completedFeedback)}
            disabled={taskState.isMutating}
          >
            Reabrir
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar feedback"
            onClick={() => setCompletedFeedback(null)}
          >
            <X />
          </Button>
        </div>
      )}

      {pageError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>{pageError}</span>
          <button
            type="button"
            className="underline"
            onClick={() => {
              taskState.clearError()
              projectState.clearError()
            }}
          >
            Fechar
          </button>
        </div>
      )}

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Resumo das tarefas"
      >
        {[
          { label: "Ativas", value: activeCount, icon: CircleDot },
          { label: "Em andamento", value: inProgressCount, icon: LoaderCircle },
          { label: "Concluídas", value: completedCount, icon: CheckCircle2 },
          { label: "Atrasadas", value: overdueCount, icon: AlertTriangle },
        ].map((item) => (
          <Card key={item.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <item.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-2xl font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="space-y-3" aria-label="Busca e filtros">
        <div className="flex flex-col gap-3 lg:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Buscar tarefas</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título, descrição, projeto ou tag..."
              className="pl-9"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters((current) => !current)}
            >
              <Filter /> Filtros
              {hasActiveFilters && <Badge className="ml-1">Ativos</Badge>}
            </Button>
            <select
              aria-label="Ordenar tarefas"
              value={sort}
              onChange={(event) => setSort(event.target.value as TaskSort)}
              className="h-10 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/20"
            >
              <option value="updated-desc">Atualizadas recentemente</option>
              <option value="created-desc">Mais recentes</option>
              <option value="due-asc">Prazo mais próximo</option>
              <option value="priority-desc">Maior prioridade</option>
              <option value="xp-desc">Maior XP</option>
            </select>
            <div className="flex rounded-lg border border-border p-1">
              <Button
                type="button"
                variant={view === "list" ? "secondary" : "ghost"}
                size="icon"
                aria-label="Visualização em lista"
                onClick={() => setView("list")}
              >
                <List />
              </Button>
              <Button
                type="button"
                variant={view === "kanban" ? "secondary" : "ghost"}
                size="icon"
                aria-label="Visualização Kanban"
                onClick={() => setView("kanban")}
              >
                <Columns3 />
              </Button>
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
            <label className="space-y-1 text-xs text-muted-foreground">
              Status
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as TaskStatus | "all")
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Todos</option>
                {TASK_STATUSES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Prioridade
              <select
                value={priorityFilter}
                onChange={(event) =>
                  setPriorityFilter(event.target.value as TaskPriority | "all")
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Todas</option>
                {TASK_PRIORITIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-muted-foreground">
              Prazo
              <select
                value={dueFilter}
                onChange={(event) =>
                  setDueFilter(event.target.value as typeof dueFilter)
                }
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground"
              >
                <option value="all">Todos</option>
                <option value="overdue">Atrasadas</option>
                <option value="with-date">Com prazo</option>
              </select>
            </label>
            <div className="flex items-end">
              <Button
                type="button"
                variant="ghost"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
              >
                Limpar filtros
              </Button>
            </div>
          </div>
        )}
      </section>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {filteredTasks.length}{" "}
          {filteredTasks.length === 1 ? "tarefa" : "tarefas"}
        </p>
      </div>

      {taskState.isLoading ? (
        <Card>
          <CardContent className="flex min-h-48 items-center justify-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="animate-spin" /> Carregando tarefas...
          </CardContent>
        </Card>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-56 flex-col items-center justify-center p-6 text-center">
            <CheckCircle2
              className="size-10 text-primary/60"
              aria-hidden="true"
            />
            <h3 className="mt-4 font-semibold">
              {taskState.tasks.length === 0
                ? "Sua lista está pronta"
                : "Nenhuma tarefa encontrada"}
            </h3>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">
              {taskState.tasks.length === 0
                ? "Digite um título acima para criar sua primeira tarefa em segundos."
                : "Ajuste a busca ou os filtros para encontrar outras tarefas."}
            </p>
          </CardContent>
        </Card>
      ) : view === "kanban" ? (
        <TaskKanban
          tasks={filteredTasks}
          disabled={taskState.isMutating}
          onEdit={openEditor}
          onMove={(task, status) => void handleMove(task, status)}
        />
      ) : (
        <div className="space-y-3">
          {filteredTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              projectName={
                task.projectId ? projectNames.get(task.projectId) : null
              }
              disabled={taskState.isMutating}
              onComplete={(item) => void handleComplete(item)}
              onReopen={(item) => void handleReopen(item)}
              onEdit={openEditor}
              onDuplicate={(item) => void taskState.duplicateTask(item.id)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {editorTask !== undefined && (
        <TaskFormDialog
          key={editorTask?.id ?? "new-task"}
          task={editorTask}
          areaConfig={areaConfig}
          defaultAreaId={profile?.primaryArea ?? null}
          isSubmitting={taskState.isMutating}
          error={taskState.error}
          onClose={closeEditor}
          onSubmit={handleEditorSubmit}
        />
      )}
    </div>
  )
}
