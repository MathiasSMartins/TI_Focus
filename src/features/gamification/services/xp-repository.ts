import {
  collection,
  doc,
  getDocFromServer,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type DocumentReference,
  type Firestore,
  type Transaction,
  type Unsubscribe,
  type WithFieldValue,
} from "firebase/firestore"

import type { ITAreaId } from "@/config/it-area-config"
import {
  XP_DAILY_LIMIT,
  XP_WINDOW_DURATION_MS,
  getLevelForXp,
  getTaskXpReward,
} from "@/features/gamification/domain/xp-system"
import type {
  XpAwardResult,
  XpTransaction,
  XpTransactionDocument,
  GoalXpTransactionDocument,
} from "@/features/gamification/types/gamification"
import type { UserProfile } from "@/features/profile/types/user-profile"
import type { TaskPriority } from "@/features/tasks/types/task"
import { firestoreDb } from "@/services/firebase"

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

function getXpTransactionReference(uid: string, taskId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "xpTransactions",
    taskId,
  ) as DocumentReference<XpTransactionDocument>
}

interface XpClockDocument {
  syncedAt: Timestamp
}

const serverClockOffsets = new Map<string, number>()

function getXpClockReference(uid: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "gamificationMeta",
    "clock",
  ) as DocumentReference<XpClockDocument>
}

async function synchronizeXpServerTime(uid: string) {
  const reference = getXpClockReference(uid)
  const requestStartedAt = Date.now()
  await setDoc(reference, { syncedAt: serverTimestamp() })
  const snapshot = await getDocFromServer(reference)
  const responseReceivedAt = Date.now()
  const syncedAt = snapshot.data()?.syncedAt
  if (!(syncedAt instanceof Timestamp)) {
    throw new Error("Não foi possível sincronizar o relógio de XP.")
  }
  const clientMidpoint =
    requestStartedAt + (responseReceivedAt - requestStartedAt) / 2
  serverClockOffsets.set(uid, syncedAt.toMillis() - clientMidpoint)
  return syncedAt
}

export async function synchronizeServerClock(uid: string) {
  await synchronizeXpServerTime(uid)
  return getSynchronizedServerNow(uid)
}

export function getSynchronizedServerNow(uid: string) {
  const offset = serverClockOffsets.get(uid)
  return offset === undefined ? null : Date.now() + offset
}

function isPermissionDenied(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    String(error.code).endsWith("permission-denied")
  )
}

export async function runWithXpServerTime<T>(
  uid: string,
  operation: (serverNow: Timestamp) => Promise<T>,
) {
  let lastError: unknown
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const serverNow = await synchronizeXpServerTime(uid)
    try {
      return await operation(serverNow)
    } catch (error) {
      lastError = error
      if (attempt > 0 || !isPermissionDenied(error)) throw error
    }
  }
  throw lastError
}

interface PreparedXpAward {
  result: XpAwardResult
  profileReference: DocumentReference<UserProfile>
  transactionReference: DocumentReference<XpTransactionDocument>
  profileUpdates: Record<string, unknown> | null
  transactionDocument: WithFieldValue<XpTransactionDocument> | null
}

export async function prepareTaskXpAward(
  transaction: Transaction,
  uid: string,
  taskId: string,
  taskTitle: string,
  priority: TaskPriority,
  areaId: ITAreaId | null,
  serverNow: Timestamp,
): Promise<PreparedXpAward> {
  const profileReference = getProfileReference(uid)
  const transactionReference = getXpTransactionReference(uid, taskId)
  const profileSnapshot = await transaction.get(profileReference)
  const transactionSnapshot = await transaction.get(transactionReference)

  if (!profileSnapshot.exists()) {
    throw new Error("Perfil não encontrado para conceder XP.")
  }

  const profile = profileSnapshot.data()
  if (transactionSnapshot.exists()) {
    return {
      result: {
        transactionId: taskId,
        amount: 0,
        xpBefore: profile.xp,
        xpAfter: profile.xp,
        levelBefore: profile.level,
        levelAfter: profile.level,
        dailyLimitReached: false,
        alreadyProcessed: true,
      },
      profileReference,
      transactionReference,
      profileUpdates: null,
      transactionDocument: null,
    }
  }

  const reward = getTaskXpReward(priority)
  const windowStartedAt = profile.xpWindowStartedAt ?? null
  const windowExpired =
    !windowStartedAt ||
    serverNow.toMillis() - windowStartedAt.toMillis() >= XP_WINDOW_DURATION_MS
  const currentWindowAmount = windowExpired ? 0 : (profile.xpWindowAmount ?? 0)
  const dailyLimitReached = currentWindowAmount + reward > XP_DAILY_LIMIT
  const amount = dailyLimitReached ? 0 : reward
  const xpBefore = profile.xp
  const xpAfter = xpBefore + amount
  const levelBefore = getLevelForXp(xpBefore)
  const levelAfter = getLevelForXp(xpAfter)

  return {
    result: {
      transactionId: taskId,
      amount,
      xpBefore,
      xpAfter,
      levelBefore,
      levelAfter,
      dailyLimitReached,
      alreadyProcessed: false,
    },
    profileReference,
    transactionReference,
    profileUpdates:
      amount === 0
        ? null
        : {
            xp: xpAfter,
            level: levelAfter,
            lastXpTransactionId: taskId,
            xpWindowStartedAt: windowExpired
              ? serverTimestamp()
              : windowStartedAt,
            xpWindowAmount: currentWindowAmount + amount,
            updatedAt: serverTimestamp(),
          },
    transactionDocument: {
      userId: uid,
      amount,
      reason: dailyLimitReached
        ? "Limite diário de XP atingido"
        : "Conclusão de tarefa",
      eventType: "TASK_COMPLETED",
      taskId,
      taskTitle,
      areaId,
      createdAt: serverTimestamp(),
      xpBefore,
      xpAfter,
      levelBefore,
      levelAfter,
    },
  }
}

export interface PreparedGoalXpAward {
  result: XpAwardResult
  profileReference: DocumentReference<UserProfile>
  transactionReference: DocumentReference<XpTransactionDocument>
  profileUpdates: Record<string, unknown> | null
  transactionDocument: WithFieldValue<GoalXpTransactionDocument> | null
}

export async function prepareGoalXpAward(
  transaction: Transaction,
  uid: string,
  completionId: string,
  progressId: string,
  cadence: "daily" | "weekly" | "monthly",
  reward: number,
  serverNow: Timestamp,
): Promise<PreparedGoalXpAward> {
  const profileReference = getProfileReference(uid)
  const transactionReference = getXpTransactionReference(
    uid,
    `goal__${completionId}`,
  )
  const [profileSnapshot, transactionSnapshot] = await Promise.all([
    transaction.get(profileReference),
    transaction.get(transactionReference),
  ])
  if (!profileSnapshot.exists()) {
    throw new Error("Perfil não encontrado para conceder XP.")
  }
  const profile = profileSnapshot.data()
  if (transactionSnapshot.exists()) {
    return {
      result: {
        transactionId: `goal__${completionId}`,
        amount: 0,
        xpBefore: profile.xp,
        xpAfter: profile.xp,
        levelBefore: profile.level,
        levelAfter: profile.level,
        dailyLimitReached: false,
        alreadyProcessed: true,
      },
      profileReference,
      transactionReference,
      profileUpdates: null,
      transactionDocument: null,
    }
  }

  const windowStartedAt = profile.xpWindowStartedAt ?? null
  const windowExpired =
    !windowStartedAt ||
    serverNow.toMillis() - windowStartedAt.toMillis() >= XP_WINDOW_DURATION_MS
  const currentWindowAmount = windowExpired ? 0 : (profile.xpWindowAmount ?? 0)
  const dailyLimitReached = currentWindowAmount + reward > XP_DAILY_LIMIT
  const amount = dailyLimitReached ? 0 : reward
  const xpBefore = profile.xp
  const xpAfter = xpBefore + amount
  const levelBefore = getLevelForXp(xpBefore)
  const levelAfter = getLevelForXp(xpAfter)
  const transactionId = `goal__${completionId}`

  return {
    result: {
      transactionId,
      amount,
      xpBefore,
      xpAfter,
      levelBefore,
      levelAfter,
      dailyLimitReached,
      alreadyProcessed: false,
    },
    profileReference,
    transactionReference,
    profileUpdates:
      amount === 0
        ? null
        : {
            xp: xpAfter,
            level: levelAfter,
            lastXpTransactionId: transactionId,
            xpWindowStartedAt: windowExpired
              ? serverTimestamp()
              : windowStartedAt,
            xpWindowAmount: currentWindowAmount + amount,
            updatedAt: serverTimestamp(),
          },
    transactionDocument: {
      userId: uid,
      amount,
      reason: dailyLimitReached
        ? "Limite diário de XP atingido"
        : "Meta concluída",
      eventType: "GOAL_COMPLETED",
      progressId,
      cadence,
      createdAt: serverTimestamp(),
      xpBefore,
      xpAfter,
      levelBefore,
      levelAfter,
    },
  }
}

export function applyPreparedGoalXpAward(
  transaction: Transaction,
  award: PreparedGoalXpAward,
) {
  if (!award.transactionDocument) return
  transaction.set(award.transactionReference, award.transactionDocument)
  if (award.profileUpdates) {
    transaction.update(award.profileReference, award.profileUpdates)
  }
}

export function applyPreparedXpAward(
  transaction: Transaction,
  award: PreparedXpAward,
) {
  if (!award.transactionDocument) return
  transaction.set(award.transactionReference, award.transactionDocument)
  if (award.profileUpdates) {
    transaction.update(award.profileReference, award.profileUpdates)
  }
}

export function subscribeToXpTransactions(
  uid: string,
  onValue: (transactions: XpTransaction[]) => void,
  onError: (error: Error) => void,
  maximum = 20,
): Unsubscribe {
  const transactionQuery = query(
    collection(getFirestoreInstance(), "users", uid, "xpTransactions"),
    orderBy("createdAt", "desc"),
    limit(maximum),
  )

  return onSnapshot(
    transactionQuery,
    (snapshot) =>
      onValue(
        snapshot.docs.map((transactionSnapshot) => ({
          id: transactionSnapshot.id,
          ...(transactionSnapshot.data() as XpTransactionDocument),
        })),
      ),
    onError,
  )
}

export function subscribeToAllXpTransactions(
  uid: string,
  onValue: (transactions: XpTransaction[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const transactionQuery = query(
    collection(getFirestoreInstance(), "users", uid, "xpTransactions"),
    orderBy("createdAt", "asc"),
  )
  return onSnapshot(
    transactionQuery,
    (snapshot) =>
      onValue(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as XpTransactionDocument),
        })),
      ),
    onError,
  )
}

export function subscribeToXpTransactionsSince(
  uid: string,
  since: Timestamp,
  onValue: (transactions: XpTransaction[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const transactionQuery = query(
    collection(getFirestoreInstance(), "users", uid, "xpTransactions"),
    where("createdAt", ">=", since),
    orderBy("createdAt", "asc"),
  )
  return onSnapshot(
    transactionQuery,
    (snapshot) =>
      onValue(
        snapshot.docs.map((item) => ({
          id: item.id,
          ...(item.data() as XpTransactionDocument),
        })),
      ),
    onError,
  )
}
