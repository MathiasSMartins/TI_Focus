import type { Timestamp } from "firebase/firestore"

export const NOTIFICATION_TYPES = [
  "pomodoro_completed",
  "break_completed",
  "goal_near_end",
  "goal_completed",
  "achievement_unlocked",
  "level_up",
  "streak_at_risk",
  "task_due_soon",
  "task_overdue",
] as const

export type NotificationType = (typeof NOTIFICATION_TYPES)[number]

export type NotificationTypePreferences = Record<NotificationType, boolean>

export interface NotificationPreferences {
  inApp: boolean
  push: boolean
  types?: NotificationTypePreferences
}

export const DEFAULT_NOTIFICATION_TYPE_PREFERENCES: NotificationTypePreferences =
  {
    pomodoro_completed: true,
    break_completed: true,
    goal_near_end: true,
    goal_completed: true,
    achievement_unlocked: true,
    level_up: true,
    streak_at_risk: true,
    task_due_soon: true,
    task_overdue: true,
  }

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  pomodoro_completed: "Pomodoro concluído",
  break_completed: "Descanso concluído",
  goal_near_end: "Meta próxima do fim",
  goal_completed: "Meta concluída",
  achievement_unlocked: "Nova conquista",
  level_up: "Level Up",
  streak_at_risk: "Streak em risco",
  task_due_soon: "Tarefa próxima do prazo",
  task_overdue: "Tarefa atrasada",
}

export const NOTIFICATION_TYPE_DESCRIPTIONS: Record<NotificationType, string> =
  {
    pomodoro_completed: "Ao terminar uma sessão de foco.",
    break_completed: "Ao terminar um descanso curto ou longo.",
    goal_near_end: "Quando restar pouco tempo para uma meta ativa.",
    goal_completed: "Quando uma meta diária, semanal ou mensal for concluída.",
    achievement_unlocked: "Ao desbloquear uma conquista.",
    level_up: "Quando seu XP elevar o seu nível.",
    streak_at_risk: "Quando a sequência depender da meta diária atual.",
    task_due_soon: "Quando faltar até 24 horas para uma tarefa.",
    task_overdue: "Quando uma tarefa passar do prazo.",
  }

export interface NotificationDocument {
  type: NotificationType
  title: string
  body: string
  href: string
  sourceId: string
  showInApp: boolean
  showBrowser: boolean
  occurredAt: Timestamp
  createdAt: Timestamp
  readAt: Timestamp | null
  browserDeliveredAt: Timestamp | null
}

export interface AppNotification extends NotificationDocument {
  id: string
}

export interface CreateNotificationInput {
  id: string
  type: NotificationType
  title: string
  body: string
  href: string
  sourceId: string
  occurredAt: Date
}

export function resolveNotificationPreferences(
  preferences?: NotificationPreferences,
): Required<NotificationPreferences> {
  return {
    inApp: preferences?.inApp ?? true,
    push: preferences?.push ?? false,
    types: {
      ...DEFAULT_NOTIFICATION_TYPE_PREFERENCES,
      ...preferences?.types,
    },
  }
}

export function isNotificationTypeEnabled(
  preferences: NotificationPreferences | undefined,
  type: NotificationType,
) {
  return resolveNotificationPreferences(preferences).types[type]
}
