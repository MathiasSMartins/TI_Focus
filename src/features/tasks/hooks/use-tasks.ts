import { useCallback, useEffect, useState } from "react"

import {
  completeTask as completeTaskInRepository,
  createTask as createTaskInRepository,
  deleteTask as deleteTaskInRepository,
  duplicateTask as duplicateTaskInRepository,
  reopenTask as reopenTaskInRepository,
  subscribeToTasks,
  updateTask as updateTaskInRepository,
} from "@/features/tasks/services/task-repository"
import type {
  CreateTaskInput,
  Task,
  UpdateTaskInput,
} from "@/features/tasks/types/task"

function getTaskErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação. Tente novamente."
}

interface TaskSnapshotState {
  uid: string
  tasks: Task[]
  error: string | null
}

interface TaskActionState {
  uid: string
  pendingActions: number
  error: string | null
}

export function useTasks(uid: string | undefined) {
  const [snapshotState, setSnapshotState] = useState<TaskSnapshotState | null>(
    null,
  )
  const [actionState, setActionState] = useState<TaskActionState | null>(null)

  useEffect(() => {
    if (!uid) return
    let active = true

    const unsubscribe = subscribeToTasks(
      uid,
      (nextTasks) => {
        if (!active) return
        setSnapshotState({ uid, tasks: nextTasks, error: null })
      },
      (subscriptionError) => {
        if (!active) return
        setSnapshotState({
          uid,
          tasks: [],
          error: getTaskErrorMessage(subscriptionError),
        })
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [uid])

  const runAction = useCallback(
    async (actionUid: string, action: () => Promise<unknown>) => {
      setActionState((current) => ({
        uid: actionUid,
        pendingActions:
          current?.uid === actionUid ? current.pendingActions + 1 : 1,
        error: null,
      }))
      try {
        await action()
        return true
      } catch (error) {
        setActionState((current) =>
          current?.uid === actionUid
            ? { ...current, error: getTaskErrorMessage(error) }
            : current,
        )
        return false
      } finally {
        setActionState((current) =>
          current?.uid === actionUid
            ? {
                ...current,
                pendingActions: Math.max(0, current.pendingActions - 1),
              }
            : current,
        )
      }
    },
    [],
  )

  const createTask = useCallback(
    (input: CreateTaskInput) =>
      uid ? runAction(uid, () => createTaskInRepository(uid, input)) : false,
    [runAction, uid],
  )

  const updateTask = useCallback(
    (taskId: string, input: UpdateTaskInput) =>
      uid
        ? runAction(uid, () => updateTaskInRepository(uid, taskId, input))
        : false,
    [runAction, uid],
  )

  const deleteTask = useCallback(
    (taskId: string) =>
      uid ? runAction(uid, () => deleteTaskInRepository(uid, taskId)) : false,
    [runAction, uid],
  )

  const duplicateTask = useCallback(
    (taskId: string) =>
      uid
        ? runAction(uid, () => duplicateTaskInRepository(uid, taskId))
        : false,
    [runAction, uid],
  )

  const completeTask = useCallback(
    (taskId: string) =>
      uid ? runAction(uid, () => completeTaskInRepository(uid, taskId)) : false,
    [runAction, uid],
  )

  const reopenTask = useCallback(
    (taskId: string) =>
      uid ? runAction(uid, () => reopenTaskInRepository(uid, taskId)) : false,
    [runAction, uid],
  )

  const currentSnapshot = snapshotState?.uid === uid ? snapshotState : null
  const currentActionState = actionState?.uid === uid ? actionState : null
  const clearError = useCallback(() => {
    setActionState((current) =>
      current && current.uid === uid ? { ...current, error: null } : current,
    )
    setSnapshotState((current) =>
      current && current.uid === uid ? { ...current, error: null } : current,
    )
  }, [uid])

  return {
    tasks: currentSnapshot?.tasks ?? [],
    isLoading: Boolean(uid) && currentSnapshot === null,
    isMutating: (currentActionState?.pendingActions ?? 0) > 0,
    error: currentActionState?.error ?? currentSnapshot?.error ?? null,
    clearError,
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
    completeTask,
    reopenTask,
  }
}
