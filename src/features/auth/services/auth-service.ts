import { FirebaseError } from "firebase/app"
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth"

import { ensureUserProfile } from "@/features/profile/services/user-profile-repository"
import { firebaseAuth } from "@/services/firebase"

function getAuthInstance() {
  if (!firebaseAuth) {
    throw new Error(
      "Firebase não está configurado. Preencha as variáveis VITE_FIREBASE_*.",
    )
  }

  return firebaseAuth
}

export function observeAuthState(observer: (user: User | null) => void) {
  if (!firebaseAuth) {
    observer(null)
    return () => undefined
  }

  return onAuthStateChanged(firebaseAuth, observer)
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(
    getAuthInstance(),
    email.trim(),
    password,
  )
  return credential.user
}

export async function registerWithEmail(
  name: string,
  email: string,
  password: string,
) {
  const credential = await createUserWithEmailAndPassword(
    getAuthInstance(),
    email.trim(),
    password,
  )
  const normalizedName = name.trim()
  await updateProfile(credential.user, { displayName: normalizedName })
  await ensureUserProfile(credential.user, normalizedName)
  return credential.user
}

export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: "select_account" })
  const credential = await signInWithPopup(getAuthInstance(), provider)
  return credential.user
}

export async function requestPasswordReset(email: string) {
  try {
    await sendPasswordResetEmail(getAuthInstance(), email.trim())
  } catch (error) {
    if (
      error instanceof FirebaseError &&
      error.code === "auth/user-not-found"
    ) {
      return
    }
    throw error
  }
}

export async function logoutUser() {
  await signOut(getAuthInstance())
}
