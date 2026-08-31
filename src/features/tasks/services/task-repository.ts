import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type Unsubscribe,
  type WithFieldValue,
} from "firebase/firestore"

import {
  publishTaskCompleted,
  TASK_COMPLETED,
} from "@/features/tasks/events/task-events"
import {
  DEFAULT_TASK_XP,
  MAX_TASK_DESCRIPTION_LENGTH,
  MAX_TASK_ESTIMATE_MINUTES,
  MAX_TASK_KANBAN_ORDER,
  MAX_TASK_PROJECT_ID_LENGTH,
  MAX_TASK_SHORT_TEXT_LENGTH,
  MAX_TASK_TAG_LENGTH,
  MAX_TASK_TAGS,
  MAX_TASK_TITLE_LENGTH,
  MAX_TASK_XP,
  TASK_PRIORITIES,
  TASK_STATUSES,
  type CreateTaskInput,
  type Task,
  type TaskDocument,
  type TaskPriority,
  type TaskStatus,
  type UpdateTaskInput,
} from "@/features/tasks/types/task"
import { firestoreDb } from "@/services/firebase"

function getFirestoreInstance(): Firestore {
  if (!firestoreDb) {
    throw new Error("Firebase não está configurado neste ambiente.")
  }
  return firestoreDb
}

function getTaskCollection(uid: string) {
  return collection(
    getFirestoreInstance(),
    "users",
    uid,
    "tasks",
  ) as CollectionReference<TaskDocument>
}

function getTaskReference(uid: string, taskId: string) {
  return doc(getTaskCollection(uid), taskId) as DocumentReference<TaskDocument>
}

function normalizeTitle(title: string) {
  const normalized = title.trim()
  if (!normalized) throw new Error("Informe um título para a tarefa.")
  if (normalized.length > MAX_TASK_TITLE_LENGTH) {
    throw new Error(
      `O título deve ter até ${MAX_TASK_TITLE_LENGTH} caracteres.`,
    )
  }
  return normalized
}

function normalizeOptionalText(value: string | null | undefined, max: number) {
  const normalized = value?.trim() ?? ""
  if (!normalized) return null
  if (normalized.length > max) {
    throw new Error(`Este campo deve ter até ${max} caracteres.`)
  }
  return normalized
}

function normalizeProjectId(value: string | null | undefined) {
  const normalized = value?.trim() ?? ""
  if (!normalized) return null
  if (
    normalized.length > MAX_TASK_PROJECT_ID_LENGTH ||
    normalized.includes("/")
  ) {
    throw new Error("Projeto inválido.")
  }
  return normalized
}

function normalizeKanbanOrder(value: number | null | undefined) {
  if (value == null) return null
  if (!Number.isFinite(value) || value < 0 || value > MAX_TASK_KANBAN_ORDER) {
    throw new Error("Posição Kanban inválida.")
  }
  return value
}

function normalizeTags(tags: string[] | undefined) {
  const normalized = [...new Set((tags ?? []).map((tag) => tag.trim()))].filter(
    Boolean,
  )
  if (normalized.length > MAX_TASK_TAGS) {
    throw new Error(`Use no máximo ${MAX_TASK_TAGS} tags.`)
  }
  if (normalized.some((tag) => tag.length > MAX_TASK_TAG_LENGTH)) {
    throw new Error(`Cada tag deve ter até ${MAX_TASK_TAG_LENGTH} caracteres.`)
  }
  return normalized
}

function normalizeEstimate(value: number | null | undefined) {
  if (value == null) return null
  if (
    !Number.isInteger(value) ||
    value < 1 ||
    value > MAX_TASK_ESTIMATE_MINUTES
  ) {
    throw new Error("A estimativa deve estar entre 1 e 1440 minutos.")
  }
  return value
}

function normalizeXp(value: number | undefined) {
  const xp = value ?? DEFAULT_TASK_XP
  if (!Number.isInteger(xp) || xp < 0 || xp > MAX_TASK_XP) {
    throw new Error(`O XP deve estar entre 0 e ${MAX_TASK_XP}.`)
  }
  return xp
}

function normalizePriority(priority: TaskPriority | undefined) {
  const nextPriority = priority ?? "medium"
  if (!TASK_PRIORITIES.some((item) => item.id === nextPriority)) {
    throw new Error("Prioridade inválida.")
  }
  return nextPriority
}

function normalizeStatus(status: TaskStatus | undefined) {
  const nextStatus = status ?? "todo"
  if (!TASK_STATUSES.some((item) => item.id === nextStatus)) {
    throw new Error("Status inválido.")
  }
  return nextStatus
}

function normalizeDueDate(dueDate: Date | null | undefined) {
  if (dueDate == null) return null
  if (Number.isNaN(dueDate.getTime())) throw new Error("Prazo inválido.")
  return Timestamp.fromDate(dueDate)
}

function publishCompletion(userId: string, taskId: string, xp: number) {
  publishTaskCompleted({
    type: TASK_COMPLETED,
    version: 1,
    userId,
    taskId,
    xp,
    occurredAt: new Date(),
  })
}

export async function createTask(uid: string, input: CreateTaskInput) {
  const reference = doc(getTaskCollection(uid))
  const status = normalizeStatus(input.status)
  const xp = normalizeXp(input.xp)
  const task: WithFieldValue<TaskDocument> = {
    title: normalizeTitle(input.title),
    description: normalizeOptionalText(
      input.description,
      MAX_TASK_DESCRIPTION_LENGTH,
    ),
    category: normalizeOptionalText(input.category, MAX_TASK_SHORT_TEXT_LENGTH),
    priority: normalizePriority(input.priority),
    status,
    project: normalizeOptionalText(input.project, MAX_TASK_SHORT_TEXT_LENGTH),
    projectId: normalizeProjectId(input.projectId),
    kanbanOrder: normalizeKanbanOrder(input.kanbanOrder),
    dueAt: normalizeDueDate(input.dueDate),
    estimateMinutes: normalizeEstimate(input.estimateMinutes),
    tags: normalizeTags(input.tags),
    xp,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: status === "completed" ? serverTimestamp() : null,
  }

  await setDoc(reference, task)
  if (status === "completed") publishCompletion(uid, reference.id, xp)
  return reference.id
}

interface TaskTransitionResult {
  completed: boolean
  xp: number
}

export async function updateTask(
  uid: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  const result = await runTransaction<TaskTransitionResult>(
    getFirestoreInstance(),
    async (transaction) => {
      const reference = getTaskReference(uid, taskId)
      const snapshot = await transaction.get(reference)
      if (!snapshot.exists()) throw new Error("Tarefa não encontrada.")

      const current = snapshot.data()
      const nextStatus = normalizeStatus(input.status ?? current.status)
      const updates: Record<string, unknown> = {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      }

      if (Object.hasOwn(input, "title")) {
        updates.title = normalizeTitle(input.title ?? "")
      }
      if (Object.hasOwn(input, "description")) {
        updates.description = normalizeOptionalText(
          input.description,
          MAX_TASK_DESCRIPTION_LENGTH,
        )
      }
      if (Object.hasOwn(input, "category")) {
        updates.category = normalizeOptionalText(
          input.category,
          MAX_TASK_SHORT_TEXT_LENGTH,
        )
      }
      if (Object.hasOwn(input, "priority")) {
        updates.priority = normalizePriority(input.priority)
      }
      if (Object.hasOwn(input, "project")) {
        updates.project = normalizeOptionalText(
          input.project,
          MAX_TASK_SHORT_TEXT_LENGTH,
        )
      }
      if (Object.hasOwn(input, "projectId")) {
        updates.projectId = normalizeProjectId(input.projectId)
      }
      if (Object.hasOwn(input, "kanbanOrder")) {
        updates.kanbanOrder = normalizeKanbanOrder(input.kanbanOrder)
      }
      if (Object.hasOwn(input, "dueDate")) {
        updates.dueAt = normalizeDueDate(input.dueDate)
      }
      if (Object.hasOwn(input, "estimateMinutes")) {
        updates.estimateMinutes = normalizeEstimate(input.estimateMinutes)
      }
      if (Object.hasOwn(input, "tags")) {
        updates.tags = normalizeTags(input.tags)
      }
      if (Object.hasOwn(input, "xp")) updates.xp = normalizeXp(input.xp)

      const completed =
        current.status !== "completed" && nextStatus === "completed"
      if (completed) {
        updates.completedAt = serverTimestamp()
      } else if (nextStatus === "completed") {
        updates.completedAt = current.completedAt
      } else if (nextStatus === "archived") {
        updates.completedAt = current.completedAt
      } else {
        updates.completedAt = null
      }

      transaction.update(reference, updates)
      return { completed, xp: input.xp ?? current.xp }
    },
  )

  if (result.completed) publishCompletion(uid, taskId, result.xp)
  return result.completed
}

export function completeTask(uid: string, taskId: string) {
  return updateTask(uid, taskId, { status: "completed" })
}

export function reopenTask(uid: string, taskId: string) {
  return updateTask(uid, taskId, { status: "todo" })
}

export async function deleteTask(uid: string, taskId: string) {
  await deleteDoc(getTaskReference(uid, taskId))
}

export async function duplicateTask(uid: string, taskId: string) {
  const sourceReference = getTaskReference(uid, taskId)
  const duplicateReference = doc(getTaskCollection(uid))

  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const snapshot = await transaction.get(sourceReference)
    if (!snapshot.exists()) throw new Error("Tarefa não encontrada.")
    const source = snapshot.data()
    const suffix = " (cópia)"
    const title = `${source.title.slice(
      0,
      MAX_TASK_TITLE_LENGTH - suffix.length,
    )}${suffix}`

    const duplicate: WithFieldValue<TaskDocument> = {
      ...source,
      title,
      status: "todo",
      kanbanOrder: null,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }
    transaction.set(duplicateReference, duplicate)
  })

  return duplicateReference.id
}

export function subscribeToTasks(
  uid: string,
  onValue: (tasks: Task[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const tasksQuery = query(getTaskCollection(uid), orderBy("updatedAt", "desc"))
  return onSnapshot(
    tasksQuery,
    (snapshot) =>
      onValue(
        snapshot.docs.map((taskSnapshot) => {
          const taskData = taskSnapshot.data({ serverTimestamps: "estimate" })
          return {
            id: taskSnapshot.id,
            ...taskData,
            projectId:
              typeof taskData.projectId === "string"
                ? taskData.projectId
                : null,
            kanbanOrder:
              typeof taskData.kanbanOrder === "number" &&
              Number.isFinite(taskData.kanbanOrder)
                ? taskData.kanbanOrder
                : null,
            tags: Array.isArray(taskData.tags)
              ? taskData.tags.filter(
                  (tag): tag is string => typeof tag === "string",
                )
              : [],
          }
        }),
      ),
    onError,
  )
}
