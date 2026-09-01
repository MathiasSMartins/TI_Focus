import { useCallback, useEffect, useState, type ReactNode } from "react"

import { subscribeToAchievementUnlocked } from "@/features/achievements/events/achievement-events"
import { useAuth } from "@/features/auth"
import {
  getSynchronizedServerNow,
  synchronizeServerClock,
} from "@/features/gamification/services/xp-repository"
import { GoalCompletedFeedback } from "@/features/goals/components/goal-completed-feedback"
import { getCivilPeriod } from "@/features/goals/domain/civil-period"
import { subscribeToGoalCompleted } from "@/features/goals/events/goal-events"
import {
  migrateLegacyDailyGoal,
  processPersistedPomodoroForGoals,
  processPersistedTaskCompletionForGoals,
  processPersistedXpTransactionForGoals,
  reconcileGoals,
} from "@/features/goals/services/goal-repository"
import type { GoalCompletedEvent } from "@/features/goals/types/goal"
import { subscribeToPomodoroCompleted } from "@/features/pomodoro/events/pomodoro-events"
import { subscribeToTaskCompleted } from "@/features/tasks/events/task-events"

const CLOCK_RETRY_INITIAL_MS = 1_000
const CLOCK_RETRY_MAX_MS = 30_000

export function GoalsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const timezone = profile?.settings?.timezone ?? "UTC"
  const [feedbackQueue, setFeedbackQueue] = useState<GoalCompletedEvent[]>([])
  const currentFeedback = feedbackQueue.find((event) => event.userId === uid)
  const closeFeedback = useCallback(
    () => setFeedbackQueue((items) => items.slice(1)),
    [],
  )

  useEffect(() => {
    if (!currentFeedback) return
    const timeout = window.setTimeout(closeFeedback, 6_500)
    return () => window.clearTimeout(timeout)
  }, [closeFeedback, currentFeedback])

  useEffect(() => {
    if (!uid || profile?.uid !== uid) return
    let active = true
    let rolloverTimeout: number | undefined
    let clockRetryTimeout: number | undefined
    let clockRetryDelayMs = CLOCK_RETRY_INITIAL_MS
    let initialReconciliationComplete = false
    const processed = new Set<string>()
    const queued = new Set<string>()
    let pipeline = Promise.resolve()

    const scheduleClockRetry = () => {
      if (!active || clockRetryTimeout !== undefined) return
      const delay = clockRetryDelayMs
      clockRetryDelayMs = Math.min(delay * 2, CLOCK_RETRY_MAX_MS)
      clockRetryTimeout = window.setTimeout(() => {
        clockRetryTimeout = undefined
        if (initialReconciliationComplete) {
          queueClockSynchronization(true)
        } else {
          queueInitialReconciliation()
        }
      }, delay)
    }

    const scheduleCivilRollover = () => {
      if (!active || rolloverTimeout !== undefined) return
      const synchronizedNow = getSynchronizedServerNow(uid)
      if (synchronizedNow === null) {
        scheduleClockRetry()
        return
      }
      const period = getCivilPeriod(
        new Date(synchronizedNow),
        timezone,
        "daily",
      )
      const delay = Math.max(
        1_000,
        period.endsAt.getTime() - synchronizedNow + 250,
      )
      rolloverTimeout = window.setTimeout(() => {
        rolloverTimeout = undefined
        if (!active) return
        pipeline = pipeline
          .then(async () => {
            if (!active) return
            try {
              await reconcileGoals(uid, timezone, true)
            } catch {
              // O próximo passe idempotente continuará elegível.
            }
            if (active) await attemptClockSynchronization(false)
          })
          .then(() => undefined)
          .catch(() => undefined)
      }, delay)
    }

    const attemptClockSynchronization = async (recovering: boolean) => {
      try {
        await synchronizeServerClock(uid)
      } catch {
        scheduleClockRetry()
        return
      }
      if (!active) return
      if (recovering) {
        try {
          await reconcileGoals(uid, timezone, true)
        } catch {
          scheduleClockRetry()
          return
        }
      }
      clockRetryDelayMs = CLOCK_RETRY_INITIAL_MS
      if (active) scheduleCivilRollover()
    }

    const attemptInitialReconciliation = async () => {
      try {
        await migrateLegacyDailyGoal(uid, profile.dailyTaskGoal, timezone)
        if (!active) return
        await reconcileGoals(uid, timezone, true)
      } catch {
        scheduleClockRetry()
        return
      }
      if (!active) return
      initialReconciliationComplete = true
      await attemptClockSynchronization(false)
    }

    const queueClockSynchronization = (recovering: boolean) => {
      pipeline = pipeline
        .then(() =>
          active ? attemptClockSynchronization(recovering) : undefined,
        )
        .then(() => undefined)
        .catch(() => undefined)
    }

    const queueInitialReconciliation = () => {
      pipeline = pipeline
        .then(() => (active ? attemptInitialReconciliation() : undefined))
        .then(() => undefined)
        .catch(() => scheduleClockRetry())
    }

    queueInitialReconciliation()

    const enqueue = (key: string, operation: () => Promise<void>) => {
      if (!active || processed.has(key) || queued.has(key)) return
      queued.add(key)
      pipeline = pipeline
        .then(async () => {
          if (!active) return
          try {
            await operation()
            processed.add(key)
          } catch {
            try {
              await reconcileGoals(uid, timezone, true)
              processed.add(key)
            } catch {
              // A fonte permanece elegível para o próximo snapshot/retry.
            }
          }
        })
        .finally(() => queued.delete(key))
    }

    const unsubscribeGoal = subscribeToGoalCompleted((event) => {
      if (!active || event.userId !== uid) return
      setFeedbackQueue((items) =>
        items.some((item) => item.progressId === event.progressId)
          ? items
          : [...items, event],
      )
    })
    const unsubscribeTask = subscribeToTaskCompleted((event) => {
      if (!active || event.userId !== uid || event.alreadyProcessed) return
      enqueue(`xp:${event.taskId}`, () =>
        processPersistedTaskCompletionForGoals(
          uid,
          event.taskId,
          timezone,
          true,
        ),
      )
    })
    const unsubscribePomodoro = subscribeToPomodoroCompleted((event) => {
      if (!active || event.userId !== uid || event.alreadyProcessed) return
      enqueue(`pomodoro:${event.sessionId}`, () =>
        processPersistedPomodoroForGoals(uid, event.sessionId, timezone, true),
      )
    })
    const unsubscribeAchievement = subscribeToAchievementUnlocked((event) => {
      if (!active || event.userId !== uid) return
      const transactionId = `achievement__${event.achievement.id}`
      enqueue(`xp:${transactionId}`, () =>
        processPersistedXpTransactionForGoals(
          uid,
          transactionId,
          timezone,
          true,
        ),
      )
    })

    return () => {
      active = false
      if (rolloverTimeout !== undefined) window.clearTimeout(rolloverTimeout)
      if (clockRetryTimeout !== undefined) {
        window.clearTimeout(clockRetryTimeout)
      }
      unsubscribeGoal()
      unsubscribeTask()
      unsubscribePomodoro()
      unsubscribeAchievement()
      setFeedbackQueue([])
    }
  }, [profile?.dailyTaskGoal, profile?.uid, timezone, uid])

  return (
    <>
      {children}
      {currentFeedback && (
        <GoalCompletedFeedback
          event={currentFeedback}
          onClose={closeFeedback}
        />
      )}
    </>
  )
}
