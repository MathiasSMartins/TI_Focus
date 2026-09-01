import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useAuth } from "@/features/auth"
import {
  getSynchronizedServerNow,
  synchronizeServerClock,
} from "@/features/gamification/services/xp-repository"
import {
  PomodoroContext,
  type PomodoroContextValue,
} from "@/features/pomodoro/providers/pomodoro-context"
import {
  cancelPomodoroSession,
  completePomodoroSession,
  startPomodoroSession,
  subscribeToCurrentPomodoro,
} from "@/features/pomodoro/services/pomodoro-repository"
import type {
  PomodoroCurrentDocument,
  PomodoroMode,
} from "@/features/pomodoro/types/pomodoro"

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const [currentState, setCurrentState] = useState<{
    uid: string
    value: PomodoroCurrentDocument | null
  } | null>(null)
  const [clockState, setClockState] = useState<{
    uid: string
    now: number
  } | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const completing = useRef(false)

  useEffect(() => {
    if (!uid) return
    return subscribeToCurrentPomodoro(
      uid,
      (value) => setCurrentState({ uid, value }),
      (snapshotError) => setError(snapshotError.message),
    )
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
    const interval = window.setInterval(updateClock, 1_000)
    document.addEventListener("visibilitychange", handleVisibilityChange)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [uid])

  const current =
    currentState && currentState.uid === uid ? currentState.value : null
  const now = clockState && clockState.uid === uid ? clockState.now : null
  const run = useCallback(async (operation: () => Promise<unknown>) => {
    setIsSubmitting(true)
    setError(null)
    try {
      await operation()
    } catch (operationError) {
      setError(
        operationError instanceof Error
          ? operationError.message
          : "Não foi possível atualizar o timer.",
      )
      throw operationError
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const complete = useCallback(async () => {
    if (!uid || completing.current) return
    completing.current = true
    try {
      await run(() => completePomodoroSession(uid))
    } finally {
      completing.current = false
    }
  }, [run, uid])

  useEffect(() => {
    if (
      !current ||
      now === null ||
      now < current.expectedEndAt.toMillis() ||
      completing.current
    ) {
      return
    }
    void complete().catch(() => undefined)
  }, [complete, current, now])

  const value = useMemo<PomodoroContextValue>(
    () => ({
      current,
      now,
      isLoading: Boolean(uid) && currentState?.uid !== uid,
      isClockSynchronized: now !== null,
      isSubmitting,
      error,
      start: async (mode: PomodoroMode) => {
        if (!uid || !profile) return
        const minutes =
          mode === "focus"
            ? profile.settings.pomodoro.focusMinutes
            : mode === "shortBreak"
              ? profile.settings.pomodoro.shortBreakMinutes
              : profile.settings.pomodoro.longBreakMinutes
        await run(() => startPomodoroSession(uid, mode, minutes * 60))
      },
      complete,
      cancel: async () => {
        if (uid) await run(() => cancelPomodoroSession(uid))
      },
    }),
    [
      complete,
      current,
      currentState?.uid,
      error,
      isSubmitting,
      now,
      profile,
      run,
      uid,
    ],
  )

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  )
}
