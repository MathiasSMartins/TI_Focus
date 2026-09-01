import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import type { User } from "firebase/auth"

import { AuthContext } from "@/features/auth/context/auth-context"
import { getAuthErrorMessage } from "@/features/auth/services/auth-errors"
import {
  loginWithEmail,
  loginWithGoogle as loginWithGoogleService,
  logoutUser,
  observeAuthState,
  registerWithEmail,
  requestPasswordReset,
} from "@/features/auth/services/auth-service"
import type {
  AuthContextValue,
  CompleteOnboardingData,
} from "@/features/auth/types/auth"
import { saveGoal } from "@/features/goals/services/goal-repository"
import {
  completeUserOnboarding,
  ensureUserProfile,
  getUserProfile,
  subscribeToUserProfile,
} from "@/features/profile/services/user-profile-repository"
import type { UserProfile } from "@/features/profile/types/user-profile"
import { isGoogleAuthEnabled } from "@/services/firebase"

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  useEffect(() => {
    let active = true
    let authGeneration = 0
    let unsubscribeProfile: () => void = () => undefined

    const unsubscribeAuth = observeAuthState((nextUser) => {
      const currentGeneration = ++authGeneration
      unsubscribeProfile()
      unsubscribeProfile = () => undefined
      setUser(nextUser)
      setProfile(null)
      setError(null)

      if (!nextUser) {
        setIsInitializing(false)
        return
      }

      setIsInitializing(true)
      void ensureUserProfile(nextUser)
        .then(() => {
          if (!active || currentGeneration !== authGeneration) return

          unsubscribeProfile = subscribeToUserProfile(
            nextUser.uid,
            (nextProfile) => {
              if (!active || currentGeneration !== authGeneration) return
              setProfile(nextProfile)
              setIsInitializing(false)
            },
            (profileError) => {
              if (!active || currentGeneration !== authGeneration) return
              setError(getAuthErrorMessage(profileError))
              setIsInitializing(false)
            },
          )
        })
        .catch((profileError: unknown) => {
          if (!active || currentGeneration !== authGeneration) return
          setError(getAuthErrorMessage(profileError))
          setIsInitializing(false)
        })
    })

    return () => {
      active = false
      authGeneration += 1
      unsubscribeProfile()
      unsubscribeAuth()
    }
  }, [])

  const runAction = useCallback(async (action: () => Promise<unknown>) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await action()
      return true
    } catch (actionError) {
      setError(getAuthErrorMessage(actionError))
      return false
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const login = useCallback(
    (email: string, password: string) =>
      runAction(() => loginWithEmail(email, password)),
    [runAction],
  )

  const register = useCallback(
    (name: string, email: string, password: string) =>
      runAction(() => registerWithEmail(name, email, password)),
    [runAction],
  )

  const loginWithGoogle = useCallback(
    () => runAction(loginWithGoogleService),
    [runAction],
  )

  const resetPassword = useCallback(
    (email: string) => runAction(() => requestPasswordReset(email)),
    [runAction],
  )

  const logout = useCallback(async () => {
    await runAction(logoutUser)
  }, [runAction])

  const reloadProfile = useCallback(async () => {
    if (!user) return

    setIsInitializing(true)
    setError(null)
    try {
      await ensureUserProfile(user)
      setProfile(await getUserProfile(user.uid))
    } catch (profileError) {
      setError(getAuthErrorMessage(profileError))
    } finally {
      setIsInitializing(false)
    }
  }, [user])

  const completeOnboarding = useCallback(
    async (data: CompleteOnboardingData) => {
      if (!user || !profile) {
        setError("Não foi possível carregar seu perfil. Tente novamente.")
        return false
      }

      return runAction(async () => {
        await saveGoal(
          user.uid,
          "daily",
          "tasksCompleted",
          data.dailyTaskGoal,
          data.timezone,
        )
        await completeUserOnboarding({
          uid: user.uid,
          name: data.name,
          avatar: data.avatar,
          primaryArea: data.primaryArea,
          secondaryAreas: data.secondaryAreas,
          primaryObjective: data.primaryObjective,
          timezone: data.timezone,
          currentSettings: profile.settings,
        })

        setProfile({
          ...profile,
          name: data.name.trim(),
          avatar: data.avatar,
          primaryArea: data.primaryArea,
          secondaryAreas: data.secondaryAreas,
          primaryObjective: data.primaryObjective,
          dailyTaskGoal: data.dailyTaskGoal,
          onboardingCompleted: true,
          settings: { ...profile.settings, timezone: data.timezone },
        })

        const refreshedProfile = await getUserProfile(user.uid).catch(
          () => null,
        )
        if (refreshedProfile) setProfile(refreshedProfile)
      })
    },
    [profile, runAction, user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isInitializing,
      isSubmitting,
      isGoogleLoginEnabled: isGoogleAuthEnabled,
      error,
      login,
      register,
      loginWithGoogle,
      resetPassword,
      logout,
      completeOnboarding,
      reloadProfile,
      clearError,
    }),
    [
      clearError,
      completeOnboarding,
      error,
      isInitializing,
      isSubmitting,
      login,
      loginWithGoogle,
      logout,
      profile,
      register,
      reloadProfile,
      resetPassword,
      user,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
