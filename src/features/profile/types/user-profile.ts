import type { Timestamp } from "firebase/firestore"

import type { ITAreaId } from "@/config/it-area-config"

export { IT_AREAS, getAreaLabel } from "@/config/it-area-config"
export type { ITAreaId } from "@/config/it-area-config"

export const PRIMARY_OBJECTIVES = [
  { id: "organize-work", label: "Organizar meu trabalho" },
  { id: "improve-focus", label: "Melhorar meu foco" },
  { id: "build-routine", label: "Criar uma rotina" },
  { id: "increase-productivity", label: "Aumentar minha produtividade" },
  { id: "meet-goals", label: "Cumprir minhas metas" },
  { id: "all", label: "Todos" },
] as const

export type PrimaryObjectiveId = (typeof PRIMARY_OBJECTIVES)[number]["id"]

export interface UserSettings {
  timezone: string
  locale: "pt-BR"
  pomodoro: {
    focusMinutes: number
    shortBreakMinutes: number
    longBreakMinutes: number
    cyclesBeforeLongBreak: number
  }
  notifications: {
    inApp: boolean
    push: boolean
  }
}

export interface UserProfile {
  uid: string
  name: string
  email: string
  avatar: string | null
  primaryArea: ITAreaId | null
  secondaryAreas: ITAreaId[]
  primaryObjective: PrimaryObjectiveId | null
  dailyTaskGoal: number | null
  level: number
  xp: number
  lastXpTransactionId?: string | null
  xpWindowStartedAt?: Timestamp | null
  xpWindowAmount?: number
  streak: number
  settings: UserSettings
  onboardingCompleted: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  locale: "pt-BR",
  pomodoro: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    cyclesBeforeLongBreak: 4,
  },
  notifications: {
    inApp: true,
    push: false,
  },
}

export function getPrimaryObjectiveLabel(
  objectiveId: PrimaryObjectiveId | null,
) {
  return (
    PRIMARY_OBJECTIVES.find((objective) => objective.id === objectiveId)
      ?.label ?? "A definir"
  )
}
