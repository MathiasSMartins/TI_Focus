import {
  Timestamp,
  collection,
  doc,
  getDocFromServer,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  type DocumentReference,
  type Firestore,
  type Unsubscribe,
} from "firebase/firestore"

import { runWithXpServerTime } from "@/features/gamification/services/xp-repository"
import { publishPomodoroCompleted } from "@/features/pomodoro/events/pomodoro-events"
import type {
  PomodoroCurrentDocument,
  PomodoroMode,
  PomodoroSessionDocument,
} from "@/features/pomodoro/types/pomodoro"
import { firestoreDb } from "@/services/firebase"

function getFirestoreInstance(): Firestore {
  if (!firestoreDb)
    throw new Error("Firebase não está configurado neste ambiente.")
  return firestoreDb
}

function getCurrentReference(uid: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "pomodoroState",
    "current",
  ) as DocumentReference<PomodoroCurrentDocument>
}

function getSessionReference(uid: string, sessionId: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
    "pomodoroSessions",
    sessionId,
  ) as DocumentReference<PomodoroSessionDocument>
}

export async function startPomodoroSession(
  uid: string,
  mode: PomodoroMode,
  plannedSeconds: number,
) {
  if (!Number.isInteger(plannedSeconds) || plannedSeconds <= 0) {
    throw new Error("A duração do Pomodoro deve ser positiva.")
  }
  const sessionId = doc(
    collection(getFirestoreInstance(), "users", uid, "pomodoroSessions"),
  ).id
  return runWithXpServerTime(uid, (serverNow) =>
    runTransaction(getFirestoreInstance(), async (transaction) => {
      const currentReference = getCurrentReference(uid)
      const currentSnapshot = await transaction.get(currentReference)
      if (currentSnapshot.exists())
        throw new Error("Já existe um timer em andamento.")
      const current: PomodoroCurrentDocument = {
        userId: uid,
        sessionId,
        mode,
        plannedSeconds,
        startedAt: serverNow,
        expectedEndAt: Timestamp.fromMillis(
          serverNow.toMillis() + plannedSeconds * 1_000,
        ),
      }
      transaction.set(currentReference, current)
      return sessionId
    }),
  )
}

export async function completePomodoroSession(uid: string) {
  const result = await runWithXpServerTime(uid, (serverNow) =>
    runTransaction(getFirestoreInstance(), async (transaction) => {
      const currentReference = getCurrentReference(uid)
      const currentSnapshot = await transaction.get(currentReference)
      if (!currentSnapshot.exists())
        throw new Error("Nenhum timer está em andamento.")
      const current = currentSnapshot.data()
      if (serverNow.toMillis() < current.expectedEndAt.toMillis()) {
        throw new Error("O tempo planejado ainda não terminou.")
      }
      const sessionReference = getSessionReference(uid, current.sessionId)
      const sessionSnapshot = await transaction.get(sessionReference)
      if (sessionSnapshot.exists()) {
        transaction.delete(currentReference)
        return { session: sessionSnapshot.data(), alreadyProcessed: true }
      }
      const session: PomodoroSessionDocument = {
        ...current,
        completedAt: serverNow,
      }
      transaction.set(sessionReference, {
        ...session,
        completedAt: serverTimestamp(),
      })
      transaction.delete(currentReference)
      return { session, alreadyProcessed: false }
    }),
  )

  publishPomodoroCompleted({
    type: "POMODORO_COMPLETED",
    version: 1,
    userId: uid,
    sessionId: result.session.sessionId,
    mode: result.session.mode,
    plannedSeconds: result.session.plannedSeconds,
    completedAt: result.session.completedAt.toDate(),
    alreadyProcessed: result.alreadyProcessed,
  })
  return result.session
}

export async function cancelPomodoroSession(uid: string) {
  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const reference = getCurrentReference(uid)
    const snapshot = await transaction.get(reference)
    if (snapshot.exists()) transaction.delete(reference)
  })
}

export async function getPomodoroSession(uid: string, sessionId: string) {
  const snapshot = await getDocFromServer(getSessionReference(uid, sessionId))
  return snapshot.exists() ? snapshot.data() : null
}

export function subscribeToCurrentPomodoro(
  uid: string,
  onValue: (current: PomodoroCurrentDocument | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getCurrentReference(uid),
    (snapshot) => {
      onValue(snapshot.exists() ? snapshot.data() : null)
    },
    onError,
  )
}
