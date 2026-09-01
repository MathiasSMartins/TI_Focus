export const PROJECT_COMPLETED = "PROJECT_COMPLETED" as const

export interface ProjectCompletedEvent {
  type: typeof PROJECT_COMPLETED
  version: 1
  userId: string
  projectId: string
  firstCompletion?: boolean
}

type ProjectCompletedListener = (event: ProjectCompletedEvent) => void

const listeners = new Set<ProjectCompletedListener>()

export function publishProjectCompleted(event: ProjectCompletedEvent) {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // A falha de um consumidor não deve interromper os demais.
    }
  }
}

export function subscribeToProjectCompleted(
  listener: ProjectCompletedListener,
) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
