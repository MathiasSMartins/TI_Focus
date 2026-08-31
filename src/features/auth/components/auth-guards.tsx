import { Navigate, Outlet, useLocation } from "react-router-dom"

import { AuthErrorState } from "@/features/auth/components/auth-error-state"
import { AuthLoadingScreen } from "@/features/auth/components/auth-loading-screen"
import { useAuth } from "@/features/auth/hooks/use-auth"

const PUBLIC_AUTH_PATHS = ["/login", "/cadastro", "/recuperar-senha"]

function getRequestedDestination(state: unknown) {
  const from = (state as { from?: unknown } | null)?.from

  if (
    typeof from !== "string" ||
    !from.startsWith("/") ||
    from.startsWith("//") ||
    PUBLIC_AUTH_PATHS.includes(from)
  ) {
    return "/dashboard"
  }

  return from
}

export function GuestOnlyRoute() {
  const { user, profile, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) return <AuthLoadingScreen />
  if (!user) return <Outlet />

  return (
    <Navigate
      to={
        profile?.onboardingCompleted
          ? getRequestedDestination(location.state)
          : "/onboarding"
      }
      replace
    />
  )
}

export function RequireAuthRoute() {
  const { user, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) return <AuthLoadingScreen />
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}

export function RequireOnboardingRoute() {
  const { profile, isInitializing, error, reloadProfile, logout } = useAuth()

  if (isInitializing) return <AuthLoadingScreen />
  if (error && !profile) {
    return (
      <AuthErrorState
        message={error}
        onRetry={() => void reloadProfile()}
        onLogout={() => void logout()}
      />
    )
  }
  if (!profile?.onboardingCompleted) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
