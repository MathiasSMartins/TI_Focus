import type { User } from "firebase/auth"
import { act, render, screen, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  observeAuthState: vi.fn(),
  ensureUserProfile: vi.fn(),
  subscribeToUserProfile: vi.fn(),
  getUserProfile: vi.fn(),
  completeUserOnboarding: vi.fn(),
}))

vi.mock("@/features/auth/services/auth-service", () => ({
  observeAuthState: mocks.observeAuthState,
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  requestPasswordReset: vi.fn(),
  logoutUser: vi.fn(),
}))

vi.mock("@/features/profile/services/user-profile-repository", () => ({
  ensureUserProfile: mocks.ensureUserProfile,
  subscribeToUserProfile: mocks.subscribeToUserProfile,
  getUserProfile: mocks.getUserProfile,
  completeUserOnboarding: mocks.completeUserOnboarding,
}))

vi.mock("@/services/firebase", () => ({
  isGoogleAuthEnabled: false,
}))

import { useAuth } from "@/features/auth/hooks/use-auth"
import { AuthProvider } from "@/features/auth/providers/auth-provider"

function createDeferred() {
  let resolve!: () => void
  const promise = new Promise<void>((resolver) => {
    resolve = resolver
  })
  return { promise, resolve }
}

function SessionProbe() {
  const { user, isInitializing } = useAuth()
  return (
    <p>
      {isInitializing ? "loading" : "ready"}:{user?.uid ?? "none"}
    </p>
  )
}

describe("AuthProvider", () => {
  it("descarta bootstrap obsoleto quando a sessão termina", async () => {
    const deferred = createDeferred()
    let authObserver: ((user: User | null) => void) | undefined

    mocks.observeAuthState.mockImplementation(
      (observer: (user: User | null) => void) => {
        authObserver = observer
        return vi.fn()
      },
    )
    mocks.ensureUserProfile.mockReturnValue(deferred.promise)
    mocks.subscribeToUserProfile.mockReturnValue(vi.fn())

    render(
      <AuthProvider>
        <SessionProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(authObserver).toBeDefined())
    act(() => authObserver?.({ uid: "user-a" } as User))
    act(() => authObserver?.(null))
    await act(async () => deferred.resolve())

    expect(screen.getByText("ready:none")).toBeInTheDocument()
    expect(mocks.subscribeToUserProfile).not.toHaveBeenCalled()
  })
})
