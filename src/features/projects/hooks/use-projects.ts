import { useCallback, useEffect, useState } from "react"

import {
  archiveProject as archiveProjectInRepository,
  createProject as createProjectInRepository,
  deleteProject as deleteProjectInRepository,
  subscribeToProjects,
  updateProject as updateProjectInRepository,
} from "@/features/projects/services/project-repository"
import type {
  CreateProjectInput,
  Project,
  UpdateProjectInput,
} from "@/features/projects/types/project"

function getProjectErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Não foi possível concluir a operação. Tente novamente."
}

interface ProjectSnapshotState {
  uid: string
  projects: Project[]
  error: string | null
}

interface ProjectActionState {
  uid: string
  pendingActions: number
  error: string | null
}

export function useProjects(uid: string | undefined) {
  const [snapshotState, setSnapshotState] =
    useState<ProjectSnapshotState | null>(null)
  const [actionState, setActionState] = useState<ProjectActionState | null>(
    null,
  )

  useEffect(() => {
    if (!uid) return
    let active = true

    const unsubscribe = subscribeToProjects(
      uid,
      (projects) => {
        if (!active) return
        setSnapshotState({ uid, projects, error: null })
      },
      (error) => {
        if (!active) return
        setSnapshotState({
          uid,
          projects: [],
          error: getProjectErrorMessage(error),
        })
      },
    )

    return () => {
      active = false
      unsubscribe()
    }
  }, [uid])

  const runAction = useCallback(
    async (actionUid: string, action: () => Promise<unknown>) => {
      setActionState((current) => ({
        uid: actionUid,
        pendingActions:
          current?.uid === actionUid ? current.pendingActions + 1 : 1,
        error: null,
      }))
      try {
        await action()
        return true
      } catch (error) {
        setActionState((current) =>
          current?.uid === actionUid
            ? { ...current, error: getProjectErrorMessage(error) }
            : current,
        )
        return false
      } finally {
        setActionState((current) =>
          current?.uid === actionUid
            ? {
                ...current,
                pendingActions: Math.max(0, current.pendingActions - 1),
              }
            : current,
        )
      }
    },
    [],
  )

  const createProject = useCallback(
    (input: CreateProjectInput) =>
      uid ? runAction(uid, () => createProjectInRepository(uid, input)) : false,
    [runAction, uid],
  )

  const updateProject = useCallback(
    (projectId: string, input: UpdateProjectInput) =>
      uid
        ? runAction(uid, () => updateProjectInRepository(uid, projectId, input))
        : false,
    [runAction, uid],
  )

  const archiveProject = useCallback(
    (projectId: string) =>
      uid
        ? runAction(uid, () => archiveProjectInRepository(uid, projectId))
        : false,
    [runAction, uid],
  )

  const deleteProject = useCallback(
    (projectId: string) =>
      uid
        ? runAction(uid, () => deleteProjectInRepository(uid, projectId))
        : false,
    [runAction, uid],
  )

  const currentSnapshot = snapshotState?.uid === uid ? snapshotState : null
  const currentActionState = actionState?.uid === uid ? actionState : null
  const clearError = useCallback(() => {
    setActionState((current) =>
      current && current.uid === uid ? { ...current, error: null } : current,
    )
    setSnapshotState((current) =>
      current && current.uid === uid ? { ...current, error: null } : current,
    )
  }, [uid])

  return {
    projects: currentSnapshot?.projects ?? [],
    isLoading: Boolean(uid) && currentSnapshot === null,
    isMutating: (currentActionState?.pendingActions ?? 0) > 0,
    error: currentActionState?.error ?? currentSnapshot?.error ?? null,
    clearError,
    createProject,
    updateProject,
    archiveProject,
    deleteProject,
  }
}
