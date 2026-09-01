import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  where,
  type DocumentReference,
  type Firestore,
  type Timestamp,
  type Unsubscribe,
  type WithFieldValue,
} from "firebase/firestore"

import { isITAreaId, type ITAreaId } from "@/config/it-area-config"
import {
  ACHIEVEMENT_CATALOG,
  EMPTY_ACHIEVEMENT_STATS,
  getAchievementDefinition,
  getAchievementProgressValue,
  getAchievementsForMetric,
} from "@/features/achievements/domain/achievement-catalog"
import { publishAchievementUnlocked } from "@/features/achievements/events/achievement-events"
import type {
  AchievementAreaEvidenceDocument,
  AchievementAreaStatsDocument,
  AchievementDefinition,
  AchievementEvidenceDocument,
  AchievementEvidenceSource,
  AchievementId,
  AchievementMetric,
  AchievementStatsDocument,
  AchievementUnlockDocument,
} from "@/features/achievements/types/achievement"
import {
  XP_DAILY_LIMIT,
  XP_WINDOW_DURATION_MS,
  getLevelForXp,
} from "@/features/gamification/domain/xp-system"
import { runWithXpServerTime } from "@/features/gamification/services/xp-repository"
import type {
  AchievementXpTransactionDocument,
  TaskXpTransactionDocument,
  XpAwardResult,
} from "@/features/gamification/types/gamification"
import type { UserProfile } from "@/features/profile/types/user-profile"
import type { PomodoroSessionDocument } from "@/features/pomodoro/types/pomodoro"
import type { GoalStreakDocument } from "@/features/goals/types/goal"
import type {
  ProjectCompletionDocument,
  ProjectDocument,
} from "@/features/projects/types/project"
import { firestoreDb } from "@/services/firebase"

interface MetricEvidenceInput {
  evidenceId: string
  metric: Exclude<AchievementMetric, "areaTasksCompleted">
  sourceType: AchievementEvidenceSource
  sourceId: string
  occurredAt: Timestamp
  value?: number
  strategy?: "increment" | "max"
}

interface UnlockResult {
  achievement: AchievementDefinition
  award: XpAwardResult
}

import { createReconciliationRunner } from "@/utils/reconciliation-runner"

const RECONCILIATION_TTL_MS = 30_000
const runReconciliation = createReconciliationRunner(RECONCILIATION_TTL_MS)
const publishedFeedbackTransactions = new Set<string>()

function getFirestoreInstance(): Firestore {
  if (!firestoreDb) {
    throw new Error("Firebase não está configurado neste ambiente.")
  }
  return firestoreDb
}

function getProfileReference(uid: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
  ) as DocumentReference<UserProfile>
}

function getStatsReference(uid: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "achievementStats",
    "main",
  ) as DocumentReference<AchievementStatsDocument>
}

function getAreaStatsReference(uid: string, areaId: ITAreaId) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "achievementAreaStats",
    areaId,
  ) as DocumentReference<AchievementAreaStatsDocument>
}

function getEvidenceReference(uid: string, evidenceId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "achievementEvidence",
    evidenceId,
  ) as DocumentReference<AchievementEvidenceDocument>
}

function getAreaEvidenceReference(uid: string, evidenceId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "achievementAreaEvidence",
    evidenceId,
  ) as DocumentReference<AchievementAreaEvidenceDocument>
}

function getUnlockReference(uid: string, achievementId: AchievementId) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "achievements",
    achievementId,
  ) as DocumentReference<AchievementUnlockDocument>
}

function getAchievementXpReference(uid: string, achievementId: AchievementId) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "xpTransactions",
    `achievement__${achievementId}`,
  ) as DocumentReference<AchievementXpTransactionDocument>
}

function getTaskXpReference(uid: string, taskId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "xpTransactions",
    taskId,
  ) as DocumentReference<TaskXpTransactionDocument>
}

function getProjectReference(uid: string, projectId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "projects",
    projectId,
  ) as DocumentReference<ProjectDocument>
}

function getProjectCompletionReference(uid: string, projectId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "projectCompletions",
    projectId,
  ) as DocumentReference<ProjectCompletionDocument>
}

function getNormalizedStats(
  stats: AchievementStatsDocument | undefined,
): Omit<AchievementStatsDocument, "updatedAt"> {
  return {
    tasksCompleted: stats?.tasksCompleted ?? 0,
    pomodorosCompleted: stats?.pomodorosCompleted ?? 0,
    bestStreak: stats?.bestStreak ?? 0,
    perfectWeeks: stats?.perfectWeeks ?? 0,
    projectsCompleted: stats?.projectsCompleted ?? 0,
    lastEvidenceId: stats?.lastEvidenceId ?? null,
  }
}

export async function ensureAchievementStats(uid: string) {
  const reference = getStatsReference(uid)
  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const snapshot = await transaction.get(reference)
    if (snapshot.exists()) return
    transaction.set(reference, {
      ...EMPTY_ACHIEVEMENT_STATS,
      updatedAt: serverTimestamp(),
    } as WithFieldValue<AchievementStatsDocument>)
  })
}

export async function ensureAchievementAreaStats(
  uid: string,
  areaId: ITAreaId,
) {
  const reference = getAreaStatsReference(uid, areaId)
  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const snapshot = await transaction.get(reference)
    if (snapshot.exists()) return
    transaction.set(reference, {
      areaId,
      tasksCompleted: 0,
      lastEvidenceId: null,
      updatedAt: serverTimestamp(),
    } as WithFieldValue<AchievementAreaStatsDocument>)
  })
}

async function unlockAchievement(
  uid: string,
  achievement: AchievementDefinition,
): Promise<UnlockResult | null> {
  return runWithXpServerTime(uid, (serverNow) =>
    runTransaction<UnlockResult | null>(
      getFirestoreInstance(),
      async (transaction) => {
        const statsReference = (
          achievement.area === "general"
            ? getStatsReference(uid)
            : getAreaStatsReference(uid, achievement.area)
        ) as DocumentReference<
          AchievementStatsDocument | AchievementAreaStatsDocument
        >
        const unlockReference = getUnlockReference(uid, achievement.id)
        const profileReference = getProfileReference(uid)
        const xpReference = getAchievementXpReference(uid, achievement.id)
        const [statsSnapshot, unlockSnapshot, profileSnapshot, xpSnapshot] =
          await Promise.all([
            transaction.get(statsReference),
            transaction.get(unlockReference),
            transaction.get(profileReference),
            transaction.get(xpReference),
          ])

        if (unlockSnapshot.exists() || xpSnapshot.exists()) return null
        if (!statsSnapshot.exists() || !profileSnapshot.exists()) return null

        const stats = statsSnapshot.data()
        const progress = getAchievementProgressValue(
          stats,
          achievement.condition.metric,
        )
        if (
          !achievement.sourceAvailable ||
          progress < achievement.condition.target
        ) {
          return null
        }

        const profile = profileSnapshot.data()
        const windowStartedAt = profile.xpWindowStartedAt ?? null
        const windowExpired =
          !windowStartedAt ||
          serverNow.toMillis() - windowStartedAt.toMillis() >=
            XP_WINDOW_DURATION_MS
        const currentWindowAmount = windowExpired
          ? 0
          : (profile.xpWindowAmount ?? 0)
        const dailyLimitReached =
          currentWindowAmount + achievement.xp > XP_DAILY_LIMIT
        const amount = dailyLimitReached ? 0 : achievement.xp
        const xpBefore = profile.xp
        const xpAfter = xpBefore + amount
        const levelBefore = getLevelForXp(xpBefore)
        const levelAfter = getLevelForXp(xpAfter)
        const transactionId = `achievement__${achievement.id}`
        const triggerEvidenceId = stats.lastEvidenceId
        if (!triggerEvidenceId) return null

        transaction.set(unlockReference, {
          achievementId: achievement.id,
          unlockedAt: serverTimestamp(),
          progressValue: progress,
          rewardXp: achievement.xp,
          awardedXp: amount,
          triggerEvidenceId,
          definitionVersion: achievement.definitionVersion,
        })
        transaction.set(xpReference, {
          userId: uid,
          amount,
          reason: dailyLimitReached
            ? "Limite diário de XP atingido"
            : "Conquista desbloqueada",
          eventType: "ACHIEVEMENT_UNLOCKED",
          achievementId: achievement.id,
          achievementName: achievement.name,
          createdAt: serverTimestamp(),
          xpBefore,
          xpAfter,
          levelBefore,
          levelAfter,
        })
        if (amount > 0) {
          transaction.update(profileReference, {
            xp: xpAfter,
            level: levelAfter,
            lastXpTransactionId: transactionId,
            xpWindowStartedAt: windowExpired
              ? serverTimestamp()
              : windowStartedAt,
            xpWindowAmount: currentWindowAmount + amount,
            updatedAt: serverTimestamp(),
          })
        }

        return {
          achievement,
          award: {
            transactionId,
            amount,
            xpBefore,
            xpAfter,
            levelBefore,
            levelAfter,
            dailyLimitReached,
            alreadyProcessed: false,
          },
        }
      },
    ),
  )
}

function publishUnlockFeedback(
  uid: string,
  result: UnlockResult,
  unlockedAt = new Date(),
) {
  const feedbackId = `${uid}:${result.award.transactionId}`
  if (publishedFeedbackTransactions.has(feedbackId)) return
  publishedFeedbackTransactions.add(feedbackId)
  publishAchievementUnlocked({
    type: "ACHIEVEMENT_UNLOCKED",
    version: 1,
    userId: uid,
    achievement: result.achievement,
    unlockedAt,
    xpAwarded: result.award.amount,
    levelBefore: result.award.levelBefore,
    levelAfter: result.award.levelAfter,
    dailyLimitReached: result.award.dailyLimitReached,
  })
}

async function unlockEligibleAchievements(
  uid: string,
  metric: AchievementMetric,
  showFeedback: boolean,
  area?: AchievementDefinition["area"],
) {
  for (const achievement of getAchievementsForMetric(metric, area)) {
    const result = await unlockAchievement(uid, achievement)
    if (result && showFeedback) publishUnlockFeedback(uid, result)
  }
}

async function publishFeedbackForEvidence(uid: string, evidenceId: string) {
  const unlockSnapshot = await getDocs(
    query(
      collection(getFirestoreInstance(), "users", uid, "achievements"),
      where("triggerEvidenceId", "==", evidenceId),
    ),
  )

  for (const unlockDocument of unlockSnapshot.docs) {
    const unlock = unlockDocument.data() as AchievementUnlockDocument
    const achievement = getAchievementDefinition(unlock.achievementId)
    if (!achievement) continue

    const xpSnapshot = await getDocFromServer(
      getAchievementXpReference(uid, unlock.achievementId),
    )
    if (!xpSnapshot.exists()) continue
    const xpTransaction = xpSnapshot.data()
    if (xpTransaction.eventType !== "ACHIEVEMENT_UNLOCKED") continue

    publishUnlockFeedback(
      uid,
      {
        achievement,
        award: {
          transactionId: `achievement__${unlock.achievementId}`,
          amount: xpTransaction.amount,
          xpBefore: xpTransaction.xpBefore,
          xpAfter: xpTransaction.xpAfter,
          levelBefore: xpTransaction.levelBefore,
          levelAfter: xpTransaction.levelAfter,
          dailyLimitReached: xpTransaction.amount === 0 && unlock.rewardXp > 0,
          alreadyProcessed: true,
        },
      },
      unlock.unlockedAt.toDate(),
    )
  }
}

async function recordMetricEvidence(
  uid: string,
  input: MetricEvidenceInput,
  showFeedback: boolean,
) {
  const statsReference = getStatsReference(uid)
  const evidenceReference = getEvidenceReference(uid, input.evidenceId)

  const recorded = await runTransaction(
    getFirestoreInstance(),
    async (transaction) => {
      const [statsSnapshot, evidenceSnapshot] = await Promise.all([
        transaction.get(statsReference),
        transaction.get(evidenceReference),
      ])
      if (evidenceSnapshot.exists()) return false
      if (!statsSnapshot.exists()) {
        throw new Error("Progresso de conquistas não inicializado.")
      }

      const stats = getNormalizedStats(statsSnapshot.data())
      transaction.set(evidenceReference, {
        metric: input.metric,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        occurredAt: input.occurredAt,
        recordedAt: serverTimestamp(),
      })
      transaction.update(statsReference, {
        [input.metric]:
          input.strategy === "max"
            ? Math.max(stats[input.metric], input.value ?? 0)
            : stats[input.metric] + (input.value ?? 1),
        lastEvidenceId: input.evidenceId,
        updatedAt: serverTimestamp(),
      })
      return true
    },
  )

  if (recorded || showFeedback) {
    await unlockEligibleAchievements(uid, input.metric, showFeedback)
  }
  if (showFeedback) {
    await publishFeedbackForEvidence(uid, input.evidenceId)
  }
}

async function recordAreaTaskEvidence(
  uid: string,
  areaId: ITAreaId,
  taskId: string,
  occurredAt: Timestamp,
  showFeedback: boolean,
) {
  const evidenceId = `area_task_completed__${taskId}`
  const statsReference = getAreaStatsReference(uid, areaId)
  const evidenceReference = getAreaEvidenceReference(uid, evidenceId)

  const recorded = await runTransaction(
    getFirestoreInstance(),
    async (transaction) => {
      const [statsSnapshot, evidenceSnapshot] = await Promise.all([
        transaction.get(statsReference),
        transaction.get(evidenceReference),
      ])
      if (evidenceSnapshot.exists()) return false
      if (!statsSnapshot.exists()) {
        throw new Error("Progresso de conquistas da área não inicializado.")
      }

      const stats = statsSnapshot.data()
      transaction.set(evidenceReference, {
        areaId,
        metric: "areaTasksCompleted",
        sourceType: "TASK_COMPLETED",
        sourceId: taskId,
        occurredAt,
        recordedAt: serverTimestamp(),
      })
      transaction.update(statsReference, {
        tasksCompleted: stats.tasksCompleted + 1,
        lastEvidenceId: evidenceId,
        updatedAt: serverTimestamp(),
      })
      return true
    },
  )

  if (recorded || showFeedback) {
    await unlockEligibleAchievements(
      uid,
      "areaTasksCompleted",
      showFeedback,
      areaId,
    )
  }
  if (showFeedback) {
    await publishFeedbackForEvidence(uid, evidenceId)
  }
}

export async function processTaskCompletionForAchievements(
  uid: string,
  taskId: string,
  occurredAt: Timestamp,
  showFeedback = true,
  areaId?: ITAreaId | null,
) {
  await ensureAchievementStats(uid)
  await recordMetricEvidence(
    uid,
    {
      evidenceId: `task_completed__${taskId}`,
      metric: "tasksCompleted",
      sourceType: "TASK_COMPLETED",
      sourceId: taskId,
      occurredAt,
    },
    showFeedback,
  )

  if (!isITAreaId(areaId)) return
  await ensureAchievementAreaStats(uid, areaId)
  await recordAreaTaskEvidence(uid, areaId, taskId, occurredAt, showFeedback)
}

export async function processPersistedTaskCompletionForAchievements(
  uid: string,
  taskId: string,
  showFeedback = true,
) {
  const snapshot = await getDocFromServer(getTaskXpReference(uid, taskId))
  if (!snapshot.exists() || snapshot.data().eventType !== "TASK_COMPLETED") {
    return
  }
  await processTaskCompletionForAchievements(
    uid,
    taskId,
    snapshot.data().createdAt,
    showFeedback,
    snapshot.data().areaId,
  )
}

export async function processPomodoroCompletionForAchievements(
  uid: string,
  sessionId: string,
  occurredAt: Timestamp,
  showFeedback = true,
) {
  await ensureAchievementStats(uid)
  await recordMetricEvidence(
    uid,
    {
      evidenceId: `pomodoro_completed__${sessionId}`,
      metric: "pomodorosCompleted",
      sourceType: "POMODORO_COMPLETED",
      sourceId: sessionId,
      occurredAt,
    },
    showFeedback,
  )
}

export async function processPersistedPomodoroCompletionForAchievements(
  uid: string,
  sessionId: string,
  showFeedback = true,
) {
  const snapshot = await getDocFromServer(
    doc(getFirestoreInstance(), "users", uid, "pomodoroSessions", sessionId),
  )
  if (!snapshot.exists()) return
  const session = snapshot.data() as PomodoroSessionDocument
  if (session.mode !== "focus") return
  await processPomodoroCompletionForAchievements(
    uid,
    session.sessionId,
    session.completedAt,
    showFeedback,
  )
}

export async function processActivityStreakForAchievements(
  uid: string,
  streak: number,
  occurredAt: Timestamp,
  showFeedback = true,
) {
  if (streak <= 0) return
  await ensureAchievementStats(uid)
  await recordMetricEvidence(
    uid,
    {
      evidenceId: `activity_streak__${streak}`,
      metric: "bestStreak",
      sourceType: "ACTIVITY_STREAK",
      sourceId: String(streak),
      occurredAt,
      value: streak,
      strategy: "max",
    },
    showFeedback,
  )
}

export async function processPersistedActivityStreakForAchievements(
  uid: string,
  showFeedback = true,
) {
  const snapshot = await getDocFromServer(
    doc(getFirestoreInstance(), "users", uid, "goalStreak", "main"),
  )
  if (!snapshot.exists()) return
  const streak = snapshot.data() as GoalStreakDocument
  if (!streak.lastCompletedAt || streak.best <= 0) return
  await processActivityStreakForAchievements(
    uid,
    streak.best,
    streak.lastCompletedAt,
    showFeedback,
  )
}

export async function processProjectCompletionForAchievements(
  uid: string,
  projectId: string,
  occurredAt: Timestamp,
  showFeedback = true,
) {
  await ensureAchievementStats(uid)
  await recordMetricEvidence(
    uid,
    {
      evidenceId: `project_completed__${projectId}`,
      metric: "projectsCompleted",
      sourceType: "PROJECT_COMPLETED",
      sourceId: projectId,
      occurredAt,
    },
    showFeedback,
  )
}

export async function processPersistedProjectCompletionForAchievements(
  uid: string,
  projectId: string,
  showFeedback = true,
) {
  const snapshot = await getDocFromServer(
    getProjectCompletionReference(uid, projectId),
  )
  if (!snapshot.exists()) return
  await processProjectCompletionForAchievements(
    uid,
    projectId,
    snapshot.data().completedAt,
    showFeedback,
  )
}

async function ensureProjectCompletionMarker(uid: string, projectId: string) {
  const projectReference = getProjectReference(uid, projectId)
  const completionReference = getProjectCompletionReference(uid, projectId)
  return runTransaction<ProjectCompletionDocument | null>(
    getFirestoreInstance(),
    async (transaction) => {
      const [projectSnapshot, completionSnapshot] = await Promise.all([
        transaction.get(projectReference),
        transaction.get(completionReference),
      ])
      if (completionSnapshot.exists()) return completionSnapshot.data()
      if (!projectSnapshot.exists()) return null

      const project = projectSnapshot.data()
      if (project.deletedAt || project.status !== "completed") return null
      const completion: ProjectCompletionDocument = {
        userId: uid,
        projectId,
        projectName: project.name,
        completedAt: project.updatedAt,
      }
      transaction.set(completionReference, completion)
      return completion
    },
  )
}

async function reconcileUserAchievements(uid: string) {
  await ensureAchievementStats(uid)
  const database = getFirestoreInstance()
  const [taskSnapshot, projectCompletionSnapshot, completedProjectSnapshot] =
    await Promise.all([
      getDocs(
        query(
          collection(database, "users", uid, "xpTransactions"),
          where("eventType", "==", "TASK_COMPLETED"),
        ),
      ),
      getDocs(collection(database, "users", uid, "projectCompletions")),
      getDocs(
        query(
          collection(database, "users", uid, "projects"),
          where("status", "==", "completed"),
        ),
      ),
    ])

  const taskCompletions = taskSnapshot.docs
    .map((snapshot) => ({
      id: snapshot.id,
      ...(snapshot.data() as TaskXpTransactionDocument),
    }))
    .sort(
      (left, right) =>
        left.createdAt.toMillis() - right.createdAt.toMillis() ||
        left.id.localeCompare(right.id),
    )
  for (const completion of taskCompletions) {
    await processTaskCompletionForAchievements(
      uid,
      completion.taskId,
      completion.createdAt,
      false,
      completion.areaId,
    )
  }

  const projectCompletionsById = new Map(
    projectCompletionSnapshot.docs.map((snapshot) => {
      const completion = snapshot.data() as ProjectCompletionDocument
      return [completion.projectId, completion] as const
    }),
  )
  for (const projectSnapshot of completedProjectSnapshot.docs) {
    if (projectCompletionsById.has(projectSnapshot.id)) continue
    const completion = await ensureProjectCompletionMarker(
      uid,
      projectSnapshot.id,
    )
    if (completion) {
      projectCompletionsById.set(projectSnapshot.id, completion)
    }
  }

  const projectCompletions = [...projectCompletionsById.values()].sort(
    (left, right) =>
      left.completedAt.toMillis() - right.completedAt.toMillis() ||
      left.projectId.localeCompare(right.projectId),
  )
  for (const completion of projectCompletions) {
    await processProjectCompletionForAchievements(
      uid,
      completion.projectId,
      completion.completedAt,
      false,
    )
  }

  const pomodoroSnapshot = await getDocs(
    query(
      collection(database, "users", uid, "pomodoroSessions"),
      orderBy("completedAt", "asc"),
    ),
  )
  for (const sessionSnapshot of pomodoroSnapshot.docs) {
    const session = sessionSnapshot.data() as PomodoroSessionDocument
    if (session.mode === "focus") {
      await processPomodoroCompletionForAchievements(
        uid,
        session.sessionId,
        session.completedAt,
        false,
      )
    }
  }
  await processPersistedActivityStreakForAchievements(uid, false)

  for (const achievement of ACHIEVEMENT_CATALOG.filter(
    (item) => item.sourceAvailable,
  )) {
    await unlockAchievement(uid, achievement)
  }
}

export function reconcileAchievements(uid: string, force = false) {
  return runReconciliation(uid, () => reconcileUserAchievements(uid), force)
}

export function subscribeToAchievementStats(
  uid: string,
  onValue: (stats: AchievementStatsDocument | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getStatsReference(uid),
    (snapshot) => onValue(snapshot.exists() ? snapshot.data() : null),
    onError,
  )
}

export function subscribeToAchievementAreaStats(
  uid: string,
  areaId: ITAreaId,
  onValue: (stats: AchievementAreaStatsDocument | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getAreaStatsReference(uid, areaId),
    (snapshot) => onValue(snapshot.exists() ? snapshot.data() : null),
    onError,
  )
}

export function subscribeToAchievementUnlocks(
  uid: string,
  onValue: (unlocks: AchievementUnlockDocument[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getFirestoreInstance(), "users", uid, "achievements"),
    (snapshot) =>
      onValue(
        snapshot.docs.map(
          (unlockSnapshot) =>
            unlockSnapshot.data() as AchievementUnlockDocument,
        ),
      ),
    onError,
  )
}
