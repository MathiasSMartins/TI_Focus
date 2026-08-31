import { FirebaseError } from "firebase/app"
import { describe, expect, it } from "vitest"

import { getAuthErrorMessage } from "@/features/auth/services/auth-errors"

describe("getAuthErrorMessage", () => {
  it("traduz erros conhecidos do Firebase", () => {
    expect(
      getAuthErrorMessage(
        new FirebaseError("auth/invalid-credential", "invalid credential"),
      ),
    ).toBe("E-mail ou senha inválidos.")
  })

  it("preserva mensagens de erros locais de configuração", () => {
    expect(getAuthErrorMessage(new Error("Firebase indisponível"))).toBe(
      "Firebase indisponível",
    )
  })

  it("retorna uma mensagem segura para valores desconhecidos", () => {
    expect(getAuthErrorMessage(null)).toBe(
      "Ocorreu um erro inesperado. Tente novamente.",
    )
  })
})
