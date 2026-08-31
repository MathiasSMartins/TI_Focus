import { AlertTriangle } from "lucide-react"

import { Button } from "@/components/ui/button"

interface AuthErrorStateProps {
  message: string
  onRetry: () => void
  onLogout: () => void
}

export function AuthErrorState({
  message,
  onRetry,
  onLogout,
}: AuthErrorStateProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 text-center">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-red-500/10 text-red-400">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold">
          Não foi possível carregar seu perfil
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{message}</p>
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={onRetry}>Tentar novamente</Button>
          <Button variant="outline" onClick={onLogout}>
            Sair
          </Button>
        </div>
      </div>
    </main>
  )
}
