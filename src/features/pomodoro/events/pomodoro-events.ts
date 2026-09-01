import type { PomodoroCompletedEvent } from "@/features/pomodoro/types/pomodoro"

type PomodoroCompletedListener = (event: PomodoroCompletedEvent) => void
const listeners = new Set<PomodoroCompletedListener>()

export function publishPomodoroCompleted(event: PomodoroCompletedEvent) {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch (error) {
      void error
    }
  }
}

export function subscribeToPomodoroCompleted(
  listener: PomodoroCompletedListener,
) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
