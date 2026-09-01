import { useEffect, useMemo, useState } from "react"

import type { ITAreaId } from "@/config/it-area-config"
import {
  ACHIEVEMENT_CATALOG,
  EMPTY_ACHIEVEMENT_STATS,
  getAchievementProgressValue,
} from "@/features/achievements/domain/achievement-catalog"
import {
  subscribeToAchievementAreaStats,
  subscribeToAchievementStats,
  subscribeToAchievementUnlocks,
} from "@/features/achievements/services/achievement-repository"
import type {
  AchievementAreaStatsDocument,
  AchievementStatsDocument,
  AchievementUnlockDocument,
  ResolvedAchievement,
} from "@/features/achievements/types/achievement"

interface SourceState<T> {
  uid: string | null
  value: T
  loaded: boolean
}

interface AreaStatsState extends SourceState<AchievementAreaStatsDocument | null> {
  areaId: ITAreaId | null
}

const EMPTY_STATS_STATE: SourceState<AchievementStatsDocument | null> = {
  uid: null,
  value: null,
  loaded: true,
}

const EMPTY_AREA_STATS_STATE: AreaStatsState = {
  uid: null,
  areaId: null,
  value: null,
  loaded: true,
}

const EMPTY_UNLOCKS_STATE: SourceState<AchievementUnlockDocument[]> = {
  uid: null,
  value: [],
  loaded: true,
}

function getErrorMessage(error: Error) {
  return error.message || "Não foi possível carregar as conquistas."
}

export function useAchievements(
  uid?: string,
  profileStreak = 0,
  primaryArea: ITAreaId | null = null,
) {
  const [statsState, setStatsState] = useState(EMPTY_STATS_STATE)
  const [areaStatsState, setAreaStatsState] = useState(EMPTY_AREA_STATS_STATE)
  const [unlocksState, setUnlocksState] = useState(EMPTY_UNLOCKS_STATE)
  const [errorState, setErrorState] = useState<{
    uid: string
    message: string
  } | null>(null)

  useEffect(() => {
    if (!uid) return

    let active = true
    let unsubscribeStats: () => void = () => undefined
    let unsubscribeAreaStats: () => void = () => undefined
    let unsubscribeUnlocks: () => void = () => undefined

    try {
      unsubscribeStats = subscribeToAchievementStats(
        uid,
        (stats) => {
          if (!active) return
          setStatsState({ uid, value: stats, loaded: true })
        },
        (statsError) => {
          if (!active) return
          setStatsState((current) =>
            current.uid === uid ? { ...current, loaded: true } : current,
          )
          setErrorState({ uid, message: getErrorMessage(statsError) })
        },
      )

      if (primaryArea) {
        unsubscribeAreaStats = subscribeToAchievementAreaStats(
          uid,
          primaryArea,
          (stats) => {
            if (!active) return
            setAreaStatsState({
              uid,
              areaId: primaryArea,
              value: stats,
              loaded: true,
            })
          },
          (statsError) => {
            if (!active) return
            setAreaStatsState({
              uid,
              areaId: primaryArea,
              value: null,
              loaded: true,
            })
            setErrorState({ uid, message: getErrorMessage(statsError) })
          },
        )
      }

      unsubscribeUnlocks = subscribeToAchievementUnlocks(
        uid,
        (unlocks) => {
          if (!active) return
          setUnlocksState({ uid, value: unlocks, loaded: true })
        },
        (unlocksError) => {
          if (!active) return
          setUnlocksState((current) =>
            current.uid === uid ? { ...current, loaded: true } : current,
          )
          setErrorState({ uid, message: getErrorMessage(unlocksError) })
        },
      )
    } catch (subscriptionError) {
      const message = getErrorMessage(
        subscriptionError instanceof Error
          ? subscriptionError
          : new Error("Não foi possível carregar as conquistas."),
      )
      queueMicrotask(() => {
        if (!active) return
        setStatsState({ uid, value: null, loaded: true })
        setAreaStatsState({
          uid,
          areaId: primaryArea,
          value: null,
          loaded: true,
        })
        setUnlocksState({ uid, value: [], loaded: true })
        setErrorState({ uid, message })
      })
    }

    return () => {
      active = false
      unsubscribeStats()
      unsubscribeAreaStats()
      unsubscribeUnlocks()
    }
  }, [primaryArea, uid])

  const achievements = useMemo<ResolvedAchievement[]>(() => {
    const persistedStats =
      statsState.uid === uid && statsState.value
        ? statsState.value
        : EMPTY_ACHIEVEMENT_STATS
    const visualStats = {
      ...persistedStats,
      bestStreak: Math.max(persistedStats.bestStreak, profileStreak),
    }
    const currentAreaStats =
      areaStatsState.uid === uid &&
      areaStatsState.areaId === primaryArea &&
      areaStatsState.value
        ? areaStatsState.value
        : null
    const unlocks = new Map(
      (unlocksState.uid === uid ? unlocksState.value : []).map((unlock) => [
        unlock.achievementId,
        unlock,
      ]),
    )

    return ACHIEVEMENT_CATALOG.filter(
      (achievement) =>
        achievement.area === "general" ||
        achievement.area === primaryArea ||
        unlocks.has(achievement.id),
    ).map((achievement) => {
      const unlock = unlocks.get(achievement.id)
      const trackedProgress =
        achievement.area === "general"
          ? getAchievementProgressValue(
              visualStats,
              achievement.condition.metric,
            )
          : achievement.area === primaryArea && currentAreaStats
            ? getAchievementProgressValue(
                currentAreaStats,
                achievement.condition.metric,
              )
            : 0
      const progress = Math.max(trackedProgress, unlock?.progressValue ?? 0)
      const progressPercentage = Math.min(
        100,
        Math.max(0, (progress / achievement.condition.target) * 100),
      )

      return {
        ...achievement,
        status: unlock
          ? "unlocked"
          : achievement.sourceAvailable
            ? "locked"
            : "unavailable",
        progress,
        progressPercentage,
        unlockedAt: unlock?.unlockedAt ?? null,
        xpAwarded: unlock?.awardedXp ?? 0,
      }
    })
  }, [
    areaStatsState,
    primaryArea,
    profileStreak,
    statsState,
    uid,
    unlocksState,
  ])

  const isLoading = Boolean(
    uid &&
    !(
      statsState.uid === uid &&
      statsState.loaded &&
      unlocksState.uid === uid &&
      unlocksState.loaded &&
      (!primaryArea ||
        (areaStatsState.uid === uid &&
          areaStatsState.areaId === primaryArea &&
          areaStatsState.loaded))
    ),
  )

  const error = errorState && errorState.uid === uid ? errorState.message : null

  return { achievements, isLoading, error }
}
