import {
  Bell,
  CheckCheck,
  Clock3,
  Flame,
  Medal,
  Target,
  Timer,
  TrendingUp,
  X,
} from "lucide-react"
import { useEffect } from "react"
import { useNavigate } from "react-router-dom"

import { Button } from "@/components/ui/button"
import type { NotificationType } from "@/features/notifications/types/notification"
import { useNotifications } from "@/features/notifications/hooks/use-notifications"
import { cn } from "@/utils/cn"

const icons: Record<NotificationType, typeof Bell> = {
  pomodoro_completed: Timer,
  break_completed: Clock3,
  goal_near_end: Target,
  goal_completed: Target,
  achievement_unlocked: Medal,
  level_up: TrendingUp,
  streak_at_risk: Flame,
  task_due_soon: Clock3,
  task_overdue: Clock3,
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

export function NotificationCenter() {
  const navigate = useNavigate()
  const {
    notifications,
    unreadCount,
    isLoading,
    isCenterOpen,
    closeCenter,
    markAsRead,
    markAllAsRead,
  } = useNotifications()

  useEffect(() => {
    if (!isCenterOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCenter()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [closeCenter, isCenterOpen])

  if (!isCenterOpen) return null

  return (
    <div className="fixed inset-0 z-50" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        aria-label="Fechar notificações"
        onClick={closeCenter}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="notification-center-title"
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
      >
        <header className="flex items-center gap-3 border-b border-border p-4">
          <div className="min-w-0 flex-1">
            <h2 id="notification-center-title" className="font-semibold">
              Notificações
            </h2>
            <p className="text-xs text-muted-foreground">
              {unreadCount === 0
                ? "Tudo em dia"
                : `${unreadCount} não lida${unreadCount === 1 ? "" : "s"}`}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => void markAllAsRead()}
            >
              <CheckCheck /> Marcar todas
            </Button>
          )}
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Fechar"
            onClick={closeCenter}
          >
            <X />
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">
              Carregando histórico...
            </p>
          ) : notifications.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center p-8 text-center">
              <Bell className="size-8 text-muted-foreground" />
              <p className="mt-3 font-medium">Nenhuma notificação</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Seus lembretes e conquistas aparecerão aqui.
              </p>
            </div>
          ) : (
            <ul aria-label="Histórico de notificações">
              {notifications.map((notification) => {
                const Icon = icons[notification.type]
                const unread = notification.readAt === null
                return (
                  <li
                    key={notification.id}
                    className={cn(
                      "border-b border-border p-4 transition hover:bg-accent/60",
                      unread && "bg-primary/5",
                    )}
                  >
                    <button
                      type="button"
                      className="flex w-full gap-3 text-left"
                      onClick={() => {
                        void markAsRead(notification.id)
                        closeCenter()
                        navigate(notification.href)
                      }}
                    >
                      <span className="mt-0.5 rounded-lg bg-secondary p-2 text-primary">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start gap-2">
                          <span className="flex-1 text-sm font-medium">
                            {notification.title}
                          </span>
                          {unread && (
                            <span
                              className="mt-1 size-2 rounded-full bg-primary"
                              aria-label="Não lida"
                            />
                          )}
                        </span>
                        <span className="mt-1 block text-sm leading-relaxed text-muted-foreground">
                          {notification.body}
                        </span>
                        <time className="mt-2 block text-xs text-muted-foreground">
                          {formatDate(notification.occurredAt.toDate())}
                        </time>
                      </span>
                    </button>
                    {unread && (
                      <button
                        type="button"
                        className="ml-11 mt-2 text-xs font-medium text-primary hover:underline"
                        onClick={() => void markAsRead(notification.id)}
                      >
                        Marcar como lida
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>
    </div>
  )
}
