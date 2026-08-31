import { ArrowLeft, SearchX } from "lucide-react"
import { Link } from "react-router-dom"

import { Button } from "@/components/ui/button"

export function NotFoundPage() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <SearchX className="size-7" aria-hidden="true" />
      </span>
      <p className="mt-6 text-sm font-medium text-primary">Erro 404</p>
      <h2 className="mt-2 text-2xl font-bold">Página não encontrada</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        O endereço acessado não faz parte do workspace atual.
      </p>
      <Button asChild className="mt-6">
        <Link to="/dashboard">
          <ArrowLeft /> Voltar ao dashboard
        </Link>
      </Button>
    </div>
  )
}
