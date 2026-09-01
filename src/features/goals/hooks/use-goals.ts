import { useEffect, useMemo, useState } from "react"

import {
  getSynchronizedServerNow,
  synchronizeServerClock,
} from "@/features/gamification/services/xp-repository"
import {
  getCivilPeriod,
  differenceInCivilDays,
} from "@/features/goals/domain/civil-period"
import {
  deactivateGoal,
  saveGoal,
  subscribeToGoalProgress,
  subscribeToGoals,
  subscribeToGoalStreak,
} from "@/features/goals/services/goal-repository"
import type {
  GoalCadence,
  GoalDocument,
  GoalMetric,
  GoalProgressDocument,
  GoalStreakDocument,
} from "@/features/goals/types/goal"

interface GoalsState {
  uid: string
  goals: GoalDocument[]
  progress: GoalProgressDocument[]
  streak: GoalStreakDocument | null
  error: string | null
}

export function useGoals(uid: string | undefined, timezone: string) {
  const [state, setState] = useState<GoalsState | null>(null)
  const [clockState, setClockState] = useState<{
    uid: string
    now: number
  } | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!uid) return
    let active = true
    const update = (patch: Partial<GoalsState>) => {
      if (!active) return
      setState((current) => ({
        uid,
        goals: current?.uid === uid ? current.goals : [],
        progress: current?.uid === uid ? current.progress : [],
        streak: current?.uid === uid ? current.streak : null,
        error: null,
        ...patch,
      }))
    }
    const fail = (error: Error) => update({ error: error.message })
    const unsubscribes = [
      subscribeToGoals(uid, (goals) => update({ goals }), fail),
      subscribeToGoalProgress(uid, (progress) => update({ progress }), fail),
      subscribeToGoalStreak(uid, (streak) => update({ streak }), fail),
    ]
    return () => {
      active = false
      unsubscribes.forEach((unsubscribe) => unsubscribe())
    }
  }, [uid])

  useEffect(() => {
    if (!uid) return
    let active = true
    const updateClock = () => {
      const synchronizedNow = getSynchronizedServerNow(uid)
      if (active && synchronizedNow !== null) {
        setClockState({ uid, now: synchronizedNow })
      }
    }
    const refreshClock = async () => {
      await synchronizeServerClock(uid)
      updateClock()
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshClock().catch(() => undefined)
      }
    }

    void refreshClock().catch(() => undefined)
    const interval = window.setInterval(updateClock, 30_000)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [uid])

  const current = state?.uid === uid ? state : null
  const synchronizedNow =
    clockState && clockState.uid === uid ? clockState.now : null
  const currentProgress = useMemo(() => {
    const result = new Map<GoalCadence, GoalProgressDocument>()
    if (!current || synchronizedNow === null) return result
    for (const cadence of ["daily", "weekly", "monthly"] as const) {
      const key = getCivilPeriod(
        new Date(synchronizedNow),
        timezone,
        cadence,
      ).key
      const item = current.progress.find(
        (progress) =>
          progress.cadence === cadence && progress.periodKey === key,
      )
      if (item) result.set(cadence, item)
    }
    return result
  }, [current, synchronizedNow, timezone])

  const currentStreak = useMemo(() => {
    const streak = current?.streak
    if (!streak || synchronizedNow === null || !streak.lastCompletedPeriodKey) {
      return streak
    }
    const currentDailyPeriodKey = getCivilPeriod(
      new Date(synchronizedNow),
      timezone,
      "daily",
    ).key
    return differenceInCivilDays(
      currentDailyPeriodKey,
      streak.lastCompletedPeriodKey,
    ) > 1
      ? { ...streak, current: 0 }
      : streak
  }, [current?.streak, synchronizedNow, timezone])

  const run = async (operation: () => Promise<void>) => {
    setIsSaving(true)
    try {
      await operation()
    } finally {
      setIsSaving(false)
    }
  }

  return {
    goals: current?.goals ?? [],
    progress: current?.progress ?? [],
    currentProgress,
    streak: currentStreak,
    isLoading: Boolean(uid) && !current,
    isSaving,
    error: current?.error ?? null,
    saveGoal: (cadence: GoalCadence, metric: GoalMetric, target: number) =>
      uid
        ? run(() => saveGoal(uid, cadence, metric, target, timezone))
        : Promise.resolve(),
    deactivateGoal: (cadence: GoalCadence) =>
      uid
        ? run(() => deactivateGoal(uid, cadence, timezone))
        : Promise.resolve(),
  }
}
