import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
  where,
  type Firestore,
} from "firebase/firestore"

import { getAchievementDefinition } from "@/features/achievements/domain/achievement-catalog"
import type { AchievementUnlockDocument } from "@/features/achievements/types/achievement"
import { GOAL_METRIC_LABELS } from "@/features/goals"
import type {
  GoalCompletionDocument,
  GoalProgressDocument,
} from "@/features/goals/types/goal"
import type { PomodoroSessionDocument } from "@/features/pomodoro"
import type { TaskDocument } from "@/features/tasks/types/task"
import type { XpTransactionDocument } from "@/features/gamification"
import { ensureNotification } from "@/features/notifications/services/notification-repository"
import {
  isNotificationTypeEnabled,
  type CreateNotificationInput,
  type NotificationPreferences,
} from "@/features/notifications/types/notification"
import { firestoreDb } from "@/services/firebase"

const HISTORY_WINDOW_MS = 30 * 24 * 60 * 60 * 1_000
const TASK_DUE_SOON_MS = 24 * 60 * 60 * 1_000
const OVERDUE_HISTORY_MS = 7 * 24 * 60 * 60 * 1_000
const GOAL_NEAR_END_MS = {
  daily: 2 * 60 * 60 * 1_000,
  weekly: 24 * 60 * 60 * 1_000,
  monthly: 72 * 60 * 60 * 1_000,
} as const

function getFirestoreInstance(): Firestore {
  if (!firestoreDb) {
    throw new Error("Firebase não está configurado neste ambiente.")
  }
  return firestoreDb
}

function getUserCollection(uid: string, name: string) {
  return collection(getFirestoreInstance(), "users", uid, name)
}

function canCreate(
  preferences: NotificationPreferences,
  type: CreateNotificationInput["type"],
) {
  return (
    (preferences.inApp || preferences.push) &&
    isNotificationTypeEnabled(preferences, type)
  )
}

async function persistCandidates(
  uid: string,
  preferences: NotificationPreferences,
  candidates: CreateNotificationInput[],
  allowBrowserDelivery: boolean,
) {
  const created: CreateNotificationInput[] = []
  for (const candidate of candidates) {
    if (!canCreate(preferences, candidate.type)) continue
    if (
      await ensureNotification(
        uid,
        candidate,
        preferences.inApp,
        preferences.push && allowBrowserDelivery,
      )
    ) {
      created.push(candidate)
    }
  }
  return created
}

function pomodoroCandidate(
  sessionId: string,
  session: PomodoroSessionDocument,
): CreateNotificationInput {
  const isFocus = session.mode === "focus"
  return {
    id: `${isFocus ? "pomodoro_completed" : "break_completed"}__${sessionId}`,
    type: isFocus ? "pomodoro_completed" : "break_completed",
    title: isFocus ? "Pomodoro concluído" : "Descanso concluído",
    body: isFocus
      ? `Você concluiu ${Math.round(session.plannedSeconds / 60)} minutos de foco.`
      : "Hora de iniciar o próximo ciclo com energia renovada.",
    href: "/pomodoro",
    sourceId: sessionId,
    occurredAt: session.completedAt.toDate(),
  }
}

function goalCompletionCandidate(
  completionId: string,
  completion: GoalCompletionDocument,
): CreateNotificationInput {
  const cadence = {
    daily: "diária",
    weekly: "semanal",
    monthly: "mensal",
  }[completion.cadence]
  return {
    id: `goal_completed__${completionId}`,
    type: "goal_completed",
    title: "Meta concluída",
    body: `Sua meta ${cadence} foi concluída com ${completion.finalValue}/${completion.target}.`,
    href: "/goals",
    sourceId: completion.progressId,
    occurredAt: completion.completedAt.toDate(),
  }
}

function achievementCandidate(
  achievementId: string,
  unlock: AchievementUnlockDocument,
): CreateNotificationInput {
  const definition = getAchievementDefinition(unlock.achievementId)
  return {
    id: `achievement_unlocked__${achievementId}`,
    type: "achievement_unlocked",
    title: "Nova conquista",
    body: definition
      ? `${definition.name}: ${definition.description}`
      : "Uma nova conquista foi adicionada ao seu histórico.",
    href: "/achievements",
    sourceId: achievementId,
    occurredAt: unlock.unlockedAt.toDate(),
  }
}

function levelUpCandidate(
  transactionId: string,
  transaction: XpTransactionDocument,
): CreateNotificationInput | null {
  if (transaction.levelAfter <= transaction.levelBefore) return null
  return {
    id: `level_up__${transactionId}__${transaction.levelAfter}`,
    type: "level_up",
    title: `Level Up: nível ${transaction.levelAfter}`,
    body: "Seu progresso rendeu um novo nível. Continue avançando!",
    href: "/dashboard",
    sourceId: transactionId,
    occurredAt: transaction.createdAt.toDate(),
  }
}

function temporalCandidates(
  tasks: Array<{ id: string; data: TaskDocument }>,
  progressItems: Array<{ id: string; data: GoalProgressDocument }>,
  streak: number,
  now: Date,
) {
  const nowMs = now.getTime()
  const candidates: CreateNotificationInput[] = []
  for (const task of tasks) {
    const { dueAt, status, title } = task.data
    if (!dueAt || status === "completed" || status === "archived") continue
    const dueMs = dueAt.toMillis()
    const sourceId = `${task.id}__${dueMs}`
    if (dueMs >= nowMs && dueMs - nowMs <= TASK_DUE_SOON_MS) {
      candidates.push({
        id: `task_due_soon__${sourceId}`,
        type: "task_due_soon",
        title: "Tarefa próxima do prazo",
        body: `“${title}” vence em menos de 24 horas.`,
        href: "/tasks",
        sourceId,
        occurredAt: now,
      })
    } else if (dueMs < nowMs && dueMs >= nowMs - OVERDUE_HISTORY_MS) {
      candidates.push({
        id: `task_overdue__${sourceId}`,
        type: "task_overdue",
        title: "Tarefa atrasada",
        body: `“${title}” passou do prazo e ainda está pendente.`,
        href: "/tasks",
        sourceId,
        occurredAt: now,
      })
    }
  }

  for (const progress of progressItems) {
    const item = progress.data
    const remaining = item.periodEndsAt.toMillis() - nowMs
    if (
      item.completed ||
      nowMs < item.eligibleFrom.toMillis() ||
      remaining <= 0 ||
      remaining > GOAL_NEAR_END_MS[item.cadence]
    ) {
      continue
    }
    candidates.push({
      id: `goal_near_end__${progress.id}`,
      type: "goal_near_end",
      title: "Meta próxima do fim",
      body: `${GOAL_METRIC_LABELS[item.metric]}: ${item.current}/${item.target}. O período termina em breve.`,
      href: "/goals",
      sourceId: progress.id,
      occurredAt: now,
    })
    if (item.cadence === "daily" && streak > 0) {
      candidates.push({
        id: `streak_at_risk__${progress.id}`,
        type: "streak_at_risk",
        title: "Seu streak está em risco",
        body: `Conclua a meta diária para proteger sua sequência de ${streak} dia${streak === 1 ? "" : "s"}.`,
        href: "/goals",
        sourceId: progress.id,
        occurredAt: now,
      })
    }
  }
  return candidates
}

export async function getLevelUpNotificationCandidate(
  uid: string,
  transactionId: string,
) {
  const snapshot = await getDoc(
    doc(getUserCollection(uid, "xpTransactions"), transactionId),
  )
  return snapshot.exists()
    ? levelUpCandidate(transactionId, snapshot.data() as XpTransactionDocument)
    : null
}

export async function reconcileNotifications(
  uid: string,
  preferences: NotificationPreferences,
  streak: number,
  now: Date,
  allowBrowserDelivery: boolean,
) {
  const cutoff = Timestamp.fromMillis(now.getTime() - HISTORY_WINDOW_MS)
  const [
    pomodoros,
    completions,
    achievements,
    xpTransactions,
    tasks,
    progress,
  ] = await Promise.all([
    getDocs(
      query(
        getUserCollection(uid, "pomodoroSessions"),
        where("completedAt", ">=", cutoff),
        orderBy("completedAt", "desc"),
        limit(50),
      ),
    ),
    getDocs(
      query(
        getUserCollection(uid, "goalCompletions"),
        where("completedAt", ">=", cutoff),
        orderBy("completedAt", "desc"),
        limit(50),
      ),
    ),
    getDocs(
      query(
        getUserCollection(uid, "achievements"),
        where("unlockedAt", ">=", cutoff),
        orderBy("unlockedAt", "desc"),
        limit(50),
      ),
    ),
    getDocs(
      query(
        getUserCollection(uid, "xpTransactions"),
        where("createdAt", ">=", cutoff),
        orderBy("createdAt", "desc"),
        limit(100),
      ),
    ),
    getDocs(getUserCollection(uid, "tasks")),
    getDocs(getUserCollection(uid, "goalProgress")),
  ])

  const candidates: CreateNotificationInput[] = [
    ...pomodoros.docs.map((item) =>
      pomodoroCandidate(item.id, item.data() as PomodoroSessionDocument),
    ),
    ...completions.docs.map((item) =>
      goalCompletionCandidate(item.id, item.data() as GoalCompletionDocument),
    ),
    ...achievements.docs.map((item) =>
      achievementCandidate(item.id, item.data() as AchievementUnlockDocument),
    ),
    ...xpTransactions.docs.flatMap((item) => {
      const candidate = levelUpCandidate(
        item.id,
        item.data() as XpTransactionDocument,
      )
      return candidate ? [candidate] : []
    }),
    ...temporalCandidates(
      tasks.docs.map((item) => ({
        id: item.id,
        data: item.data() as TaskDocument,
      })),
      progress.docs.map((item) => ({
        id: item.id,
        data: item.data() as GoalProgressDocument,
      })),
      streak,
      now,
    ),
  ]
  return persistCandidates(uid, preferences, candidates, allowBrowserDelivery)
}

export function createPomodoroNotification(input: {
  sessionId: string
  mode: "focus" | "shortBreak" | "longBreak"
  plannedSeconds: number
  completedAt: Date
}) {
  return pomodoroCandidate(input.sessionId, {
    userId: "",
    sessionId: input.sessionId,
    mode: input.mode,
    plannedSeconds: input.plannedSeconds,
    startedAt: Timestamp.fromDate(input.completedAt),
    expectedEndAt: Timestamp.fromDate(input.completedAt),
    completedAt: Timestamp.fromDate(input.completedAt),
  })
}
