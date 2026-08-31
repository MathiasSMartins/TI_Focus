import {
  collection,
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
  MAX_PROJECT_CATEGORY_LENGTH,
  MAX_PROJECT_DESCRIPTION_LENGTH,
  MAX_PROJECT_INVESTED_MINUTES,
  MAX_PROJECT_NAME_LENGTH,
  PROJECT_STATUSES,
  type CreateProjectInput,
  type Project,
  type ProjectDocument,
  type ProjectStatus,
  type UpdateProjectInput,
} from "@/features/projects/types/project"
import { firestoreDb } from "@/services/firebase"

function getFirestoreInstance(): Firestore {
  if (!firestoreDb) {
    throw new Error("Firebase não está configurado neste ambiente.")
  }
  return firestoreDb
}

function getProjectCollection(uid: string) {
  return collection(
    getFirestoreInstance(),
    "users",
    uid,
    "projects",
  ) as CollectionReference<ProjectDocument>
}

function getProjectReference(uid: string, projectId: string) {
  return doc(
    getProjectCollection(uid),
    projectId,
  ) as DocumentReference<ProjectDocument>
}

function normalizeName(name: string) {
  const normalized = name.trim()
  if (!normalized) throw new Error("Informe um nome para o projeto.")
  if (normalized.length > MAX_PROJECT_NAME_LENGTH) {
    throw new Error(
      `O nome deve ter até ${MAX_PROJECT_NAME_LENGTH} caracteres.`,
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

function normalizeStatus(status: ProjectStatus | undefined) {
  const normalized = status ?? "planning"
  if (!PROJECT_STATUSES.some((item) => item.id === normalized)) {
    throw new Error("Status de projeto inválido.")
  }
  return normalized
}

function normalizeDueDate(dueDate: Date | null | undefined) {
  if (dueDate == null) return null
  if (Number.isNaN(dueDate.getTime())) throw new Error("Prazo inválido.")
  return Timestamp.fromDate(dueDate)
}

function normalizeInvestedMinutes(value: number | undefined) {
  const normalized = value ?? 0
  if (
    !Number.isInteger(normalized) ||
    normalized < 0 ||
    normalized > MAX_PROJECT_INVESTED_MINUTES
  ) {
    throw new Error("O tempo investido informado é inválido.")
  }
  return normalized
}

export async function createProject(uid: string, input: CreateProjectInput) {
  const reference = doc(getProjectCollection(uid))
  const status = normalizeStatus(input.status)
  const project: WithFieldValue<ProjectDocument> = {
    name: normalizeName(input.name),
    description: normalizeOptionalText(
      input.description,
      MAX_PROJECT_DESCRIPTION_LENGTH,
    ),
    status,
    dueAt: normalizeDueDate(input.dueDate),
    category: normalizeOptionalText(
      input.category,
      MAX_PROJECT_CATEGORY_LENGTH,
    ),
    investedMinutes: normalizeInvestedMinutes(input.investedMinutes),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    archivedAt: status === "archived" ? serverTimestamp() : null,
    deletedAt: null,
  }

  await setDoc(reference, project)
  return reference.id
}

export async function updateProject(
  uid: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const reference = getProjectReference(uid, projectId)
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists()) throw new Error("Projeto não encontrado.")

    const current = snapshot.data()
    if (current.deletedAt) throw new Error("Projeto não encontrado.")
    const nextStatus = normalizeStatus(input.status ?? current.status)
    const updates: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    }

    if (Object.hasOwn(input, "name")) {
      updates.name = normalizeName(input.name ?? "")
    }
    if (Object.hasOwn(input, "description")) {
      updates.description = normalizeOptionalText(
        input.description,
        MAX_PROJECT_DESCRIPTION_LENGTH,
      )
    }
    if (Object.hasOwn(input, "dueDate")) {
      updates.dueAt = normalizeDueDate(input.dueDate)
    }
    if (Object.hasOwn(input, "category")) {
      updates.category = normalizeOptionalText(
        input.category,
        MAX_PROJECT_CATEGORY_LENGTH,
      )
    }
    if (Object.hasOwn(input, "investedMinutes")) {
      updates.investedMinutes = normalizeInvestedMinutes(input.investedMinutes)
    }

    if (nextStatus === "archived") {
      updates.archivedAt =
        current.status === "archived" ? current.archivedAt : serverTimestamp()
    } else {
      updates.archivedAt = null
    }

    transaction.update(reference, updates)
  })
}

export function archiveProject(uid: string, projectId: string) {
  return updateProject(uid, projectId, { status: "archived" })
}

export async function deleteProject(uid: string, projectId: string) {
  await runTransaction(getFirestoreInstance(), async (transaction) => {
    const reference = getProjectReference(uid, projectId)
    const snapshot = await transaction.get(reference)
    if (!snapshot.exists() || snapshot.data().deletedAt) {
      throw new Error("Projeto não encontrado.")
    }

    const current = snapshot.data()
    transaction.update(reference, {
      status: "archived",
      archivedAt:
        current.status === "archived" ? current.archivedAt : serverTimestamp(),
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  })
}

export function subscribeToProjects(
  uid: string,
  onValue: (projects: Project[]) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  const projectsQuery = query(
    getProjectCollection(uid),
    orderBy("updatedAt", "desc"),
  )
  return onSnapshot(
    projectsQuery,
    (snapshot) =>
      onValue(
        snapshot.docs
          .map((projectSnapshot) => ({
            id: projectSnapshot.id,
            ...projectSnapshot.data({ serverTimestamps: "estimate" }),
          }))
          .filter((project) => project.deletedAt == null),
      ),
    onError,
  )
}
