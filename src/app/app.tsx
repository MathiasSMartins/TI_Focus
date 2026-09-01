import { RouterProvider } from "react-router-dom"

import { router } from "@/app/router"
import { AchievementsProvider } from "@/features/achievements"
import { AuthProvider } from "@/features/auth"
import { GamificationProvider } from "@/features/gamification"

export function App() {
  return (
    <AuthProvider>
      <GamificationProvider>
        <AchievementsProvider>
          <RouterProvider router={router} />
        </AchievementsProvider>
      </GamificationProvider>
    </AuthProvider>
  )
}
