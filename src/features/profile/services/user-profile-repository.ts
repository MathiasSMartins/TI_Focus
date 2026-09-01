import type { User } from "firebase/auth"
import {
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type DocumentReference,
  type Firestore,
  type Unsubscribe,
  type WithFieldValue,
} from "firebase/firestore"

import {
  DEFAULT_USER_SETTINGS,
  type ITAreaId,
  type PrimaryObjectiveId,
  type UserProfile,
} from "@/features/profile/types/user-profile"
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

export async function getUserProfile(uid: string) {
  const snapshot = await getDoc(getProfileReference(uid))
  return snapshot.exists() ? snapshot.data() : null
}

export async function ensureUserProfile(user: User, preferredName?: string) {
  const database = getFirestoreInstance()
  const reference = getProfileReference(user.uid)
  const normalizedPreferredName = preferredName?.trim()

  await runTransaction(database, async (transaction) => {
    const snapshot = await transaction.get(reference)

    if (!snapshot.exists()) {
      const profile: WithFieldValue<UserProfile> = {
        uid: user.uid,
        name:
          normalizedPreferredName ||
          user.displayName?.trim() ||
          "Profissional de TI",
        email: user.email ?? "",
        avatar: user.photoURL,
        primaryArea: null,
        secondaryAreas: [],
        primaryObjective: null,
        dailyTaskGoal: null,
        level: 1,
        xp: 0,
        lastXpTransactionId: null,
        xpWindowStartedAt: null,
        xpWindowAmount: 0,
        streak: 0,
        settings: DEFAULT_USER_SETTINGS,
        onboardingCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }

      transaction.set(reference, profile)
      return
    }

    const currentProfile = snapshot.data()
    const updates: Partial<WithFieldValue<UserProfile>> = {}

    if (
      normalizedPreferredName &&
      !currentProfile.onboardingCompleted &&
      currentProfile.name !== normalizedPreferredName
    ) {
      updates.name = normalizedPreferredName
    }
    if (
      !Object.prototype.hasOwnProperty.call(currentProfile, "primaryObjective")
    ) {
      updates.primaryObjective = null
    }
    if (
      !Object.prototype.hasOwnProperty.call(currentProfile, "dailyTaskGoal")
    ) {
      updates.dailyTaskGoal = null
    }
    if (
      !Object.prototype.hasOwnProperty.call(
        currentProfile,
        "lastXpTransactionId",
      )
    ) {
      updates.lastXpTransactionId = null
    }
    if (
      !Object.prototype.hasOwnProperty.call(currentProfile, "xpWindowStartedAt")
    ) {
      updates.xpWindowStartedAt = null
    }
    if (
      !Object.prototype.hasOwnProperty.call(currentProfile, "xpWindowAmount")
    ) {
      updates.xpWindowAmount = 0
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = serverTimestamp()
      transaction.update(reference, updates)
    }
  })

  return getUserProfile(user.uid)
}

export function subscribeToUserProfile(
  uid: string,
  onValue: (profile: UserProfile | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    getProfileReference(uid),
    (snapshot) => onValue(snapshot.exists() ? snapshot.data() : null),
    onError,
  )
}

interface CompleteOnboardingInput {
  uid: string
  name: string
  avatar: string | null
  primaryArea: ITAreaId
  secondaryAreas: ITAreaId[]
  primaryObjective: PrimaryObjectiveId
  timezone: string
  currentSettings: UserProfile["settings"]
}

export async function completeUserOnboarding({
  uid,
  name,
  avatar,
  primaryArea,
  secondaryAreas,
  primaryObjective,
  timezone,
  currentSettings,
}: CompleteOnboardingInput) {
  await updateDoc(getProfileReference(uid), {
    name: name.trim(),
    avatar,
    primaryArea,
    secondaryAreas,
    primaryObjective,
    onboardingCompleted: true,
    settings: {
      ...currentSettings,
      timezone,
    },
    updatedAt: serverTimestamp(),
  })
}
