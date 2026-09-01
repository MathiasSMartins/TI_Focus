import {
  collection,
  doc,
  getDocFromServer,
  getDocs,
  onSnapshot,
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

import {
  ACHIEVEMENT_CATALOG,
  ACHIEVEMENT_DEFINITION_VERSION,
  EMPTY_ACHIEVEMENT_STATS,
  getAchievementDefinition,
  getAchievementProgressValue,
  getAchievementsForMetric,
} from "@/features/achievements/domain/achievement-catalog"
import { publishAchievementUnlocked } from "@/features/achievements/events/achievement-events"
import type {
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
import type {
  ProjectCompletionDocument,
  ProjectDocument,
} from "@/features/projects/types/project"
import { firestoreDb } from "@/services/firebase"

interface MetricEvidenceInput {
  evidenceId: string
  metric: AchievementMetric
  sourceType: AchievementEvidenceSource
  sourceId: string
  occurredAt: Timestamp
}

interface UnlockResult {
  achievement: AchievementDefinition
  award: XpAwardResult
}

const reconciliationByUser = new Map<string, Promise<void>>()
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

function getEvidenceReference(uid: string, evidenceId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "achievementEvidence",
    evidenceId,
  ) as DocumentReference<AchievementEvidenceDocument>
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

async function unlockAchievement(
  uid: string,
  achievement: AchievementDefinition,
): Promise<UnlockResult | null> {
  return runWithXpServerTime(uid, (serverNow) =>
    runTransaction<UnlockResult | null>(
      getFirestoreInstance(),
      async (transaction) => {
        const statsReference = getStatsReference(uid)
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

        const progress = getAchievementProgressValue(
          statsSnapshot.data(),
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
        const triggerEvidenceId = statsSnapshot.data().lastEvidenceId
        if (!triggerEvidenceId) return null

        transaction.set(unlockReference, {
          achievementId: achievement.id,
          unlockedAt: serverTimestamp(),
          progressValue: progress,
          rewardXp: achievement.xp,
          awardedXp: amount,
          triggerEvidenceId,
          definitionVersion: ACHIEVEMENT_DEFINITION_VERSION,
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
) {
  for (const achievement of getAchievementsForMetric(metric)) {
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
        [input.metric]: stats[input.metric] + 1,
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

export async function processTaskCompletionForAchievements(
  uid: string,
  taskId: string,
  occurredAt: Timestamp,
  showFeedback = true,
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

  for (const achievement of ACHIEVEMENT_CATALOG.filter(
    (item) => item.sourceAvailable,
  )) {
    await unlockAchievement(uid, achievement)
  }
}

export function reconcileAchievements(uid: string) {
  const current = reconciliationByUser.get(uid)
  if (current) return current
  const reconciliation = reconcileUserAchievements(uid).finally(() => {
    reconciliationByUser.delete(uid)
  })
  reconciliationByUser.set(uid, reconciliation)
  return reconciliation
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
