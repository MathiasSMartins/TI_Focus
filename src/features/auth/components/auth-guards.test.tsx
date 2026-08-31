import type { User } from "firebase/auth"
import { render, screen } from "@testing-library/react"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  GuestOnlyRoute,
  RequireAuthRoute,
  RequireOnboardingRoute,
} from "@/features/auth/components/auth-guards"
import type { AuthContextValue } from "@/features/auth/types/auth"
import type { UserProfile } from "@/features/profile/types/user-profile"

let authState: AuthContextValue

vi.mock("@/features/auth/hooks/use-auth", () => ({
  useAuth: () => authState,
}))

const actions = {
  login: vi.fn(),
  register: vi.fn(),
  loginWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
  logout: vi.fn(),
  completeOnboarding: vi.fn(),
  reloadProfile: vi.fn(),
  clearError: vi.fn(),
}

const user = { uid: "user-1" } as User
const completeProfile = { onboardingCompleted: true } as UserProfile
const incompleteProfile = { onboardingCompleted: false } as UserProfile

function createState(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user: null,
    profile: null,
    isInitializing: false,
    isSubmitting: false,
    isGoogleLoginEnabled: true,
    error: null,
    ...actions,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  authState = createState()
})

describe("auth guards", () => {
  it("mantém a tela de loading enquanto a sessão inicializa", () => {
    authState = createState({ isInitializing: true })

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<RequireAuthRoute />}>
            <Route path="/dashboard" element={<p>Dashboard privado</p>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole("status")).toHaveTextContent(
      "Carregando autenticação",
    )
    expect(screen.queryByText("Dashboard privado")).not.toBeInTheDocument()
  })

  it("redireciona visitante para o login", () => {
    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<RequireAuthRoute />}>
            <Route path="/dashboard" element={<p>Dashboard privado</p>} />
          </Route>
          <Route path="/login" element={<p>Página de login</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Página de login")).toBeInTheDocument()
  })

  it("envia usuário sem onboarding para a configuração inicial", () => {
    authState = createState({ user, profile: incompleteProfile })

    render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<RequireOnboardingRoute />}>
            <Route path="/dashboard" element={<p>Dashboard privado</p>} />
          </Route>
          <Route path="/onboarding" element={<p>Onboarding</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Onboarding")).toBeInTheDocument()
  })

  it("redireciona usuário autenticado para o dashboard fora do login", () => {
    authState = createState({ user, profile: completeProfile })

    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route element={<GuestOnlyRoute />}>
            <Route path="/login" element={<p>Página de login</p>} />
          </Route>
          <Route path="/dashboard" element={<p>Dashboard privado</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText("Dashboard privado")).toBeInTheDocument()
  })
})
