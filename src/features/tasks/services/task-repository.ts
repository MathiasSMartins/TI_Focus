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

import { isITAreaId, type ITAreaId } from "@/config/it-area-config"
import { getTaskXpReward, type XpAwardResult } from "@/features/gamification"
import {
  applyPreparedXpAward,
  prepareTaskXpAward,
  runWithXpServerTime,
} from "@/features/gamification/services/xp-repository"
import type { UserProfile } from "@/features/profile/types/user-profile"
import {
  publishTaskCompleted,
  TASK_COMPLETED,
} from "@/features/tasks/events/task-events"
import {
  MAX_TASK_DESCRIPTION_LENGTH,
  MAX_TASK_ESTIMATE_MINUTES,
  MAX_TASK_KANBAN_ORDER,
  MAX_TASK_PROJECT_ID_LENGTH,
  MAX_TASK_SHORT_TEXT_LENGTH,
  MAX_TASK_TAG_LENGTH,
  MAX_TASK_TAGS,
  MAX_TASK_TITLE_LENGTH,
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

function getProfileReference(uid: string) {
  return doc(
    getFirestoreInstance(),
    "users",
    uid,
  ) as DocumentReference<UserProfile>
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

function normalizeAreaId(value: ITAreaId | null | undefined) {
  if (value == null) return null
  if (!isITAreaId(value)) throw new Error("Área de TI inválida.")
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

function publishCompletion(
  userId: string,
  taskId: string,
  award: XpAwardResult,
) {
  publishTaskCompleted({
    type: TASK_COMPLETED,
    version: 1,
    userId,
    taskId,
    xp: award.amount,
    occurredAt: new Date(),
    levelBefore: award.levelBefore,
    levelAfter: award.levelAfter,
    dailyLimitReached: award.dailyLimitReached,
    transactionId: award.transactionId,
    alreadyProcessed: award.alreadyProcessed,
  })
}

export async function createTask(uid: string, input: CreateTaskInput) {
  const reference = doc(getTaskCollection(uid))
  const status = normalizeStatus(input.status)
  const priority = normalizePriority(input.priority)
  const title = normalizeTitle(input.title)
  const areaId = normalizeAreaId(input.areaId)
  const xp = getTaskXpReward(priority)
  const task: WithFieldValue<TaskDocument> = {
    title,
    description: normalizeOptionalText(
      input.description,
      MAX_TASK_DESCRIPTION_LENGTH,
    ),
    category: normalizeOptionalText(input.category, MAX_TASK_SHORT_TEXT_LENGTH),
    areaId,
    priority,
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

  if (status !== "completed") {
    await setDoc(reference, task)
    return reference.id
  }

  const award = await runWithXpServerTime(uid, (serverNow) =>
    runTransaction<XpAwardResult>(
      getFirestoreInstance(),
      async (transaction) => {
        const preparedAward = await prepareTaskXpAward(
          transaction,
          uid,
          reference.id,
          title,
          priority,
          areaId,
          serverNow,
        )
        transaction.set(reference, task)
        applyPreparedXpAward(transaction, preparedAward)
        return preparedAward.result
      },
    ),
  )
  publishCompletion(uid, reference.id, award)
  return reference.id
}

interface TaskTransitionResult {
  completed: boolean
  award: XpAwardResult | null
}

export async function updateTask(
  uid: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  const executeUpdate = (serverNow: Timestamp | null) =>
    runTransaction<TaskTransitionResult>(
      getFirestoreInstance(),
      async (transaction) => {
        const reference = getTaskReference(uid, taskId)
        const snapshot = await transaction.get(reference)
        if (!snapshot.exists()) throw new Error("Tarefa não encontrada.")

        const current = snapshot.data()
        const nextStatus = normalizeStatus(input.status ?? current.status)
        const nextPriority = normalizePriority(
          input.priority ?? current.priority,
        )
        const effectiveAreaId = Object.hasOwn(input, "areaId")
          ? normalizeAreaId(input.areaId)
          : isITAreaId(current.areaId)
            ? current.areaId
            : null
        const updates: Record<string, unknown> = {
          priority: nextPriority,
          xp: getTaskXpReward(nextPriority),
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
        if (Object.hasOwn(input, "areaId")) {
          updates.areaId = effectiveAreaId
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

        let award: XpAwardResult | null = null
        let preparedAward: Awaited<
          ReturnType<typeof prepareTaskXpAward>
        > | null = null
        if (completed) {
          if (!serverNow) {
            throw new Error("Relógio de XP não sincronizado.")
          }
          preparedAward = await prepareTaskXpAward(
            transaction,
            uid,
            taskId,
            typeof updates.title === "string" ? updates.title : current.title,
            nextPriority,
            effectiveAreaId,
            serverNow,
          )
          award = preparedAward.result
        }

        transaction.update(reference, updates)
        if (preparedAward) applyPreparedXpAward(transaction, preparedAward)
        return { completed, award }
      },
    )

  const result =
    input.status === "completed"
      ? await runWithXpServerTime(uid, executeUpdate)
      : await executeUpdate(null)

  if (result.completed && result.award) {
    publishCompletion(uid, taskId, result.award)
  }
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
  const profileReference = getProfileReference(uid)
  const duplicateReference = doc(getTaskCollection(uid))

  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const [sourceSnapshot, profileSnapshot] = await Promise.all([
      transaction.get(sourceReference),
      transaction.get(profileReference),
    ])
    if (!sourceSnapshot.exists()) throw new Error("Tarefa não encontrada.")
    if (!profileSnapshot.exists()) throw new Error("Perfil não encontrado.")

    const source = sourceSnapshot.data()
    const primaryArea = profileSnapshot.data().primaryArea
    const suffix = " (cópia)"
    const title = `${source.title.slice(
      0,
      MAX_TASK_TITLE_LENGTH - suffix.length,
    )}${suffix}`

    const duplicate: WithFieldValue<TaskDocument> = {
      ...source,
      title,
      areaId: isITAreaId(primaryArea) ? primaryArea : null,
      status: "todo",
      kanbanOrder: null,
      xp: getTaskXpReward(source.priority),
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
            xp: getTaskXpReward(taskData.priority),
            areaId: isITAreaId(taskData.areaId) ? taskData.areaId : null,
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
