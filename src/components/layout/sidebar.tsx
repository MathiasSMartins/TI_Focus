import {
  CheckSquare2,
  FolderKanban,
  LayoutDashboard,
  Medal,
  Settings,
  Target,
  Timer,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react"
import { NavLink } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import { XpProgress } from "@/features/gamification"
import type { NavigationItem } from "@/types/navigation"
import { cn } from "@/utils/cn"

const navigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tarefas", href: "/tasks", icon: CheckSquare2 },
  { label: "Metas", href: "/goals", icon: Target },
  { label: "Pomodoro", href: "/pomodoro", icon: Timer },
  { label: "Projetos", href: "/projects", icon: FolderKanban },
  { label: "Conquistas", href: "/achievements", icon: Medal },
  { label: "Perfil", href: "/profile", icon: UserRound },
  { label: "Configurações", href: "/settings", icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile } = useAuth()
  const xp = profile?.xp ?? 0

  return (
    <>
      {open && (
        <button
          type="button"
          aria-label="Fechar navegação"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-card/95 px-4 py-5 backdrop-blur-xl transition-transform duration-200 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-11 items-center justify-between px-2">
          <NavLink
            to="/dashboard"
            className="flex items-center gap-3"
            onClick={onClose}
          >
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
              <ShieldCheck className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-base font-bold tracking-tight">
                TI Focus
              </span>
              <span className="block text-xs text-muted-foreground">
                Produtividade em evolução
              </span>
            </span>
          </NavLink>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Fechar menu"
            onClick={onClose}
          >
            <X />
          </Button>
        </div>

        <nav
          className="mt-8 flex flex-1 flex-col gap-1"
          aria-label="Navegação principal"
        >
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </p>
          {navigation.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary/12 text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )
                }
              >
                <Icon className="size-5" aria-hidden="true" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Sua progressão</p>
            <Badge>{profile?.streak ?? 0} dias</Badge>
          </div>
          <XpProgress totalXp={xp} compact />
        </div>
      </aside>
    </>
  )
}
