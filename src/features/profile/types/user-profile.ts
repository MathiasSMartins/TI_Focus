import type { Timestamp } from "firebase/firestore"

export const IT_AREAS = [
  { id: "information-security", label: "Segurança da Informação" },
  { id: "software-development", label: "Desenvolvimento de Software" },
  { id: "infrastructure", label: "Infraestrutura" },
  { id: "support", label: "Suporte / Help Desk" },
  { id: "devops-sre", label: "DevOps / SRE" },
  { id: "data-analytics", label: "Dados / Data Analytics" },
  { id: "cloud", label: "Cloud" },
  { id: "qa-testing", label: "QA / Testes" },
  { id: "it-project-management", label: "Gestão de Projetos de TI" },
  { id: "networks", label: "Redes" },
  { id: "database", label: "Banco de Dados" },
  { id: "other", label: "Outra" },
] as const

export type ITAreaId = (typeof IT_AREAS)[number]["id"]

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

export function getAreaLabel(areaId: ITAreaId | null) {
  return IT_AREAS.find((area) => area.id === areaId)?.label ?? "A definir"
}

export function getPrimaryObjectiveLabel(
  objectiveId: PrimaryObjectiveId | null,
) {
  return (
    PRIMARY_OBJECTIVES.find((objective) => objective.id === objectiveId)
      ?.label ?? "A definir"
  )
}
