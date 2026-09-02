import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
  writeBatch,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type Unsubscribe,
  type WithFieldValue,
} from "firebase/firestore"

import type {
  AppNotification,
  CreateNotificationInput,
  NotificationDocument,
} from "@/features/notifications/types/notification"
import { firestoreDb } from "@/services/firebase"

const READ_BATCH_LIMIT = 400
const BROWSER_BURST_WINDOW_MS = 5 * 60_000
const BROWSER_PENDING_WINDOW_MS = 10 * 60_000
const BROWSER_BURST_LIMIT = 3

interface BrowserRateState {
  windowStartedAt: Timestamp
  count: number
}

function getFirestoreInstance(): Firestore {
  if (!firestoreDb) {
    throw new Error("Firebase não está configurado neste ambiente.")
  }
  return firestoreDb
}

function getNotificationCollection(uid: string) {
  return collection(
    getFirestoreInstance(),
    "users",
    uid,
    "notifications",
  ) as CollectionReference<NotificationDocument>
}

function getNotificationReference(uid: string, notificationId: string) {
  return doc(
    getNotificationCollection(uid),
    notificationId,
  ) as DocumentReference<NotificationDocument>
}

function getBrowserRateStateReference(uid: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "notificationState",
    "browserRate",
  ) as DocumentReference<BrowserRateState>
}

export async function ensureNotification(
  uid: string,
  input: CreateNotificationInput,
  showInApp: boolean,
  showBrowser: boolean,
) {
  return runTransaction(getFirestoreInstance(), async (transaction) => {
    const reference = getNotificationReference(uid, input.id)
    const snapshot = await transaction.get(reference)
    if (snapshot.exists()) return false

    const notification: WithFieldValue<NotificationDocument> = {
      type: input.type,
      title: input.title.trim().slice(0, 120),
      body: input.body.trim().slice(0, 320),
      href: input.href,
      sourceId: input.sourceId,
      showInApp,
      showBrowser,
      occurredAt: Timestamp.fromDate(input.occurredAt),
      createdAt: serverTimestamp(),
      readAt: null,
      browserDeliveredAt: null,
    }
    transaction.set(reference, notification)
    return true
  })
}

export function subscribeToNotifications(
  uid: string,
  onValue: (notifications: AppNotification[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const historyQuery = query(
    getNotificationCollection(uid),
    orderBy("createdAt", "desc"),
  )
  return onSnapshot(
    historyQuery,
    (snapshot) =>
      onValue(
        snapshot.docs.flatMap((item) => {
          const data = item.data()
          return data.showInApp ? [{ id: item.id, ...data }] : []
        }),
      ),
    onError,
  )
}

export async function markNotificationAsRead(
  uid: string,
  notificationId: string,
) {
  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const reference = getNotificationReference(uid, notificationId)
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists() || snapshot.data().readAt) return
    transaction.update(reference, { readAt: serverTimestamp() })
  })
}

export async function markAllNotificationsAsRead(uid: string) {
  let hasMore = true
  while (hasMore) {
    const unreadSnapshot = await getDocs(
      query(
        getNotificationCollection(uid),
        where("readAt", "==", null),
        limit(READ_BATCH_LIMIT),
      ),
    )
    hasMore = unreadSnapshot.size === READ_BATCH_LIMIT
    if (unreadSnapshot.empty) return
    const batch = writeBatch(getFirestoreInstance())
    for (const item of unreadSnapshot.docs) {
      batch.update(item.ref, { readAt: serverTimestamp() })
    }
    await batch.commit()
  }
}

export async function getPendingBrowserNotifications(
  uid: string,
  synchronizedNow: number,
) {
  const snapshot = await getDocs(
    query(
      getNotificationCollection(uid),
      where("browserDeliveredAt", "==", null),
    ),
  )
  return snapshot.docs.flatMap((item) => {
    const data = item.data()
    const age = synchronizedNow - data.createdAt.toMillis()
    if (!data.showBrowser || age < 0 || age > BROWSER_PENDING_WINDOW_MS) {
      return []
    }
    return [
      {
        id: item.id,
        type: data.type,
        title: data.title,
        body: data.body,
        href: data.href,
        sourceId: data.sourceId,
        occurredAt: data.occurredAt.toDate(),
      } satisfies CreateNotificationInput,
    ]
  })
}

export async function claimBrowserDelivery(
  uid: string,
  notificationId: string,
  synchronizedNow: number,
) {
  return runTransaction(getFirestoreInstance(), async (transaction) => {
    const notificationReference = getNotificationReference(uid, notificationId)
    const stateReference = getBrowserRateStateReference(uid)
    const [notificationSnapshot, stateSnapshot] = await Promise.all([
      transaction.get(notificationReference),
      transaction.get(stateReference),
    ])
    if (
      !notificationSnapshot.exists() ||
      notificationSnapshot.data().browserDeliveredAt
    ) {
      return false
    }

    const state = stateSnapshot.data()
    const activeWindow =
      state !== undefined &&
      synchronizedNow - state.windowStartedAt.toMillis() <
        BROWSER_BURST_WINDOW_MS
    if (activeWindow && state.count >= BROWSER_BURST_LIMIT) return false

    transaction.set(stateReference, {
      windowStartedAt: activeWindow ? state.windowStartedAt : serverTimestamp(),
      count: activeWindow ? state.count + 1 : 1,
    })
    transaction.update(notificationReference, {
      browserDeliveredAt: serverTimestamp(),
    })
    return true
  })
}

export async function releaseBrowserDelivery(
  uid: string,
  notificationId: string,
) {
  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const notificationReference = getNotificationReference(uid, notificationId)
    const stateReference = getBrowserRateStateReference(uid)
    const [notificationSnapshot, stateSnapshot] = await Promise.all([
      transaction.get(notificationReference),
      transaction.get(stateReference),
    ])
    if (
      !notificationSnapshot.exists() ||
      !notificationSnapshot.data().browserDeliveredAt
    ) {
      return
    }
    transaction.update(notificationReference, { browserDeliveredAt: null })
    if (stateSnapshot.exists() && stateSnapshot.data().count > 0) {
      transaction.update(stateReference, {
        count: stateSnapshot.data().count - 1,
      })
    }
  })
}
