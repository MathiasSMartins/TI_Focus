import { LoaderCircle, ShieldCheck } from "lucide-react"

export function AuthLoadingScreen() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-primary/15 text-primary">
        <ShieldCheck className="size-6" aria-hidden="true" />
      </span>
      <div>
        <p className="font-semibold">Preparando seu workspace</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Carregando sua sessão e preferências...
        </p>
      </div>
      <LoaderCircle
        className="size-5 animate-spin text-primary"
        aria-hidden="true"
      />
      <span className="sr-only" role="status">
        Carregando autenticação
      </span>
    </main>
  )
}
