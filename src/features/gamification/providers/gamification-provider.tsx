import { useEffect, useState, type ReactNode } from "react"

import { useAuth } from "@/features/auth"
import { XpRewardFeedback } from "@/features/gamification/components/xp-reward-feedback"
import {
  subscribeToTaskCompleted,
  type TaskCompletedEvent,
} from "@/features/tasks"

interface GamificationProviderProps {
  children: ReactNode
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const { user } = useAuth()
  const [feedback, setFeedback] = useState<TaskCompletedEvent | null>(null)
  const visibleFeedback = feedback?.userId === user?.uid ? feedback : null

  useEffect(() => {
    if (!user) return

    return subscribeToTaskCompleted((event) => {
      if (event.userId === user.uid) setFeedback(event)
    })
  }, [user])

  useEffect(() => {
    if (!visibleFeedback) return
    const timeout = window.setTimeout(() => setFeedback(null), 6_000)
    return () => window.clearTimeout(timeout)
  }, [visibleFeedback])

  return (
    <>
      {children}
      {visibleFeedback && (
        <XpRewardFeedback
          event={visibleFeedback}
          onClose={() => setFeedback(null)}
        />
      )}
    </>
  )
}
