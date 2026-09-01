import { createContext, useContext } from "react"

import type {
  PomodoroCurrentDocument,
  PomodoroMode,
} from "@/features/pomodoro/types/pomodoro"

export interface PomodoroContextValue {
  current: PomodoroCurrentDocument | null
  now: number | null
  isLoading: boolean
  isClockSynchronized: boolean
  isSubmitting: boolean
  error: string | null
  start: (mode: PomodoroMode) => Promise<void>
  complete: () => Promise<void>
  cancel: () => Promise<void>
}

export const PomodoroContext = createContext<PomodoroContextValue | null>(null)

export function usePomodoro() {
  const context = useContext(PomodoroContext)
  if (!context) {
    throw new Error("usePomodoro deve ser usado dentro de PomodoroProvider.")
  }
  return context
}
