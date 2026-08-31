import type { Timestamp } from "firebase/firestore"

import type { Task } from "@/features/tasks/types/task"

export const PROJECT_STATUSES = [
  { id: "planning", label: "Planejamento" },
  { id: "in-progress", label: "Em andamento" },
  { id: "paused", label: "Pausado" },
  { id: "completed", label: "Concluído" },
  { id: "archived", label: "Arquivado" },
] as const

export type ProjectStatus = (typeof PROJECT_STATUSES)[number]["id"]

export const MAX_PROJECT_NAME_LENGTH = 120
export const MAX_PROJECT_DESCRIPTION_LENGTH = 5000
export const MAX_PROJECT_CATEGORY_LENGTH = 80
export const MAX_PROJECT_INVESTED_MINUTES = 10_000_000

export interface ProjectDocument {
  name: string
  description: string | null
  status: ProjectStatus
  dueAt: Timestamp | null
  category: string | null
  investedMinutes: number
  createdAt: Timestamp
  updatedAt: Timestamp
  archivedAt: Timestamp | null
  deletedAt: Timestamp | null
}

export interface Project extends ProjectDocument {
  id: string
}

export interface CreateProjectInput {
  name: string
  description?: string | null
  status?: ProjectStatus
  dueDate?: Date | null
  category?: string | null
  investedMinutes?: number
}

export interface UpdateProjectInput {
  name?: string
  description?: string | null
  status?: ProjectStatus
  dueDate?: Date | null
  category?: string | null
  investedMinutes?: number
}

export interface ProjectMetrics {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  progress: number
  accumulatedXp: number
  investedMinutes: number
}

export function getProjectStatusLabel(status: ProjectStatus) {
  return PROJECT_STATUSES.find((item) => item.id === status)?.label ?? status
}

export function isTaskInProject(
  task: Pick<Task, "projectId" | "project">,
  project: Pick<Project, "id" | "name">,
  projects: Array<Pick<Project, "id" | "name">>,
) {
  if (task.projectId) return task.projectId === project.id

  const legacyName = task.project?.trim().toLocaleLowerCase("pt-BR")
  if (!legacyName) return false
  const matchingProjects = projects.filter(
    (item) => item.name.trim().toLocaleLowerCase("pt-BR") === legacyName,
  )
  return matchingProjects.length === 1 && matchingProjects[0].id === project.id
}

export function getProjectMetrics(
  project: Pick<Project, "investedMinutes">,
  tasks: Task[],
): ProjectMetrics {
  const activeTasks = tasks.filter((task) => task.status !== "archived")
  const completedTasks = activeTasks.filter(
    (task) => task.status === "completed",
  ).length
  const totalTasks = activeTasks.length

  return {
    totalTasks,
    completedTasks,
    pendingTasks: totalTasks - completedTasks,
    progress:
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
    accumulatedXp: tasks
      .filter((task) => task.completedAt != null)
      .reduce((total, task) => total + task.xp, 0),
    investedMinutes: project.investedMinutes,
  }
}

export function formatInvestedTime(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  if (hours === 0) return `${remainingMinutes} min`
  if (remainingMinutes === 0) return `${hours}h`
  return `${hours}h ${remainingMinutes}min`
}
