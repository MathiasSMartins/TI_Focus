import { RouterProvider } from "react-router-dom"

import { router } from "@/app/router"
import { AuthProvider } from "@/features/auth"
import { GamificationProvider } from "@/features/gamification"

export function App() {
  return (
    <AuthProvider>
      <GamificationProvider>
        <RouterProvider router={router} />
      </GamificationProvider>
    </AuthProvider>
  )
}
