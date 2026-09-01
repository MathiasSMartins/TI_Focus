import { useCallback, useEffect, useState, type ReactNode } from "react"

import { AchievementUnlockedFeedback } from "@/features/achievements/components/achievement-unlocked-feedback"
import { subscribeToAchievementUnlocked } from "@/features/achievements/events/achievement-events"
import {
  processPersistedProjectCompletionForAchievements,
  processPersistedTaskCompletionForAchievements,
  reconcileAchievements,
} from "@/features/achievements/services/achievement-repository"
import type { AchievementUnlockedEvent } from "@/features/achievements/types/achievement"
import { useAuth } from "@/features/auth"
import { subscribeToProjectCompleted } from "@/features/projects"
import { subscribeToTaskCompleted } from "@/features/tasks/events/task-events"

interface AchievementsProviderProps {
  children: ReactNode
}

export function AchievementsProvider({ children }: AchievementsProviderProps) {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const profileUid = profile?.uid
  const [feedbackQueue, setFeedbackQueue] = useState<
    AchievementUnlockedEvent[]
  >([])
  const currentFeedback =
    uid && profileUid === uid
      ? feedbackQueue.find((event) => event.userId === uid)
      : undefined

  const closeCurrentFeedback = useCallback(() => {
    setFeedbackQueue((current) => current.slice(1))
  }, [])

  useEffect(() => {
    if (!currentFeedback) return
    const timeout = window.setTimeout(closeCurrentFeedback, 6500)
    return () => window.clearTimeout(timeout)
  }, [closeCurrentFeedback, currentFeedback])

  useEffect(() => {
    if (!uid || profileUid !== uid) return

    let active = true

    void reconcileAchievements(uid).catch(() => undefined)

    const unsubscribeAchievement = subscribeToAchievementUnlocked((event) => {
      if (!active || event.userId !== uid) return
      setFeedbackQueue((current) =>
        current.some(
          (queuedEvent) => queuedEvent.achievement.id === event.achievement.id,
        )
          ? current
          : [...current, event],
      )
    })

    const reconcilePersistedCompletions = () =>
      reconcileAchievements(uid).catch(() => undefined)

    const unsubscribeTask = subscribeToTaskCompleted((event) => {
      if (!active || event.userId !== uid || event.alreadyProcessed) return

      void processPersistedTaskCompletionForAchievements(
        uid,
        event.taskId,
        true,
      ).catch(reconcilePersistedCompletions)
    })

    const unsubscribeProject = subscribeToProjectCompleted((event) => {
      if (!active || event.userId !== uid || event.firstCompletion === false) {
        return
      }

      void processPersistedProjectCompletionForAchievements(
        uid,
        event.projectId,
        true,
      ).catch(reconcilePersistedCompletions)
    })

    return () => {
      active = false
      unsubscribeAchievement()
      unsubscribeTask()
      unsubscribeProject()
      setFeedbackQueue([])
    }
  }, [profileUid, uid])

  return (
    <>
      {children}
      {currentFeedback && (
        <AchievementUnlockedFeedback
          key={currentFeedback.achievement.id}
          event={currentFeedback}
          onClose={closeCurrentFeedback}
        />
      )}
    </>
  )
}
