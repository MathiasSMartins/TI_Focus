import type { User } from "firebase/auth"

import type {
  ITAreaId,
  PrimaryObjectiveId,
  UserProfile,
} from "@/features/profile/types/user-profile"

export interface CompleteOnboardingData {
  name: string
  avatar: string | null
  primaryArea: ITAreaId
  secondaryAreas: ITAreaId[]
  primaryObjective: PrimaryObjectiveId
  dailyTaskGoal: number
  timezone: string
}

export interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  isInitializing: boolean
  isSubmitting: boolean
  isGoogleLoginEnabled: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  register: (name: string, email: string, password: string) => Promise<boolean>
  loginWithGoogle: () => Promise<boolean>
  resetPassword: (email: string) => Promise<boolean>
  logout: () => Promise<void>
  completeOnboarding: (data: CompleteOnboardingData) => Promise<boolean>
  reloadProfile: () => Promise<void>
  clearError: () => void
}
