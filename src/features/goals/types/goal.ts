import type { Timestamp } from "firebase/firestore"

export const GOAL_CADENCES = ["daily", "weekly", "monthly"] as const
export type GoalCadence = (typeof GOAL_CADENCES)[number]

export const GOAL_METRICS = [
  "tasksCompleted",
  "xpEarned",
  "pomodorosCompleted",
  "focusedSeconds",
] as const
export type GoalMetric = (typeof GOAL_METRICS)[number]

export const GOAL_REWARD_XP: Record<GoalCadence, number> = {
  daily: 30,
  weekly: 100,
  monthly: 300,
}

export interface GoalDocument {
  userId: string
  cadence: GoalCadence
  metric: GoalMetric
  target: number
  rewardXp: number
  active: boolean
  effectiveFromPeriodKey: string
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface GoalProgressDocument {
  userId: string
  cadence: GoalCadence
  periodKey: string
  timezone: string
  periodStartsAt: Timestamp
  periodEndsAt: Timestamp
  eligibleFrom: Timestamp
  metric: GoalMetric
  target: number
  rewardXp: number
  current: number
  completed: boolean
  completedAt: Timestamp | null
  lastEvidenceId: string | null
  createdAt: Timestamp
  updatedAt: Timestamp
}

export interface GoalEvidenceDocument {
  progressId: string
  sourceType: GoalSourceType
  sourceId: string
  metric: GoalMetric
  delta: number
  occurredAt: Timestamp
  recordedAt: Timestamp
}

export type GoalSourceType =
  "TASK_COMPLETED" | "XP_TRANSACTION" | "POMODORO_COMPLETED"

export interface GoalCompletionDocument {
  progressId: string
  cadence: GoalCadence
  periodKey: string
  metric: GoalMetric
  target: number
  finalValue: number
  rewardXp: number
  completedAt: Timestamp
}

export interface GoalStreakDocument {
  current: number
  best: number
  productiveDays: number
  lastProcessedProgressId: string
  lastCompletedPeriodKey: string | null
  lastCompletedAt: Timestamp | null
  updatedAt: Timestamp
}

export interface GoalSourceValues {
  tasksCompleted?: number
  xpEarned?: number
  pomodorosCompleted?: number
  focusedSeconds?: number
}

export interface GoalCompletedEvent {
  type: "GOAL_COMPLETED"
  version: 1
  userId: string
  progressId: string
  cadence: GoalCadence
  periodKey: string
  rewardXp: number
  awardedXp: number
  streak: number | null
  occurredAt: Date
}

export const GOAL_METRIC_LABELS: Record<GoalMetric, string> = {
  tasksCompleted: "Tarefas concluídas",
  xpEarned: "XP conquistado",
  pomodorosCompleted: "Pomodoros concluídos",
  focusedSeconds: "Segundos de foco",
}
