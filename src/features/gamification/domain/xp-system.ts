import type { TaskPriority } from "@/features/tasks/types/task"

export const XP_REWARD_BY_PRIORITY = {
  low: 20,
  medium: 40,
  high: 75,
  critical: 120,
} as const satisfies Record<TaskPriority, number>

export const XP_DAILY_LIMIT = 1_000
export const XP_WINDOW_DURATION_MS = 24 * 60 * 60 * 1_000

const LEVEL_TITLES = [
  "Novato",
  "Aprendiz",
  "Operador",
  "Profissional",
  "Especialista",
  "Veterano",
  "Sênior",
  "Elite",
  "Mestre",
  "Expert",
] as const

export function getTaskXpReward(priority: TaskPriority) {
  return XP_REWARD_BY_PRIORITY[priority]
}

export function getMinimumXpForLevel(level: number) {
  const normalizedLevel = Math.max(1, Math.floor(level))
  const completedLevels = normalizedLevel - 1
  return 50 * completedLevels * (completedLevels + 3)
}

export function getLevelForXp(totalXp: number) {
  const normalizedXp = Math.max(0, Math.floor(totalXp))
  const completedLevels = Math.floor(
    (-3 + Math.sqrt(9 + 0.08 * normalizedXp)) / 2,
  )
  let level = Math.max(1, completedLevels + 1)

  while (getMinimumXpForLevel(level + 1) <= normalizedXp) level += 1
  while (level > 1 && getMinimumXpForLevel(level) > normalizedXp) level -= 1
  return level
}

export function getLevelTitle(level: number) {
  const normalizedLevel = Math.max(1, Math.floor(level))
  return LEVEL_TITLES[normalizedLevel - 1] ?? `Expert ${normalizedLevel - 9}`
}

export interface LevelProgress {
  level: number
  title: string
  totalXp: number
  currentLevelXp: number
  nextLevelXp: number
  xpIntoLevel: number
  xpForNextLevel: number
  remainingXp: number
  percentage: number
}

export function getLevelProgress(totalXp: number): LevelProgress {
  const normalizedXp = Math.max(0, Math.floor(totalXp))
  const level = getLevelForXp(normalizedXp)
  const currentLevelXp = getMinimumXpForLevel(level)
  const nextLevelXp = getMinimumXpForLevel(level + 1)
  const xpForNextLevel = nextLevelXp - currentLevelXp
  const xpIntoLevel = normalizedXp - currentLevelXp

  return {
    level,
    title: getLevelTitle(level),
    totalXp: normalizedXp,
    currentLevelXp,
    nextLevelXp,
    xpIntoLevel,
    xpForNextLevel,
    remainingXp: Math.max(0, nextLevelXp - normalizedXp),
    percentage: Math.min(
      100,
      Math.max(0, Math.round((xpIntoLevel / xpForNextLevel) * 100)),
    ),
  }
}
