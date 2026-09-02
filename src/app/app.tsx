import { RouterProvider } from "react-router-dom"

import { router } from "@/app/router"
import { AchievementsProvider } from "@/features/achievements"
import { AuthProvider } from "@/features/auth"
import { GamificationProvider } from "@/features/gamification"
import { GoalsProvider } from "@/features/goals"
import { NotificationsProvider } from "@/features/notifications"
import { PomodoroProvider } from "@/features/pomodoro"

export function App() {
  return (
    <AuthProvider>
      <PomodoroProvider>
        <GoalsProvider>
          <GamificationProvider>
            <AchievementsProvider>
              <NotificationsProvider>
                <RouterProvider router={router} />
              </NotificationsProvider>
            </AchievementsProvider>
          </GamificationProvider>
        </GoalsProvider>
      </PomodoroProvider>
    </AuthProvider>
  )
}
