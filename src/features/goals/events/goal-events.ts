import type { GoalCompletedEvent } from "@/features/goals/types/goal"

type GoalCompletedListener = (event: GoalCompletedEvent) => void

const listeners = new Set<GoalCompletedListener>()

export function publishGoalCompleted(event: GoalCompletedEvent) {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch (error) {
      void error
    }
  }
}

export function subscribeToGoalCompleted(listener: GoalCompletedListener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
