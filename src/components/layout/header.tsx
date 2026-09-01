import { Bell, LoaderCircle, LogOut, Menu, Search } from "lucide-react"
import { useLocation } from "react-router-dom"

import { Button } from "@/components/ui/button"
import { getITAreaConfig } from "@/config/it-area-config"
import { useAuth } from "@/features/auth"
import { UserAvatar } from "@/features/profile/components/user-avatar"

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/tasks": "Tarefas",
  "/goals": "Metas",
  "/pomodoro": "Pomodoro",
  "/projects": "Projetos",
  "/achievements": "Conquistas",
  "/profile": "Perfil",
  "/settings": "Configurações",
}

interface HeaderProps {
  onOpenNavigation: () => void
}

export function Header({ onOpenNavigation }: HeaderProps) {
  const { pathname } = useLocation()
  const { user, profile, logout, isSubmitting } = useAuth()
  const areaConfig = getITAreaConfig(profile?.primaryArea)
  const personalizedPageTitles: Record<string, string> = {
    ...pageTitles,
    "/dashboard": areaConfig.titles.dashboard,
    "/tasks": areaConfig.titles.tasks,
    "/goals": areaConfig.titles.goals,
    "/achievements": areaConfig.titles.achievements,
  }
  const title = pathname.startsWith("/projects/")
    ? "Detalhes do projeto"
    : (personalizedPageTitles[pathname] ?? "TI Focus")
  const displayName = profile?.name ?? user?.displayName
  const avatar = profile?.avatar ?? user?.photoURL

  const currentDate = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date())

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="lg:hidden"
          aria-label="Abrir menu"
          onClick={onOpenNavigation}
        >
          <Menu />
        </Button>

        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold sm:text-base">
            {title}
          </h1>
          <p className="hidden text-xs capitalize text-muted-foreground sm:block">
            {currentDate}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label className="relative hidden md:block">
            <span className="sr-only">Buscar</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Buscar no workspace..."
              className="h-10 w-64 rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-ring/20"
              disabled
              title="Busca disponível em uma próxima fase"
            />
          </label>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Notificações — em breve"
            disabled
          >
            <Bell />
          </Button>
          <UserAvatar avatar={avatar} name={displayName} />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Sair da conta"
            disabled={isSubmitting}
            onClick={() => void logout()}
          >
            {isSubmitting ? (
              <LoaderCircle className="animate-spin" />
            ) : (
              <LogOut />
            )}
          </Button>
        </div>
      </div>
    </header>
  )
}
