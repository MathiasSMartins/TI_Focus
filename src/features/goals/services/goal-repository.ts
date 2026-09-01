import {
  Timestamp,
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
  type Unsubscribe,
  type WithFieldValue,
} from "firebase/firestore"

import {
  getCivilPeriod,
  differenceInCivilDays,
} from "@/features/goals/domain/civil-period"
import { publishGoalCompleted } from "@/features/goals/events/goal-events"
import type {
  GoalCadence,
  GoalCompletionDocument,
  GoalDocument,
  GoalEvidenceDocument,
  GoalMetric,
  GoalProgressDocument,
  GoalSourceType,
  GoalSourceValues,
  GoalStreakDocument,
} from "@/features/goals/types/goal"
import { GOAL_CADENCES, GOAL_REWARD_XP } from "@/features/goals/types/goal"
import {
  applyPreparedGoalXpAward,
  prepareGoalXpAward,
  runWithXpServerTime,
} from "@/features/gamification/services/xp-repository"
import type { XpTransactionDocument } from "@/features/gamification/types/gamification"
import type { PomodoroSessionDocument } from "@/features/pomodoro/types/pomodoro"
import type { UserProfile } from "@/features/profile/types/user-profile"
import { firestoreDb } from "@/services/firebase"

interface GoalSourceInput {
  sourceType: GoalSourceType
  sourceId: string
  occurredAt: Timestamp
  timezone: string
  values: GoalSourceValues
  showFeedback?: boolean
}

const reconciliationByUser = new Map<string, Promise<void>>()

function getFirestoreInstance(): Firestore {
  if (!firestoreDb)
    throw new Error("Firebase não está configurado neste ambiente.")
  return firestoreDb
}

function getGoalReference(uid: string, cadence: GoalCadence) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "goals",
    cadence,
  ) as DocumentReference<GoalDocument>
}

function getProgressReference(uid: string, progressId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "goalProgress",
    progressId,
  ) as DocumentReference<GoalProgressDocument>
}

function getEvidenceReference(uid: string, evidenceId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "goalEvidence",
    evidenceId,
  ) as DocumentReference<GoalEvidenceDocument>
}

function getCompletionReference(uid: string, progressId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "goalCompletions",
    progressId,
  ) as DocumentReference<GoalCompletionDocument>
}

function getStreakReference(uid: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "goalStreak",
    "main",
  ) as DocumentReference<GoalStreakDocument>
}

function getProfileReference(uid: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
  ) as DocumentReference<UserProfile>
}

function progressFromGoal(
  uid: string,
  goal: GoalDocument,
  timezone: string,
  period: ReturnType<typeof getCivilPeriod>,
  eligibleFrom = Timestamp.fromDate(period.startsAt),
): WithFieldValue<GoalProgressDocument> {
  return {
    userId: uid,
    cadence: goal.cadence,
    periodKey: period.key,
    timezone,
    periodStartsAt: Timestamp.fromDate(period.startsAt),
    periodEndsAt: Timestamp.fromDate(period.endsAt),
    eligibleFrom,
    metric: goal.metric,
    target: goal.target,
    rewardXp: goal.rewardXp,
    current: 0,
    completed: false,
    completedAt: null,
    lastEvidenceId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

function assertGoalInput(metric: GoalMetric, target: number) {
  if (
    !(
      [
        "tasksCompleted",
        "xpEarned",
        "pomodorosCompleted",
        "focusedSeconds",
      ] as string[]
    ).includes(metric)
  ) {
    throw new Error("Métrica de meta inválida.")
  }
  if (!Number.isInteger(target) || target <= 0) {
    throw new Error("O alvo deve ser um número inteiro positivo.")
  }
}

export async function saveGoal(
  uid: string,
  cadence: GoalCadence,
  metric: GoalMetric,
  target: number,
  timezone: string,
) {
  assertGoalInput(metric, target)
  await runWithXpServerTime(uid, async (serverNow) => {
    const currentPeriod = getCivilPeriod(serverNow.toDate(), timezone, cadence)
    const nextPeriod = getCivilPeriod(
      new Date(currentPeriod.endsAt.getTime() + 1),
      timezone,
      cadence,
    )
    const goalReference = getGoalReference(uid, cadence)
    const progressReference = getProgressReference(
      uid,
      `${cadence}__${currentPeriod.key}`,
    )

    await runTransaction(getFirestoreInstance(), async (transaction) => {
      const [goalSnapshot, progressSnapshot] = await Promise.all([
        transaction.get(goalReference),
        transaction.get(progressReference),
      ])
      const currentGoal = goalSnapshot.data()

      if (
        currentGoal?.active &&
        !progressSnapshot.exists() &&
        currentPeriod.key >= currentGoal.effectiveFromPeriodKey
      ) {
        transaction.set(
          progressReference,
          progressFromGoal(uid, currentGoal, timezone, currentPeriod),
        )
      }

      transaction.set(goalReference, {
        userId: uid,
        cadence,
        metric,
        target,
        rewardXp: GOAL_REWARD_XP[cadence],
        active: true,
        effectiveFromPeriodKey: currentGoal
          ? nextPeriod.key
          : currentPeriod.key,
        createdAt: currentGoal?.createdAt ?? serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      if (cadence === "daily") {
        transaction.update(getProfileReference(uid), {
          dailyTaskGoal:
            metric === "tasksCompleted" && target <= 50 ? target : null,
          updatedAt: serverTimestamp(),
        })
      }

      if (!currentGoal && !progressSnapshot.exists()) {
        transaction.set(progressReference, {
          userId: uid,
          cadence,
          periodKey: currentPeriod.key,
          timezone,
          periodStartsAt: Timestamp.fromDate(currentPeriod.startsAt),
          periodEndsAt: Timestamp.fromDate(currentPeriod.endsAt),
          eligibleFrom: serverNow,
          metric,
          target,
          rewardXp: GOAL_REWARD_XP[cadence],
          current: 0,
          completed: false,
          completedAt: null,
          lastEvidenceId: null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      }
    })
  })
}

export async function deactivateGoal(
  uid: string,
  cadence: GoalCadence,
  timezone: string,
) {
  void timezone
  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const goalReference = getGoalReference(uid, cadence)
    const goalSnapshot = await transaction.get(goalReference)
    if (!goalSnapshot.exists()) return

    transaction.update(goalReference, {
      active: false,
      updatedAt: serverTimestamp(),
    })
    if (cadence === "daily") {
      transaction.update(getProfileReference(uid), {
        dailyTaskGoal: null,
        updatedAt: serverTimestamp(),
      })
    }
  })
}

export async function migrateLegacyDailyGoal(
  uid: string,
  target: number | null,
  timezone: string,
) {
  if (!target || target <= 0) return
  const snapshot = await getDocFromServer(getGoalReference(uid, "daily"))
  if (!snapshot.exists()) {
    await saveGoal(uid, "daily", "tasksCompleted", target, timezone)
  }
}

export async function ensureCurrentGoalProgress(uid: string, timezone: string) {
  await runWithXpServerTime(uid, async (serverNow) => {
    for (const cadence of GOAL_CADENCES) {
      const period = getCivilPeriod(serverNow.toDate(), timezone, cadence)
      const goalReference = getGoalReference(uid, cadence)
      const progressReference = getProgressReference(
        uid,
        `${cadence}__${period.key}`,
      )
      await runTransaction(getFirestoreInstance(), async (transaction) => {
        const [goalSnapshot, progressSnapshot] = await Promise.all([
          transaction.get(goalReference),
          transaction.get(progressReference),
        ])
        if (progressSnapshot.exists() || !goalSnapshot.exists()) return
        const goal = goalSnapshot.data()
        if (!goal.active || period.key < goal.effectiveFromPeriodKey) return
        transaction.set(
          progressReference,
          progressFromGoal(uid, goal, timezone, period),
        )
      })
    }
  })
}

interface ResolvedGoalProgress {
  id: string
  progress: GoalProgressDocument
}

type GoalProgressByCadence = Map<GoalCadence, readonly ResolvedGoalProgress[]>

function resolveProgressForSource(
  candidates: readonly ResolvedGoalProgress[],
  occurredAt: Timestamp,
) {
  const occurredAtMillis = occurredAt.toMillis()
  const matches = candidates
    .filter(
      ({ progress }) =>
        occurredAtMillis >= progress.periodStartsAt.toMillis() &&
        occurredAtMillis < progress.periodEndsAt.toMillis(),
    )
    .sort(
      (left, right) =>
        left.progress.createdAt.toMillis() -
          right.progress.createdAt.toMillis() ||
        left.id.localeCompare(right.id),
    )
  return matches[0] ?? null
}

async function findProgressForSource(
  uid: string,
  cadence: GoalCadence,
  occurredAt: Timestamp,
  candidates?: readonly ResolvedGoalProgress[],
): Promise<ResolvedGoalProgress | null> {
  if (candidates) return resolveProgressForSource(candidates, occurredAt)

  const snapshot = await getDocs(
    query(
      collection(getFirestoreInstance(), "users", uid, "goalProgress"),
      where("cadence", "==", cadence),
    ),
  )
  return resolveProgressForSource(
    snapshot.docs.map((item) => ({
      id: item.id,
      progress: item.data() as GoalProgressDocument,
    })),
    occurredAt,
  )
}

async function processSourceForCadence(
  uid: string,
  cadence: GoalCadence,
  input: GoalSourceInput,
  progressCandidates?: readonly ResolvedGoalProgress[],
) {
  const resolvedProgress = await findProgressForSource(
    uid,
    cadence,
    input.occurredAt,
    progressCandidates,
  )
  const fallbackPeriod = getCivilPeriod(
    input.occurredAt.toDate(),
    input.timezone,
    cadence,
  )
  const progressId = resolvedProgress?.id ?? `${cadence}__${fallbackPeriod.key}`
  const evidenceId = `${cadence}__${input.sourceType}__${input.sourceId}`

  const result = await runWithXpServerTime(uid, async (serverNow) => {
    const initialGoalReference = getGoalReference(uid, cadence)
    const initialProgressReference = getProgressReference(uid, progressId)
    await runTransaction(getFirestoreInstance(), async (transaction) => {
      const [goalSnapshot, progressSnapshot] = await Promise.all([
        transaction.get(initialGoalReference),
        transaction.get(initialProgressReference),
      ])
      if (progressSnapshot.exists() || !goalSnapshot.exists()) return
      const goal = goalSnapshot.data()
      if (!goal.active || fallbackPeriod.key < goal.effectiveFromPeriodKey) {
        return
      }
      transaction.set(
        initialProgressReference,
        progressFromGoal(uid, goal, input.timezone, fallbackPeriod),
      )
    })

    return runTransaction(getFirestoreInstance(), async (transaction) => {
      const goalReference = getGoalReference(uid, cadence)
      const progressReference = getProgressReference(uid, progressId)
      const evidenceReference = getEvidenceReference(uid, evidenceId)
      const [goalSnapshot, progressSnapshot, evidenceSnapshot] =
        await Promise.all([
          transaction.get(goalReference),
          transaction.get(progressReference),
          transaction.get(evidenceReference),
        ])
      if (evidenceSnapshot.exists()) return null

      const goal = goalSnapshot.data()
      if (
        !progressSnapshot.exists() &&
        (!goal ||
          !goal.active ||
          fallbackPeriod.key < goal.effectiveFromPeriodKey)
      ) {
        return null
      }

      const progress = progressSnapshot.exists()
        ? progressSnapshot.data()
        : ({
            userId: uid,
            cadence,
            periodKey: fallbackPeriod.key,
            timezone: input.timezone,
            periodStartsAt: Timestamp.fromDate(fallbackPeriod.startsAt),
            periodEndsAt: Timestamp.fromDate(fallbackPeriod.endsAt),
            eligibleFrom: Timestamp.fromDate(fallbackPeriod.startsAt),
            metric: goal!.metric,
            target: goal!.target,
            rewardXp: goal!.rewardXp,
            current: 0,
            completed: false,
            completedAt: null,
            lastEvidenceId: null,
            createdAt: serverNow,
            updatedAt: serverNow,
          } satisfies GoalProgressDocument)
      const eligibleFrom = progress.eligibleFrom ?? progress.createdAt
      const occurredAtMillis = input.occurredAt.toMillis()
      if (
        occurredAtMillis < progress.periodStartsAt.toMillis() ||
        occurredAtMillis >= progress.periodEndsAt.toMillis() ||
        occurredAtMillis < eligibleFrom.toMillis()
      ) {
        return null
      }

      const delta = input.values[progress.metric]
      if (delta === undefined || !Number.isFinite(delta) || delta < 0) {
        return null
      }

      const nextValue = progress.current + delta
      const newlyCompleted = !progress.completed && nextValue >= progress.target
      let completionExists = false
      let preparedAward: Awaited<ReturnType<typeof prepareGoalXpAward>> | null =
        null
      let nextStreak: GoalStreakDocument | null = null

      if (newlyCompleted) {
        const completionSnapshot = await transaction.get(
          getCompletionReference(uid, progressId),
        )
        completionExists = completionSnapshot.exists()
        if (!completionExists) {
          preparedAward = await prepareGoalXpAward(
            transaction,
            uid,
            progressId,
            cadence,
            progress.rewardXp,
            serverNow,
          )
          if (cadence === "daily") {
            const streakSnapshot = await transaction.get(
              getStreakReference(uid),
            )
            const current = streakSnapshot.data() ?? {
              current: 0,
              best: 0,
              productiveDays: 0,
              lastProcessedProgressId: "",
              lastCompletedPeriodKey: null,
              lastCompletedAt: null,
            }
            if (current.lastCompletedPeriodKey !== progress.periodKey) {
              const difference = current.lastCompletedPeriodKey
                ? differenceInCivilDays(
                    progress.periodKey,
                    current.lastCompletedPeriodKey,
                  )
                : null
              const advancesChain = difference === null || difference > 0
              const streakCurrent =
                difference === null
                  ? 1
                  : difference === 1
                    ? current.current + 1
                    : difference > 1
                      ? 1
                      : current.current
              nextStreak = {
                current: streakCurrent,
                best: Math.max(current.best, streakCurrent),
                productiveDays: current.productiveDays + 1,
                lastProcessedProgressId: progressId,
                lastCompletedPeriodKey: advancesChain
                  ? progress.periodKey
                  : current.lastCompletedPeriodKey,
                lastCompletedAt: advancesChain
                  ? serverNow
                  : current.lastCompletedAt,
                updatedAt: serverNow,
              }
            }
          }
        }
      }

      transaction.set(evidenceReference, {
        progressId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
        metric: progress.metric,
        delta,
        occurredAt: input.occurredAt,
        recordedAt: serverTimestamp(),
      })
      transaction.set(progressReference, {
        ...progress,
        eligibleFrom,
        current: nextValue,
        completed: progress.completed || newlyCompleted,
        completedAt: newlyCompleted ? serverTimestamp() : progress.completedAt,
        lastEvidenceId: evidenceId,
        updatedAt: serverTimestamp(),
      })

      if (newlyCompleted && !completionExists && preparedAward) {
        transaction.set(getCompletionReference(uid, progressId), {
          progressId,
          cadence,
          periodKey: progress.periodKey,
          metric: progress.metric,
          target: progress.target,
          finalValue: nextValue,
          rewardXp: progress.rewardXp,
          completedAt: serverTimestamp(),
        })
        applyPreparedGoalXpAward(transaction, preparedAward)
        if (nextStreak) {
          transaction.set(getStreakReference(uid), {
            ...nextStreak,
            lastCompletedAt:
              nextStreak.lastCompletedPeriodKey === progress.periodKey
                ? serverTimestamp()
                : nextStreak.lastCompletedAt,
            updatedAt: serverTimestamp(),
          })
          transaction.update(getProfileReference(uid), {
            streak: nextStreak.current,
            updatedAt: serverTimestamp(),
          })
        }
        return {
          progressId,
          periodKey: progress.periodKey,
          awardedXp: preparedAward.result.amount,
          rewardXp: progress.rewardXp,
          streak: nextStreak?.current ?? null,
        }
      }
      return null
    })
  })

  if (result && input.showFeedback !== false) {
    publishGoalCompleted({
      type: "GOAL_COMPLETED",
      version: 1,
      userId: uid,
      progressId: result.progressId,
      cadence,
      periodKey: result.periodKey,
      rewardXp: result.rewardXp,
      awardedXp: result.awardedXp,
      streak: result.streak,
      occurredAt: input.occurredAt.toDate(),
    })
  }
}

async function processGoalSourceWithProgress(
  uid: string,
  input: GoalSourceInput,
  progressByCadence?: GoalProgressByCadence,
) {
  for (const cadence of GOAL_CADENCES) {
    await processSourceForCadence(
      uid,
      cadence,
      input,
      progressByCadence?.get(cadence),
    )
  }
}

export async function processGoalSource(uid: string, input: GoalSourceInput) {
  await processGoalSourceWithProgress(uid, input)
}

async function processXpTransactionWithProgress(
  uid: string,
  transactionId: string,
  xpTransaction: XpTransactionDocument,
  timezone: string,
  showFeedback: boolean,
  progressByCadence?: GoalProgressByCadence,
) {
  if (xpTransaction.eventType === "GOAL_COMPLETED") return
  await processGoalSourceWithProgress(
    uid,
    {
      sourceType:
        xpTransaction.eventType === "TASK_COMPLETED"
          ? "TASK_COMPLETED"
          : "XP_TRANSACTION",
      sourceId: transactionId,
      occurredAt: xpTransaction.createdAt,
      timezone,
      values: {
        tasksCompleted:
          xpTransaction.eventType === "TASK_COMPLETED" ? 1 : undefined,
        xpEarned: xpTransaction.amount,
      },
      showFeedback,
    },
    progressByCadence,
  )
}

export async function processXpTransactionForGoals(
  uid: string,
  transactionId: string,
  xpTransaction: XpTransactionDocument,
  timezone: string,
  showFeedback = true,
) {
  await processXpTransactionWithProgress(
    uid,
    transactionId,
    xpTransaction,
    timezone,
    showFeedback,
  )
}

async function processPersistedXpTransaction(
  uid: string,
  transactionId: string,
  timezone: string,
  showFeedback: boolean,
  expectedEventType?: "TASK_COMPLETED",
) {
  const snapshot = await getDocFromServer(
    doc(getFirestoreInstance(), "users", uid, "xpTransactions", transactionId),
  )
  if (!snapshot.exists()) return
  const xpTransaction = snapshot.data() as XpTransactionDocument
  if (expectedEventType && xpTransaction.eventType !== expectedEventType) return
  await processXpTransactionForGoals(
    uid,
    snapshot.id,
    xpTransaction,
    timezone,
    showFeedback,
  )
}

export async function processPersistedXpTransactionForGoals(
  uid: string,
  transactionId: string,
  timezone: string,
  showFeedback = true,
) {
  await processPersistedXpTransaction(
    uid,
    transactionId,
    timezone,
    showFeedback,
  )
}

export async function processPersistedTaskCompletionForGoals(
  uid: string,
  taskId: string,
  timezone: string,
  showFeedback = true,
) {
  await processPersistedXpTransaction(
    uid,
    taskId,
    timezone,
    showFeedback,
    "TASK_COMPLETED",
  )
}

async function processPomodoroSessionWithProgress(
  uid: string,
  session: PomodoroSessionDocument,
  timezone: string,
  showFeedback: boolean,
  progressByCadence?: GoalProgressByCadence,
) {
  if (session.mode !== "focus") return
  await processGoalSourceWithProgress(
    uid,
    {
      sourceType: "POMODORO_COMPLETED",
      sourceId: session.sessionId,
      occurredAt: session.completedAt,
      timezone,
      values: {
        pomodorosCompleted: 1,
        focusedSeconds: session.plannedSeconds,
      },
      showFeedback,
    },
    progressByCadence,
  )
}

export async function processPomodoroSessionForGoals(
  uid: string,
  session: PomodoroSessionDocument,
  timezone: string,
  showFeedback = true,
) {
  await processPomodoroSessionWithProgress(uid, session, timezone, showFeedback)
}

export async function processPersistedPomodoroForGoals(
  uid: string,
  sessionId: string,
  timezone: string,
  showFeedback = true,
) {
  const snapshot = await getDocFromServer(
    doc(getFirestoreInstance(), "users", uid, "pomodoroSessions", sessionId),
  )
  if (!snapshot.exists()) return
  await processPomodoroSessionForGoals(
    uid,
    snapshot.data() as PomodoroSessionDocument,
    timezone,
    showFeedback,
  )
}

async function reconcileUserGoals(uid: string, timezone: string) {
  await ensureCurrentGoalProgress(uid, timezone)
  const progressSnapshot = await getDocs(
    collection(getFirestoreInstance(), "users", uid, "goalProgress"),
  )
  const resolvedProgress = progressSnapshot.docs.map((item) => ({
    id: item.id,
    progress: item.data() as GoalProgressDocument,
  }))
  if (resolvedProgress.length === 0) return

  const progressByCadence: GoalProgressByCadence = new Map()
  let earliestEligibleFrom =
    resolvedProgress[0].progress.eligibleFrom ??
    resolvedProgress[0].progress.createdAt
  for (const item of resolvedProgress) {
    const eligibleFrom = item.progress.eligibleFrom ?? item.progress.createdAt
    if (eligibleFrom.toMillis() < earliestEligibleFrom.toMillis()) {
      earliestEligibleFrom = eligibleFrom
    }
    progressByCadence.set(item.progress.cadence, [
      ...(progressByCadence.get(item.progress.cadence) ?? []),
      item,
    ])
  }

  const [xpSnapshot, pomodoroSnapshot] = await Promise.all([
    getDocs(
      query(
        collection(getFirestoreInstance(), "users", uid, "xpTransactions"),
        where("createdAt", ">=", earliestEligibleFrom),
        orderBy("createdAt", "asc"),
      ),
    ),
    getDocs(
      query(
        collection(getFirestoreInstance(), "users", uid, "pomodoroSessions"),
        where("completedAt", ">=", earliestEligibleFrom),
        orderBy("completedAt", "asc"),
      ),
    ),
  ])
  const sources = [
    ...xpSnapshot.docs
      .map((item) => ({
        kind: "xp" as const,
        id: item.id,
        occurredAt: (item.data() as XpTransactionDocument).createdAt,
        value: item.data() as XpTransactionDocument,
      }))
      .filter((item) => item.value.eventType !== "GOAL_COMPLETED"),
    ...pomodoroSnapshot.docs
      .map((item) => ({
        kind: "pomodoro" as const,
        id: item.id,
        occurredAt: (item.data() as PomodoroSessionDocument).completedAt,
        value: item.data() as PomodoroSessionDocument,
      }))
      .filter((item) => item.value.mode === "focus"),
  ].sort(
    (left, right) =>
      left.occurredAt.toMillis() - right.occurredAt.toMillis() ||
      left.id.localeCompare(right.id),
  )

  for (const source of sources) {
    if (source.kind === "xp") {
      await processXpTransactionWithProgress(
        uid,
        source.id,
        source.value,
        timezone,
        false,
        progressByCadence,
      )
    } else {
      await processPomodoroSessionWithProgress(
        uid,
        source.value,
        timezone,
        false,
        progressByCadence,
      )
    }
  }
}

export function reconcileGoals(uid: string, timezone: string) {
  const current = reconciliationByUser.get(uid)
  if (current) return current
  const reconciliation = reconcileUserGoals(uid, timezone).finally(() =>
    reconciliationByUser.delete(uid),
  )
  reconciliationByUser.set(uid, reconciliation)
  return reconciliation
}

export function subscribeToGoals(
  uid: string,
  onValue: (goals: GoalDocument[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getFirestoreInstance(), "users", uid, "goals"),
    (snapshot) => {
      onValue(snapshot.docs.map((item) => item.data() as GoalDocument))
    },
    onError,
  )
}

export function subscribeToGoalProgress(
  uid: string,
  onValue: (progress: GoalProgressDocument[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    collection(getFirestoreInstance(), "users", uid, "goalProgress"),
    (snapshot) => {
      onValue(snapshot.docs.map((item) => item.data() as GoalProgressDocument))
    },
    onError,
  )
}

export function subscribeToGoalStreak(
  uid: string,
  onValue: (streak: GoalStreakDocument | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getStreakReference(uid),
    (snapshot) => onValue(snapshot.exists() ? snapshot.data() : null),
    onError,
  )
}
