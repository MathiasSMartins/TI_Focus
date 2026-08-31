export const TASK_COMPLETED = "TASK_COMPLETED" as const

export interface TaskCompletedEvent {
  type: typeof TASK_COMPLETED
  version: 1
  userId: string
  taskId: string
  xp: number
  occurredAt: Date
}

type TaskCompletedListener = (event: TaskCompletedEvent) => void

const taskCompletedListeners = new Set<TaskCompletedListener>()

export function publishTaskCompleted(event: TaskCompletedEvent) {
  for (const listener of taskCompletedListeners) {
    try {
      listener(event)
    } catch (listenerError) {
      void listenerError
    }
  }
}

export function subscribeToTaskCompleted(listener: TaskCompletedListener) {
  taskCompletedListeners.add(listener)
  return () => taskCompletedListeners.delete(listener)
}
