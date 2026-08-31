import { Navigate, createBrowserRouter } from "react-router-dom"

import { MainLayout } from "@/components/layout/main-layout"
import {
  AuthLayout,
  ForgotPasswordPage,
  GuestOnlyRoute,
  LoginPage,
  RegisterPage,
  RequireAuthRoute,
  RequireOnboardingRoute,
} from "@/features/auth"
import { DashboardPage } from "@/features/dashboard/pages/dashboard-page"
import { ProjectDetailPage, ProjectsPage } from "@/features/projects"
import { OnboardingPage } from "@/features/profile/pages/onboarding-page"
import { ProfilePage } from "@/features/profile/pages/profile-page"
import { SettingsPage } from "@/features/settings/pages/settings-page"
import { TasksPage } from "@/features/tasks/pages/tasks-page"
import { NotFoundPage } from "@/pages/not-found-page"

export const router = createBrowserRouter([
  {
    element: <GuestOnlyRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/cadastro", element: <RegisterPage /> },
          { path: "/recuperar-senha", element: <ForgotPasswordPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireAuthRoute />,
    children: [
      { path: "/onboarding", element: <OnboardingPage /> },
      {
        element: <RequireOnboardingRoute />,
        children: [
          {
            path: "/",
            element: <MainLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: "dashboard", element: <DashboardPage /> },
              { path: "tasks", element: <TasksPage /> },
              { path: "projects", element: <ProjectsPage /> },
              {
                path: "projects/:projectId",
                element: <ProjectDetailPage />,
              },
              { path: "profile", element: <ProfilePage /> },
              { path: "settings", element: <SettingsPage /> },
              { path: "*", element: <NotFoundPage /> },
            ],
          },
        ],
      },
    ],
  },
])
