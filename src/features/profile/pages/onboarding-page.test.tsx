import { Timestamp } from "firebase/firestore"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { AuthContext } from "@/features/auth/context/auth-context"
import type { AuthContextValue } from "@/features/auth/types/auth"
import { OnboardingPage } from "@/features/profile/pages/onboarding-page"
import {
  DEFAULT_USER_SETTINGS,
  type UserProfile,
} from "@/features/profile/types/user-profile"

const profile: UserProfile = {
  uid: "user-1",
  name: "Mathias",
  email: "user@example.com",
  avatar: null,
  primaryArea: null,
  secondaryAreas: [],
  primaryObjective: null,
  dailyTaskGoal: null,
  level: 1,
  xp: 0,
  streak: 0,
  settings: DEFAULT_USER_SETTINGS,
  onboardingCompleted: false,
  createdAt: Timestamp.fromMillis(0),
  updatedAt: Timestamp.fromMillis(0),
}

function createAuthValue(): AuthContextValue {
  return {
    user: { uid: "user-1", photoURL: null } as AuthContextValue["user"],
    profile,
    isInitializing: false,
    isSubmitting: false,
    isGoogleLoginEnabled: true,
    error: null,
    login: vi.fn(),
    register: vi.fn(),
    loginWithGoogle: vi.fn(),
    resetPassword: vi.fn(),
    logout: vi.fn(),
    completeOnboarding: vi.fn().mockResolvedValue(true),
    reloadProfile: vi.fn(),
    clearError: vi.fn(),
  }
}

function renderOnboarding(value: AuthContextValue) {
  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
          <Route path="/dashboard" element={<p>Dashboard carregado</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe("OnboardingPage", () => {
  it("percorre as cinco etapas, salva uma vez e encaminha ao dashboard", async () => {
    const user = userEvent.setup()
    const value = createAuthValue()
    renderOnboarding(value)

    await user.click(
      screen.getByRole("button", { name: "Selecionar avatar Esmeralda" }),
    )
    await user.click(screen.getByRole("button", { name: /Continuar/ }))

    await user.click(
      screen.getByRole("button", { name: "Desenvolvimento de Software" }),
    )
    await user.click(screen.getByRole("button", { name: /Continuar/ }))

    await user.click(screen.getByRole("checkbox", { name: "Cloud" }))
    expect(value.completeOnboarding).not.toHaveBeenCalled()
    await user.click(screen.getByRole("button", { name: /Continuar/ }))

    await user.click(
      screen.getByRole("button", { name: "Organizar meu trabalho" }),
    )
    await user.click(screen.getByRole("button", { name: /Continuar/ }))

    await user.click(screen.getByRole("button", { name: /8 tarefas por dia/ }))
    await user.click(
      screen.getByRole("button", { name: /Concluir e ir ao Dashboard/ }),
    )

    expect(value.completeOnboarding).toHaveBeenCalledTimes(1)
    expect(value.completeOnboarding).toHaveBeenCalledWith({
      name: "Mathias",
      avatar: "preset:emerald",
      primaryArea: "software-development",
      secondaryAreas: ["cloud"],
      primaryObjective: "organize-work",
      dailyTaskGoal: 8,
      timezone: DEFAULT_USER_SETTINGS.timezone,
    })
    expect(await screen.findByText("Dashboard carregado")).toBeInTheDocument()
  })

  it("valida a etapa atual antes de avançar", async () => {
    const user = userEvent.setup()
    const value = createAuthValue()
    renderOnboarding(value)

    await user.clear(screen.getByLabelText("Seu nome"))
    await user.click(screen.getByRole("button", { name: /Continuar/ }))

    expect(
      screen.getByText("Informe seu nome com pelo menos 2 caracteres."),
    ).toBeInTheDocument()
    expect(screen.getByText("Seu perfil")).toBeInTheDocument()
    expect(value.completeOnboarding).not.toHaveBeenCalled()
  })
})
