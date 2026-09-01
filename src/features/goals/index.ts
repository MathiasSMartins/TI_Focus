export { GoalCompletedFeedback } from "@/features/goals/components/goal-completed-feedback"
export { getCivilPeriod } from "@/features/goals/domain/civil-period"
export { subscribeToGoalCompleted } from "@/features/goals/events/goal-events"
export { useGoals } from "@/features/goals/hooks/use-goals"
export { GoalsPage } from "@/features/goals/pages/goals-page"
export { GoalsProvider } from "@/features/goals/providers/goals-provider"
export { GOAL_METRIC_LABELS } from "@/features/goals/types/goal"
export type {
  GoalCadence,
  GoalCompletedEvent,
  GoalDocument,
  GoalMetric,
  GoalProgressDocument,
  GoalStreakDocument,
} from "@/features/goals/types/goal"
