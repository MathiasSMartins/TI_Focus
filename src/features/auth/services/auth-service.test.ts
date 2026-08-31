import { FirebaseError } from "firebase/app"
import type { User } from "firebase/auth"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  setCustomParameters: vi.fn(),
  ensureUserProfile: vi.fn(),
}))

vi.mock("firebase/auth", () => ({
  GoogleAuthProvider: class {
    setCustomParameters = mocks.setCustomParameters
  },
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
  updateProfile: mocks.updateProfile,
  signInWithPopup: mocks.signInWithPopup,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  signOut: mocks.signOut,
  onAuthStateChanged: mocks.onAuthStateChanged,
}))

vi.mock("@/features/profile/services/user-profile-repository", () => ({
  ensureUserProfile: mocks.ensureUserProfile,
}))

vi.mock("@/services/firebase", () => ({
  firebaseAuth: { name: "test-auth" },
}))

import {
  loginWithEmail,
  loginWithGoogle,
  logoutUser,
  registerWithEmail,
  requestPasswordReset,
} from "@/features/auth/services/auth-service"

const user = {
  uid: "user-1",
  email: "user@example.com",
  displayName: null,
  photoURL: null,
} as User

beforeEach(() => {
  vi.clearAllMocks()
  mocks.ensureUserProfile.mockResolvedValue(null)
})

describe("auth-service", () => {
  it("faz login por e-mail e deixa o bootstrap do perfil para o observer", async () => {
    mocks.signInWithEmailAndPassword.mockResolvedValue({ user })

    await expect(loginWithEmail(" user@example.com ", "secret")).resolves.toBe(
      user,
    )
    expect(mocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
      { name: "test-auth" },
      "user@example.com",
      "secret",
    )
    expect(mocks.ensureUserProfile).not.toHaveBeenCalled()
  })

  it("cadastra, atualiza o nome e reconcilia o perfil de forma atômica", async () => {
    mocks.createUserWithEmailAndPassword.mockResolvedValue({ user })
    mocks.updateProfile.mockResolvedValue(undefined)

    await registerWithEmail(" Mathias ", " user@example.com ", "secret")

    expect(mocks.updateProfile).toHaveBeenCalledWith(user, {
      displayName: "Mathias",
    })
    expect(mocks.ensureUserProfile).toHaveBeenCalledWith(user, "Mathias")
  })

  it("faz login com Google e deixa o bootstrap do perfil para o observer", async () => {
    mocks.signInWithPopup.mockResolvedValue({ user })

    await loginWithGoogle()

    expect(mocks.setCustomParameters).toHaveBeenCalledWith({
      prompt: "select_account",
    })
    expect(mocks.ensureUserProfile).not.toHaveBeenCalled()
  })

  it("envia recuperação de senha com e-mail normalizado", async () => {
    await requestPasswordReset(" user@example.com ")
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
      { name: "test-auth" },
      "user@example.com",
    )
  })

  it("mantém resposta neutra quando o e-mail não existe", async () => {
    mocks.sendPasswordResetEmail.mockRejectedValue(
      new FirebaseError("auth/user-not-found", "missing user"),
    )

    await expect(
      requestPasswordReset("missing@example.com"),
    ).resolves.toBeUndefined()
  })

  it("encerra a sessão no Firebase", async () => {
    await logoutUser()
    expect(mocks.signOut).toHaveBeenCalledWith({ name: "test-auth" })
  })
})
