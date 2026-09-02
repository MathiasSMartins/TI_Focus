import { useState } from "react"
import { Outlet } from "react-router-dom"

import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { NotificationCenter } from "@/features/notifications"

export function MainLayout() {
  const [isNavigationOpen, setIsNavigationOpen] = useState(false)

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        open={isNavigationOpen}
        onClose={() => setIsNavigationOpen(false)}
      />
      <div className="min-h-screen lg:pl-72">
        <Header onOpenNavigation={() => setIsNavigationOpen(true)} />
        <main className="mx-auto w-full max-w-[1600px] p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
      <NotificationCenter />
    </div>
  )
}
