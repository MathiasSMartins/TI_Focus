import { ShieldCheck } from "lucide-react"
import { Link, Outlet } from "react-router-dom"

export function AuthLayout() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_38%)]" />
      <div className="relative w-full max-w-md">
        <Link
          to="/login"
          className="mx-auto mb-8 flex w-fit items-center gap-3"
        >
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <ShieldCheck className="size-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-lg font-bold tracking-tight">
              TI Focus
            </span>
            <span className="block text-xs text-muted-foreground">
              Produtividade em evolução
            </span>
          </span>
        </Link>
        <Outlet />
      </div>
    </main>
  )
}
