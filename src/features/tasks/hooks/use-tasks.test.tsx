import { Timestamp } from "firebase/firestore"
import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useTasks } from "@/features/tasks/hooks/use-tasks"
import type { Task } from "@/features/tasks/types/task"

const repository = vi.hoisted(() => ({
  subscribeToTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  duplicateTask: vi.fn(),
  completeTask: vi.fn(),
  reopenTask: vi.fn(),
}))

vi.mock("@/features/tasks/services/task-repository", () => repository)

const task: Task = {
  id: "task-a",
  title: "Tarefa da conta A",
  description: null,
  category: null,
  priority: "medium",
  status: "todo",
  project: null,
  dueAt: null,
  estimateMinutes: null,
  tags: [],
  xp: 10,
  createdAt: Timestamp.fromMillis(1),
  updatedAt: Timestamp.fromMillis(1),
  completedAt: null,
}

describe("useTasks", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    repository.subscribeToTasks.mockImplementation(() => vi.fn())
    repository.createTask.mockResolvedValue(undefined)
  })

  it("não expõe tarefas da conta anterior durante troca de UID", () => {
    const subscriptions = new Map<
      string,
      {
        onValue: (tasks: Task[]) => void
        unsubscribe: ReturnType<typeof vi.fn>
      }
    >()
    repository.subscribeToTasks.mockImplementation(
      (uid: string, onValue: (tasks: Task[]) => void) => {
        const unsubscribe = vi.fn()
        subscriptions.set(uid, { onValue, unsubscribe })
        return unsubscribe
      },
    )

    const { result, rerender } = renderHook(
      ({ uid }: { uid?: string }) => useTasks(uid),
      { initialProps: { uid: "user-a" } },
    )

    act(() => subscriptions.get("user-a")?.onValue([task]))
    expect(result.current.tasks).toEqual([task])
    expect(result.current.isLoading).toBe(false)

    rerender({ uid: "user-b" })

    expect(subscriptions.get("user-a")?.unsubscribe).toHaveBeenCalled()
    expect(result.current.tasks).toEqual([])
    expect(result.current.isLoading).toBe(true)
  })

  it("ignora mutação e erro tardios da conta anterior", async () => {
    let rejectCreate!: (reason?: unknown) => void
    repository.createTask.mockReturnValueOnce(
      new Promise((_, reject) => {
        rejectCreate = reject
      }),
    )

    const { result, rerender } = renderHook(
      ({ uid }: { uid?: string }) => useTasks(uid),
      { initialProps: { uid: "user-a" } },
    )

    let pendingAction!: boolean | Promise<boolean>
    act(() => {
      pendingAction = result.current.createTask({ title: "Tarefa pendente" })
    })
    expect(result.current.isMutating).toBe(true)

    rerender({ uid: "user-b" })
    expect(result.current.isMutating).toBe(false)
    expect(result.current.error).toBeNull()

    await act(async () => {
      rejectCreate(new Error("Falha da conta A"))
      await pendingAction
    })

    expect(result.current.isMutating).toBe(false)
    expect(result.current.error).toBeNull()
  })
})
