import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  collectionReference: { kind: "task-collection" },
  duplicateReference: { id: "duplicate-1", kind: "duplicate" },
  profileReference: { kind: "profile" },
  sourceReference: { kind: "source" },
  source: {
    title: "Tarefa histórica",
    description: null,
    category: "Feature",
    areaId: "software-development",
    priority: "medium",
    status: "completed",
    project: null,
    projectId: null,
    kanbanOrder: 100,
    dueAt: null,
    estimateMinutes: 30,
    tags: [],
    xp: 40,
    createdAt: { previous: true },
    updatedAt: { previous: true },
    completedAt: { previous: true },
  },
  profile: { primaryArea: "cloud" as string | null },
  get: vi.fn(),
  set: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => mocks.collectionReference),
  deleteDoc: vi.fn(),
  doc: vi.fn((...parts: unknown[]) => {
    if (parts.length === 1) return mocks.duplicateReference
    if (parts.length === 2) return mocks.sourceReference
    return mocks.profileReference
  }),
  onSnapshot: vi.fn(),
  orderBy: vi.fn(),
  query: vi.fn(),
  runTransaction: vi.fn(
    async (
      _database: unknown,
      callback: (transaction: {
        get: typeof mocks.get
        set: typeof mocks.set
      }) => Promise<unknown>,
    ) => callback({ get: mocks.get, set: mocks.set }),
  ),
  serverTimestamp: vi.fn(() => ({ serverTimestamp: true })),
  setDoc: vi.fn(),
  Timestamp: class Timestamp {},
}))

vi.mock("@/services/firebase", () => ({ firestoreDb: { configured: true } }))
vi.mock("@/features/gamification", () => ({
  getTaskXpReward: vi.fn(() => 40),
}))
vi.mock("@/features/gamification/services/xp-repository", () => ({
  applyPreparedXpAward: vi.fn(),
  prepareTaskXpAward: vi.fn(),
  runWithXpServerTime: vi.fn(),
}))
vi.mock("@/features/tasks/events/task-events", () => ({
  publishTaskCompleted: vi.fn(),
  TASK_COMPLETED: "TASK_COMPLETED",
}))

import { duplicateTask } from "@/features/tasks/services/task-repository"

describe("duplicateTask", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.profile.primaryArea = "cloud"
    mocks.get.mockImplementation(async (reference: { kind: string }) => {
      if (reference.kind === "source") {
        return { exists: () => true, data: () => mocks.source }
      }
      return { exists: () => true, data: () => mocks.profile }
    })
  })

  it("usa a área principal atual na cópia sem alterar a tarefa histórica", async () => {
    await expect(duplicateTask("alice", "task-1")).resolves.toBe("duplicate-1")

    expect(mocks.get).toHaveBeenCalledTimes(2)
    expect(mocks.get).toHaveBeenCalledWith(mocks.sourceReference)
    expect(mocks.get).toHaveBeenCalledWith(mocks.profileReference)
    expect(mocks.set).toHaveBeenCalledWith(
      mocks.duplicateReference,
      expect.objectContaining({
        title: "Tarefa histórica (cópia)",
        areaId: "cloud",
        status: "todo",
        kanbanOrder: null,
        completedAt: null,
      }),
    )
    expect(mocks.source.areaId).toBe("software-development")
  })

  it("mantém a nova tarefa sem área quando o perfil não possui área válida", async () => {
    mocks.profile.primaryArea = null

    await duplicateTask("alice", "task-1")

    expect(mocks.set).toHaveBeenCalledWith(
      mocks.duplicateReference,
      expect.objectContaining({ areaId: null }),
    )
  })
})
