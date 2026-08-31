import { FirebaseError } from "firebase/app"

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "Este e-mail já está associado a uma conta.",
  "auth/invalid-credential": "E-mail ou senha inválidos.",
  "auth/invalid-email": "Informe um endereço de e-mail válido.",
  "auth/missing-password": "Informe sua senha.",
  "auth/weak-password": "A senha deve ter pelo menos 6 caracteres.",
  "auth/user-disabled": "Esta conta foi desativada.",
  "auth/too-many-requests":
    "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "auth/network-request-failed":
    "Não foi possível conectar. Verifique sua internet.",
  "auth/popup-blocked": "O navegador bloqueou a janela de login do Google.",
  "auth/popup-closed-by-user": "O login com Google foi cancelado.",
  "auth/cancelled-popup-request": "O login com Google foi cancelado.",
  "auth/operation-not-allowed":
    "Este método de login não está habilitado no Firebase.",
  "auth/unauthorized-domain": "Este domínio não está autorizado no Firebase.",
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof FirebaseError) {
    return (
      AUTH_ERROR_MESSAGES[error.code] ??
      "Não foi possível concluir a autenticação. Tente novamente."
    )
  }

  if (error instanceof Error) {
    return error.message
  }

  return "Ocorreu um erro inesperado. Tente novamente."
}
