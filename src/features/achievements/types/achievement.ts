import type { Timestamp } from "firebase/firestore"

import type { ITAreaId } from "@/features/profile/types/user-profile"

export const ACHIEVEMENT_CATEGORIES = [
  "tasks",
  "focus",
  "consistency",
  "projects",
] as const
export type AchievementCategory = (typeof ACHIEVEMENT_CATEGORIES)[number]

export const ACHIEVEMENT_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
] as const
export type AchievementRarity = (typeof ACHIEVEMENT_RARITIES)[number]

export const ACHIEVEMENT_METRICS = [
  "tasksCompleted",
  "pomodorosCompleted",
  "bestStreak",
  "perfectWeeks",
  "projectsCompleted",
] as const
export type AchievementMetric = (typeof ACHIEVEMENT_METRICS)[number]

export const ACHIEVEMENT_IDS = [
  "first-mission",
  "tasks-10",
  "tasks-50",
  "tasks-100",
  "first-pomodoro",
  "pomodoros-10",
  "pomodoros-50",
  "streak-7",
  "streak-30",
  "perfect-week",
  "first-project",
  "projects-10",
] as const
export type AchievementId = (typeof ACHIEVEMENT_IDS)[number]

export type AchievementArea = "general" | ITAreaId
export type AchievementStatus = "locked" | "unlocked" | "unavailable"
export type AchievementIconName =
  | "flag"
  | "list-checks"
  | "medal"
  | "crown"
  | "timer"
  | "clock"
  | "hourglass"
  | "flame"
  | "shield"
  | "calendar-check"
  | "folder-check"
  | "folders"

export interface AchievementCondition {
  metric: AchievementMetric
  target: number
  label: string
}

export interface AchievementDefinition {
  id: AchievementId
  name: string
  description: string
  icon: AchievementIconName
  category: AchievementCategory
  xp: number
  condition: AchievementCondition
  area: AchievementArea
  rarity: AchievementRarity
  sourceAvailable: boolean
}

export interface AchievementStatsDocument {
  tasksCompleted: number
  pomodorosCompleted: number
  bestStreak: number
  perfectWeeks: number
  projectsCompleted: number
  lastEvidenceId: string | null
  updatedAt: Timestamp
}

export type AchievementEvidenceSource =
  | "TASK_COMPLETED"
  | "PROJECT_COMPLETED"
  | "POMODORO_COMPLETED"
  | "ACTIVITY_STREAK"
  | "PERFECT_WEEK"

export interface AchievementEvidenceDocument {
  metric: AchievementMetric
  sourceType: AchievementEvidenceSource
  sourceId: string
  occurredAt: Timestamp
  recordedAt: Timestamp
}

export interface AchievementUnlockDocument {
  achievementId: AchievementId
  unlockedAt: Timestamp
  progressValue: number
  rewardXp: number
  awardedXp: number
  triggerEvidenceId: string
  definitionVersion: 1
}

export interface ResolvedAchievement extends AchievementDefinition {
  status: AchievementStatus
  progress: number
  progressPercentage: number
  unlockedAt: Timestamp | null
  xpAwarded: number
}

export interface AchievementUnlockedEvent {
  type: "ACHIEVEMENT_UNLOCKED"
  version: 1
  userId: string
  achievement: AchievementDefinition
  unlockedAt: Date
  xpAwarded: number
  levelBefore: number
  levelAfter: number
  dailyLimitReached: boolean
}
