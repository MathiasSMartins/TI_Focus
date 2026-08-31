import { Timestamp } from "firebase/firestore"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { AuthContext } from "@/features/auth/context/auth-context"
import type { AuthContextValue } from "@/features/auth/types/auth"
import { TasksPage } from "@/features/tasks/pages/tasks-page"
import type { Task } from "@/features/tasks/types/task"

const taskHook = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}))

vi.mock("@/features/projects/hooks/use-projects", () => ({
  useProjects: () => ({
    projects: [],
    isLoading: false,
    isMutating: false,
    error: null,
    clearError: vi.fn(),
  }),
}))

vi.mock("@/features/tasks/hooks/use-tasks", () => ({
  useTasks: () => taskHook.current,
}))

const task: Task = {
  id: "task-1",
  title: "Implementar API",
  description: "Criar os endpoints principais",
  category: "Desenvolvimento",
  priority: "high",
  status: "todo",
  project: "TI Focus",
  dueAt: Timestamp.fromDate(new Date("2026-09-01T23:59:59")),
  estimateMinutes: 90,
  tags: ["backend"],
  xp: 20,
  createdAt: Timestamp.fromDate(new Date("2026-08-27T10:00:00")),
  updatedAt: Timestamp.fromDate(new Date("2026-08-27T10:00:00")),
  completedAt: null,
}

const actions = {
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  duplicateTask: vi.fn(),
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
  clearError: vi.fn(),
}

const authValue: AuthContextValue = {
  user: { uid: "user-1" } as AuthContextValue["user"],
  profile: null,
  isInitializing: false,
  isSubmitting: false,
  isGoogleLoginEnabled: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  loginWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
  logout: vi.fn(),
  completeOnboarding: vi.fn(),
  reloadProfile: vi.fn(),
  clearError: vi.fn(),
}

function renderPage() {
  render(
    <AuthContext.Provider value={authValue}>
      <TasksPage />
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.values(actions).forEach((action) => action.mockResolvedValue(true))
  taskHook.current = {
    tasks: [task],
    isLoading: false,
    isMutating: false,
    error: null,
    ...actions,
  }
})

describe("TasksPage", () => {
  it("cria uma tarefa rapidamente somente com o título", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(
      screen.getByLabelText("Título da nova tarefa"),
      "Revisar PR",
    )
    await user.click(screen.getByRole("button", { name: "Adicionar" }))

    expect(actions.createTask).toHaveBeenCalledWith({ title: "Revisar PR" })
  })

  it("edita todos os dados pelo formulário avançado", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole("button", { name: "Editar Implementar API" }),
    )
    const title = screen.getByLabelText("Título")
    await user.clear(title)
    await user.type(title, "Implementar API v2")
    await user.selectOptions(screen.getByLabelText("Prioridade"), "critical")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(actions.updateTask).toHaveBeenCalledWith(
      "task-1",
      expect.objectContaining({
        title: "Implementar API v2",
        priority: "critical",
        status: "todo",
      }),
    )
  })

  it("exclui após confirmação explícita", async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    renderPage()

    await user.click(
      screen.getByRole("button", { name: "Excluir Implementar API" }),
    )

    expect(confirm).toHaveBeenCalledWith(
      "Excluir definitivamente “Implementar API”?",
    )
    expect(actions.deleteTask).toHaveBeenCalledWith("task-1")
    confirm.mockRestore()
  })

  it("duplica uma tarefa existente", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole("button", { name: "Duplicar Implementar API" }),
    )

    expect(actions.duplicateTask).toHaveBeenCalledWith("task-1")
  })

  it("conclui e apresenta feedback visual para o evento TASK_COMPLETED", async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      screen.getByRole("button", { name: "Concluir Implementar API" }),
    )

    expect(actions.completeTask).toHaveBeenCalledWith("task-1")
    expect(
      await screen.findByText(/A recompensa foi processada/),
    ).toBeInTheDocument()
  })
})
