import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { describe, expect, it, vi } from "vitest"

import { AuthContext } from "@/features/auth/context/auth-context"
import { ForgotPasswordPage } from "@/features/auth/pages/forgot-password-page"
import { LoginPage } from "@/features/auth/pages/login-page"
import { RegisterPage } from "@/features/auth/pages/register-page"
import type { AuthContextValue } from "@/features/auth/types/auth"

function createAuthValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  return {
    user: null,
    profile: null,
    isInitializing: false,
    isSubmitting: false,
    isGoogleLoginEnabled: true,
    error: null,
    login: vi.fn().mockResolvedValue(true),
    register: vi.fn().mockResolvedValue(true),
    loginWithGoogle: vi.fn().mockResolvedValue(true),
    resetPassword: vi.fn().mockResolvedValue(true),
    logout: vi.fn().mockResolvedValue(undefined),
    completeOnboarding: vi.fn().mockResolvedValue(true),
    reloadProfile: vi.fn().mockResolvedValue(undefined),
    clearError: vi.fn(),
    ...overrides,
  }
}

function renderWithAuth(component: React.ReactNode, value: AuthContextValue) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter>{component}</MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe("auth pages", () => {
  it("envia e-mail e senha pelo formulário de login", async () => {
    const user = userEvent.setup()
    const value = createAuthValue()
    renderWithAuth(<LoginPage />, value)

    await user.type(screen.getByLabelText("E-mail"), "user@example.com")
    await user.type(screen.getByLabelText("Senha"), "secret")
    await user.click(screen.getByRole("button", { name: "Entrar" }))

    expect(value.login).toHaveBeenCalledWith("user@example.com", "secret")
  })

  it("executa o login com Google quando habilitado", async () => {
    const user = userEvent.setup()
    const value = createAuthValue()
    renderWithAuth(<LoginPage />, value)

    await user.click(screen.getByRole("button", { name: "Google" }))
    expect(value.loginWithGoogle).toHaveBeenCalledOnce()
  })

  it("bloqueia cadastro quando as senhas são diferentes", async () => {
    const user = userEvent.setup()
    const value = createAuthValue()
    renderWithAuth(<RegisterPage />, value)

    await user.type(screen.getByLabelText("Nome"), "Mathias")
    await user.type(screen.getByLabelText("E-mail"), "user@example.com")
    await user.type(screen.getByLabelText("Senha"), "secret1")
    await user.type(screen.getByLabelText("Confirmar senha"), "secret2")
    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(screen.getByRole("alert")).toHaveTextContent(
      "As senhas informadas não coincidem.",
    )
    expect(value.register).not.toHaveBeenCalled()
  })

  it("envia recuperação e retorna ao login com feedback neutro", async () => {
    const user = userEvent.setup()
    const value = createAuthValue()

    render(
      <AuthContext.Provider value={value}>
        <MemoryRouter initialEntries={["/recuperar-senha"]}>
          <Routes>
            <Route path="/recuperar-senha" element={<ForgotPasswordPage />} />
            <Route path="/login" element={<LoginPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    await user.type(screen.getByLabelText("E-mail"), "user@example.com")
    await user.click(screen.getByRole("button", { name: "Enviar instruções" }))

    expect(value.resetPassword).toHaveBeenCalledWith("user@example.com")
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Enviamos as instruções de recuperação",
    )
  })

  it("exibe erros retornados pelo provider", () => {
    const value = createAuthValue({ error: "E-mail ou senha inválidos." })
    renderWithAuth(<LoginPage />, value)

    expect(screen.getByRole("alert")).toHaveTextContent(
      "E-mail ou senha inválidos.",
    )
  })
})
