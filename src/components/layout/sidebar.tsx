import {
  CheckSquare2,
  FolderKanban,
  LayoutDashboard,
  Settings,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react"
import { NavLink } from "react-router-dom"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/features/auth"
import type { NavigationItem } from "@/types/navigation"
import { cn } from "@/utils/cn"

const navigation: NavigationItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tarefas", href: "/tasks", icon: CheckSquare2 },
  { label: "Projetos", href: "/projects", icon: FolderKanban },
  { label: "Perfil", href: "/profile", icon: UserRound },
  { label: "Configurações", href: "/settings", icon: Settings },
]

interface SidebarProps {
  open: boolean
  onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { profile } = useAuth()
  const level = profile?.level ?? 1
  const xp = profile?.xp ?? 0
  const levelProgress = Math.min(100, Math.max(0, (xp % 1000) / 10))

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
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Sua progressão</p>
              <p className="mt-1 font-semibold">
                Nível {String(level).padStart(2, "0")}
              </p>
            </div>
            <Badge>{profile?.streak ?? 0} dias</Badge>
          </div>
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${levelProgress}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{xp} XP total</p>
        </div>
      </aside>
    </>
  )
}
