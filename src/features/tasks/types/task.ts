import type { Timestamp } from "firebase/firestore"

import type { ITAreaId } from "@/config/it-area-config"

export const TASK_STATUSES = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "A Fazer" },
  { id: "in-progress", label: "Em andamento" },
  { id: "completed", label: "Concluída" },
  { id: "archived", label: "Arquivada" },
] as const

export const TASK_PRIORITIES = [
  { id: "low", label: "Simples", rank: 1 },
  { id: "medium", label: "Média", rank: 2 },
  { id: "high", label: "Difícil", rank: 3 },
  { id: "critical", label: "Crítica", rank: 4 },
] as const

export type TaskStatus = (typeof TASK_STATUSES)[number]["id"]
export type TaskPriority = (typeof TASK_PRIORITIES)[number]["id"]

export const MAX_TASK_TITLE_LENGTH = 160
export const MAX_TASK_DESCRIPTION_LENGTH = 5000
export const MAX_TASK_SHORT_TEXT_LENGTH = 80
export const MAX_TASK_TAGS = 10
export const MAX_TASK_TAG_LENGTH = 32
export const MAX_TASK_ESTIMATE_MINUTES = 1440
export const MAX_TASK_PROJECT_ID_LENGTH = 128
export const MAX_TASK_KANBAN_ORDER = 1_000_000_000_000

export interface TaskDocument {
  title: string
  description: string | null
  category: string | null
  areaId?: ITAreaId | null
  priority: TaskPriority
  status: TaskStatus
  project: string | null
  projectId?: string | null
  kanbanOrder?: number | null
  dueAt: Timestamp | null
  estimateMinutes: number | null
  tags: string[]
  xp: number
  createdAt: Timestamp
  updatedAt: Timestamp
  completedAt: Timestamp | null
}

export interface Task extends TaskDocument {
  id: string
}

export interface CreateTaskInput {
  title: string
  description?: string | null
  category?: string | null
  areaId?: ITAreaId | null
  priority?: TaskPriority
  status?: TaskStatus
  project?: string | null
  projectId?: string | null
  kanbanOrder?: number | null
  dueDate?: Date | null
  estimateMinutes?: number | null
  tags?: string[]
}

export interface UpdateTaskInput {
  title?: string
  description?: string | null
  category?: string | null
  areaId?: ITAreaId | null
  priority?: TaskPriority
  status?: TaskStatus
  project?: string | null
  projectId?: string | null
  kanbanOrder?: number | null
  dueDate?: Date | null
  estimateMinutes?: number | null
  tags?: string[]
}

export type TaskSort =
  "updated-desc" | "created-desc" | "due-asc" | "priority-desc" | "xp-desc"

export type TaskView = "list" | "kanban"

export function getTaskStatusLabel(status: TaskStatus) {
  return TASK_STATUSES.find((item) => item.id === status)?.label ?? status
}

export function getTaskPriorityLabel(priority: TaskPriority) {
  return TASK_PRIORITIES.find((item) => item.id === priority)?.label ?? priority
}

export function getTaskPriorityRank(priority: TaskPriority) {
  return TASK_PRIORITIES.find((item) => item.id === priority)?.rank ?? 0
}
