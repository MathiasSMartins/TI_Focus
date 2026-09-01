import type { AchievementUnlockedEvent } from "@/features/achievements/types/achievement"

export const ACHIEVEMENT_UNLOCKED = "ACHIEVEMENT_UNLOCKED" as const

type AchievementUnlockedListener = (event: AchievementUnlockedEvent) => void

const listeners = new Set<AchievementUnlockedListener>()

export function publishAchievementUnlocked(event: AchievementUnlockedEvent) {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch {
      // A falha de um consumidor não deve interromper os demais.
    }
  }
}

export function subscribeToAchievementUnlocked(
  listener: AchievementUnlockedListener,
) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
