import type { Timestamp } from "firebase/firestore"

export const POMODORO_MODES = ["focus", "shortBreak", "longBreak"] as const
export type PomodoroMode = (typeof POMODORO_MODES)[number]

export interface PomodoroCurrentDocument {
  userId: string
  sessionId: string
  mode: PomodoroMode
  plannedSeconds: number
  startedAt: Timestamp
  expectedEndAt: Timestamp
}

export interface PomodoroSessionDocument extends PomodoroCurrentDocument {
  completedAt: Timestamp
}

export interface PomodoroCompletedEvent {
  type: "POMODORO_COMPLETED"
  version: 1
  userId: string
  sessionId: string
  mode: PomodoroMode
  plannedSeconds: number
  completedAt: Date
  alreadyProcessed: boolean
}
