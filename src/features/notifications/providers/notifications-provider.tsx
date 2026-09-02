import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"

import { subscribeToAchievementUnlocked } from "@/features/achievements/events/achievement-events"
import { useAuth } from "@/features/auth"
import { subscribeToGoalCompleted } from "@/features/goals"
import {
  getSynchronizedServerNow,
  synchronizeServerClock,
} from "@/features/gamification/services/xp-repository"
import { subscribeToPomodoroCompleted } from "@/features/pomodoro"
import { updateUserNotificationPreferences } from "@/features/profile/services/user-profile-repository"
import { subscribeToTaskCompleted } from "@/features/tasks"
import { NotificationsContext } from "@/features/notifications/context/notifications-context"
import {
  claimBrowserDelivery,
  ensureNotification,
  getPendingBrowserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  releaseBrowserDelivery,
  subscribeToNotifications,
} from "@/features/notifications/services/notification-repository"
import {
  createPomodoroNotification,
  getLevelUpNotificationCandidate,
  reconcileNotifications,
} from "@/features/notifications/services/notification-reconciler"
import {
  isNotificationTypeEnabled,
  resolveNotificationPreferences,
  type AppNotification,
  type CreateNotificationInput,
  type NotificationPreferences,
} from "@/features/notifications/types/notification"

const RECONCILIATION_INTERVAL_MS = 60_000

function getBrowserPermission(): NotificationPermission | "unsupported" {
  return "Notification" in window
    ? window.Notification.permission
    : "unsupported"
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const uid = user?.uid
  const profileUid = profile?.uid
  const preferences = useMemo(
    () => resolveNotificationPreferences(profile?.settings.notifications),
    [profile?.settings.notifications],
  )
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCenterOpen, setIsCenterOpen] = useState(false)
  const [isSavingPreferences, setIsSavingPreferences] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [browserPermission, setBrowserPermission] = useState<
    NotificationPermission | "unsupported"
  >(getBrowserPermission)

  const openCenter = useCallback(() => setIsCenterOpen(true), [])
  const closeCenter = useCallback(() => setIsCenterOpen(false), [])

  const requestBrowserPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      setBrowserPermission("unsupported")
      return "unsupported" as const
    }
    const permission = await window.Notification.requestPermission()
    setBrowserPermission(permission)
    return permission
  }, [])

  const savePreferences = useCallback(
    async (nextPreferences: Required<NotificationPreferences>) => {
      if (!uid || !profile || profileUid !== uid) return false
      setIsSavingPreferences(true)
      setError(null)
      try {
        await updateUserNotificationPreferences(
          uid,
          nextPreferences,
          profile.settings.notifications,
        )
        return true
      } catch {
        setError("Não foi possível salvar as preferências de notificação.")
        return false
      } finally {
        setIsSavingPreferences(false)
      }
    },
    [profile, profileUid, uid],
  )

  const markAsRead = useCallback(
    async (notificationId: string) => {
      if (!uid) return
      try {
        await markNotificationAsRead(uid, notificationId)
      } catch {
        setError("Não foi possível marcar a notificação como lida.")
      }
    },
    [uid],
  )

  const markAllAsRead = useCallback(async () => {
    if (!uid) return
    try {
      await markAllNotificationsAsRead(uid)
    } catch {
      setError("Não foi possível marcar todas as notificações como lidas.")
    }
  }, [uid])

  useEffect(() => {
    if (!uid || profileUid !== uid) return

    let active = true
    let pipeline = Promise.resolve()
    let initialReconciliation = true

    const getTrustedNow = async () => {
      const current = getSynchronizedServerNow(uid)
      if (current !== null) return current
      try {
        return await synchronizeServerClock(uid)
      } catch {
        return null
      }
    }

    const deliverBrowser = async (candidate: CreateNotificationInput) => {
      if (
        !active ||
        !preferences.push ||
        !isNotificationTypeEnabled(preferences, candidate.type) ||
        !("Notification" in window) ||
        window.Notification.permission !== "granted"
      ) {
        return
      }
      const synchronizedNow = await getTrustedNow()
      if (synchronizedNow === null) return
      if (!(await claimBrowserDelivery(uid, candidate.id, synchronizedNow))) {
        return
      }
      if (!active) {
        await releaseBrowserDelivery(uid, candidate.id)
        return
      }

      let nativeNotification: Notification
      try {
        nativeNotification = new window.Notification(candidate.title, {
          body: candidate.body,
          tag: candidate.id,
        })
      } catch {
        await releaseBrowserDelivery(uid, candidate.id)
        return
      }
      nativeNotification.onclick = () => {
        window.focus()
        nativeNotification.close()
        void markNotificationAsRead(uid, candidate.id).finally(() =>
          window.location.assign(candidate.href),
        )
      }
    }

    const persistLive = async (candidate: CreateNotificationInput) => {
      if (
        (!preferences.inApp && !preferences.push) ||
        !isNotificationTypeEnabled(preferences, candidate.type)
      ) {
        return
      }
      if (
        await ensureNotification(
          uid,
          candidate,
          preferences.inApp,
          preferences.push,
        )
      ) {
        await deliverBrowser(candidate)
      }
    }

    const enqueue = (operation: () => Promise<void>) => {
      pipeline = pipeline
        .then(() => (active ? operation() : undefined))
        .catch(() => undefined)
    }

    const reconcile = (deliverNew: boolean) => {
      enqueue(async () => {
        const synchronizedNow = await getTrustedNow()
        if (synchronizedNow === null) return
        const allowBrowserDelivery = deliverNew && !initialReconciliation
        await reconcileNotifications(
          uid,
          preferences,
          profile?.streak ?? 0,
          new Date(synchronizedNow),
          allowBrowserDelivery,
        )
        initialReconciliation = false
        const pending = await getPendingBrowserNotifications(
          uid,
          synchronizedNow,
        )
        for (const candidate of pending) await deliverBrowser(candidate)
      })
    }

    const unsubscribeNotifications = subscribeToNotifications(
      uid,
      (items) => {
        if (!active) return
        setNotifications(items)
        setIsLoading(false)
      },
      () => {
        if (!active) return
        setError("Não foi possível carregar o histórico de notificações.")
        setIsLoading(false)
      },
    )

    reconcile(false)
    const interval = window.setInterval(
      () => reconcile(true),
      RECONCILIATION_INTERVAL_MS,
    )
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") reconcile(true)
    }
    document.addEventListener("visibilitychange", onVisibilityChange)

    const unsubscribePomodoro = subscribeToPomodoroCompleted((event) => {
      if (!active || event.userId !== uid || event.alreadyProcessed) return
      enqueue(() => persistLive(createPomodoroNotification(event)))
    })
    const unsubscribeGoal = subscribeToGoalCompleted((event) => {
      if (!active || event.userId !== uid) return
      const cadence = {
        daily: "diária",
        weekly: "semanal",
        monthly: "mensal",
      }[event.cadence]
      enqueue(() =>
        persistLive({
          id: `goal_completed__${event.cadence}__${event.periodKey}`,
          type: "goal_completed",
          title: "Meta concluída",
          body: `Sua meta ${cadence} foi concluída. Você recebeu ${event.awardedXp} XP.`,
          href: "/goals",
          sourceId: event.progressId,
          occurredAt: event.occurredAt,
        }),
      )
      enqueue(async () => {
        const transactionId = `goal__${event.cadence}__${event.periodKey}`
        const levelUp = await getLevelUpNotificationCandidate(
          uid,
          transactionId,
        )
        if (levelUp) await persistLive(levelUp)
      })
    })
    const unsubscribeAchievement = subscribeToAchievementUnlocked((event) => {
      if (!active || event.userId !== uid) return
      enqueue(() =>
        persistLive({
          id: `achievement_unlocked__${event.achievement.id}`,
          type: "achievement_unlocked",
          title: "Nova conquista",
          body: `${event.achievement.name}: ${event.achievement.description}`,
          href: "/achievements",
          sourceId: event.achievement.id,
          occurredAt: event.unlockedAt,
        }),
      )
      if (event.levelAfter > event.levelBefore) {
        enqueue(() =>
          persistLive({
            id: `level_up__achievement__${event.achievement.id}__${event.levelAfter}`,
            type: "level_up",
            title: `Level Up: nível ${event.levelAfter}`,
            body: "Seu progresso rendeu um novo nível. Continue avançando!",
            href: "/dashboard",
            sourceId: `achievement__${event.achievement.id}`,
            occurredAt: event.unlockedAt,
          }),
        )
      }
    })
    const unsubscribeTask = subscribeToTaskCompleted((event) => {
      if (
        !active ||
        event.userId !== uid ||
        event.alreadyProcessed ||
        event.levelBefore === undefined ||
        event.levelAfter === undefined ||
        event.levelAfter <= event.levelBefore
      ) {
        return
      }
      enqueue(() =>
        persistLive({
          id: `level_up__${event.transactionId ?? event.taskId}__${event.levelAfter}`,
          type: "level_up",
          title: `Level Up: nível ${event.levelAfter}`,
          body: "Seu progresso rendeu um novo nível. Continue avançando!",
          href: "/dashboard",
          sourceId: event.transactionId ?? event.taskId,
          occurredAt: event.occurredAt,
        }),
      )
    })

    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener("visibilitychange", onVisibilityChange)
      unsubscribeNotifications()
      unsubscribePomodoro()
      unsubscribeGoal()
      unsubscribeAchievement()
      unsubscribeTask()
      setNotifications([])
      setIsCenterOpen(false)
    }
  }, [preferences, profile?.streak, profileUid, uid])

  const value = useMemo(
    () => ({
      notifications,
      unreadCount: notifications.filter((item) => item.readAt === null).length,
      isLoading,
      isCenterOpen,
      isSavingPreferences,
      error,
      preferences,
      browserPermission,
      openCenter,
      closeCenter,
      markAsRead,
      markAllAsRead,
      savePreferences,
      requestBrowserPermission,
    }),
    [
      browserPermission,
      closeCenter,
      error,
      isCenterOpen,
      isLoading,
      isSavingPreferences,
      markAllAsRead,
      markAsRead,
      notifications,
      openCenter,
      preferences,
      requestBrowserPermission,
      savePreferences,
    ],
  )

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  )
}
