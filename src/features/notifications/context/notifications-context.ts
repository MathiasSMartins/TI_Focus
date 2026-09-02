import { createContext } from "react"

import type {
  AppNotification,
  NotificationPreferences,
} from "@/features/notifications/types/notification"

export interface NotificationsContextValue {
  notifications: AppNotification[]
  unreadCount: number
  isLoading: boolean
  isCenterOpen: boolean
  isSavingPreferences: boolean
  error: string | null
  preferences: Required<NotificationPreferences>
  browserPermission: NotificationPermission | "unsupported"
  openCenter: () => void
  closeCenter: () => void
  markAsRead: (notificationId: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  savePreferences: (
    preferences: Required<NotificationPreferences>,
  ) => Promise<boolean>
  requestBrowserPermission: () => Promise<
    NotificationPermission | "unsupported"
  >
}

export const NotificationsContext = createContext<
  NotificationsContextValue | undefined
>(undefined)
