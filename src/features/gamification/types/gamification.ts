import type { Timestamp } from "firebase/firestore"

import type { AchievementId } from "@/features/achievements/types/achievement"

export const XP_EVENT_TYPES = [
  "TASK_COMPLETED",
  "ACHIEVEMENT_UNLOCKED",
  "GOAL_COMPLETED",
] as const

export type XpEventType = (typeof XP_EVENT_TYPES)[number]

interface XpTransactionBase {
  userId: string
  amount: number
  reason: string
  createdAt: Timestamp
  xpBefore: number
  xpAfter: number
  levelBefore: number
  levelAfter: number
}

export interface TaskXpTransactionDocument extends XpTransactionBase {
  eventType: "TASK_COMPLETED"
  taskId: string
  taskTitle: string
}

export interface AchievementXpTransactionDocument extends XpTransactionBase {
  eventType: "ACHIEVEMENT_UNLOCKED"
  achievementId: AchievementId
  achievementName: string
}

export interface GoalXpTransactionDocument extends XpTransactionBase {
  eventType: "GOAL_COMPLETED"
  progressId: string
  cadence: "daily" | "weekly" | "monthly"
}

export type XpTransactionDocument =
  | TaskXpTransactionDocument
  | AchievementXpTransactionDocument
  | GoalXpTransactionDocument

export type XpTransaction = XpTransactionDocument & { id: string }

export interface XpAwardResult {
  transactionId: string
  amount: number
  xpBefore: number
  xpAfter: number
  levelBefore: number
  levelAfter: number
  dailyLimitReached: boolean
  alreadyProcessed: boolean
}
