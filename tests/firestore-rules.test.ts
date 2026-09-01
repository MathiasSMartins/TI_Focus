import { readFileSync } from "node:fs"

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing"
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDoc,
  getDocs,
  runTransaction,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  type Firestore,
} from "firebase/firestore"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

import {
  IT_AREA_CONFIG,
  IT_AREA_IDS,
  type ITAreaId,
} from "../src/config/it-area-config"

const PROJECT_ID = "ti-focus-test"
const FIRESTORE_RULES = readFileSync(
  new URL("../firestore.rules", import.meta.url),
  "utf8",
)
const CONFIGURED_AREA_IDS = Object.keys(IT_AREA_CONFIG) as ITAreaId[]
let testEnvironment: RulesTestEnvironment

function validProfile(uid: string, email: string) {
  return {
    uid,
    name: "Usuário de Teste",
    email,
    avatar: null,
    primaryArea: null,
    secondaryAreas: [],
    primaryObjective: null,
    dailyTaskGoal: null,
    level: 1,
    xp: 0,
    lastXpTransactionId: null,
    xpWindowStartedAt: null,
    xpWindowAmount: 0,
    streak: 0,
    settings: {
      timezone: "America/Sao_Paulo",
      locale: "pt-BR",
      pomodoro: {
        focusMinutes: 25,
        shortBreakMinutes: 5,
        longBreakMinutes: 15,
        cyclesBeforeLongBreak: 4,
      },
      notifications: { inApp: true, push: false },
    },
    onboardingCompleted: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }
}

function validTask() {
  return {
    title: "Implementar sistema de tarefas",
    description: null,
    category: null,
    priority: "medium",
    status: "todo",
    project: null,
    dueAt: null,
    estimateMinutes: null,
    tags: [],
    xp: 40,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  }
}

async function completeTaskWithXp(
  database: Firestore,
  userId: string,
  taskId: string,
) {
  const profileReference = doc(database, "users", userId)
  const taskReference = doc(database, "users", userId, "tasks", taskId)
  const xpReference = doc(database, "users", userId, "xpTransactions", taskId)

  await runTransaction(database, async (transaction) => {
    const taskSnapshot = await transaction.get(taskReference)
    const profileSnapshot = await transaction.get(profileReference)
    const task = taskSnapshot.data()
    const profile = profileSnapshot.data()
    if (!task || !profile) throw new Error("Fixtures ausentes")

    const reward =
      task.priority === "low"
        ? 20
        : task.priority === "medium"
          ? 40
          : task.priority === "high"
            ? 75
            : 120
    const xpAfter = profile.xp + reward

    transaction.update(taskReference, {
      status: "completed",
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    transaction.update(profileReference, {
      xp: xpAfter,
      level: 1,
      lastXpTransactionId: taskId,
      xpWindowStartedAt: profile.xpWindowStartedAt ?? serverTimestamp(),
      xpWindowAmount:
        profile.xpWindowStartedAt === null
          ? reward
          : profile.xpWindowAmount + reward,
      updatedAt: serverTimestamp(),
    })
    transaction.set(xpReference, {
      userId,
      amount: reward,
      reason: "Conclusão de tarefa",
      eventType: "TASK_COMPLETED",
      taskId,
      taskTitle: task.title,
      ...(typeof task.areaId === "string" ? { areaId: task.areaId } : {}),
      createdAt: serverTimestamp(),
      xpBefore: profile.xp,
      xpAfter,
      levelBefore: profile.level,
      levelAfter: 1,
    })
  })
}

async function completeGoalProgressWithTask(
  database: Firestore,
  userId: string,
  progressId: string,
  taskId: string,
) {
  const profileReference = doc(database, "users", userId)
  const progressReference = doc(
    database,
    "users",
    userId,
    "goalProgress",
    progressId,
  )
  const sourceReference = doc(
    database,
    "users",
    userId,
    "xpTransactions",
    taskId,
  )
  const evidenceId = `weekly__TASK_COMPLETED__${taskId}`
  const evidenceReference = doc(
    database,
    "users",
    userId,
    "goalEvidence",
    evidenceId,
  )

  return runTransaction(database, async (transaction) => {
    const [profileSnapshot, progressSnapshot, sourceSnapshot] =
      await Promise.all([
        transaction.get(profileReference),
        transaction.get(progressReference),
        transaction.get(sourceReference),
      ])
    const profile = profileSnapshot.data()
    const progress = progressSnapshot.data()
    const source = sourceSnapshot.data()
    if (!profile || !progress || !source) {
      throw new Error("Fixtures de meta ausentes")
    }

    const completionId = `weekly__${progress.periodKey}`
    const completionReference = doc(
      database,
      "users",
      userId,
      "goalCompletions",
      completionId,
    )
    const goalXpReference = doc(
      database,
      "users",
      userId,
      "xpTransactions",
      `goal__${completionId}`,
    )
    const completionSnapshot = await transaction.get(completionReference)

    transaction.update(progressReference, {
      current: progress.current + 1,
      completed: true,
      completedAt: serverTimestamp(),
      lastEvidenceId: evidenceId,
      updatedAt: serverTimestamp(),
    })
    transaction.set(evidenceReference, {
      progressId,
      sourceType: "TASK_COMPLETED",
      sourceId: taskId,
      metric: "tasksCompleted",
      delta: 1,
      occurredAt: source.createdAt,
      recordedAt: serverTimestamp(),
    })

    if (!completionSnapshot.exists()) {
      const xpAfter = profile.xp + 100
      transaction.set(completionReference, {
        progressId,
        cadence: "weekly",
        periodKey: progress.periodKey,
        metric: "tasksCompleted",
        target: 1,
        finalValue: 1,
        rewardXp: 100,
        completedAt: serverTimestamp(),
      })
      transaction.set(goalXpReference, {
        userId,
        amount: 100,
        reason: "Meta concluída",
        eventType: "GOAL_COMPLETED",
        progressId,
        cadence: "weekly",
        createdAt: serverTimestamp(),
        xpBefore: profile.xp,
        xpAfter,
        levelBefore: profile.level,
        levelAfter: 1,
      })
      transaction.update(profileReference, {
        xp: xpAfter,
        level: 1,
        lastXpTransactionId: `goal__${completionId}`,
        xpWindowStartedAt: profile.xpWindowStartedAt,
        xpWindowAmount: profile.xpWindowAmount + 100,
        updatedAt: serverTimestamp(),
      })
    }
  })
}

async function createAreaStats(
  database: Firestore,
  userId: string,
  areaId: ITAreaId,
) {
  return setDoc(
    doc(database, "users", userId, "achievementAreaStats", areaId),
    {
      areaId,
      tasksCompleted: 0,
      lastEvidenceId: null,
      updatedAt: serverTimestamp(),
    },
  )
}

async function recordAreaTaskEvidence(
  database: Firestore,
  userId: string,
  statsAreaId: ITAreaId,
  taskId: string,
  options: { evidenceAreaId?: ITAreaId; increment?: number } = {},
) {
  const evidenceAreaId = options.evidenceAreaId ?? statsAreaId
  const evidenceId = `area_task_completed__${taskId}`
  const statsReference = doc(
    database,
    "users",
    userId,
    "achievementAreaStats",
    statsAreaId,
  )
  const evidenceReference = doc(
    database,
    "users",
    userId,
    "achievementAreaEvidence",
    evidenceId,
  )
  const xpReference = doc(database, "users", userId, "xpTransactions", taskId)

  return runTransaction(database, async (transaction) => {
    const [statsSnapshot, xpSnapshot] = await Promise.all([
      transaction.get(statsReference),
      transaction.get(xpReference),
    ])
    const stats = statsSnapshot.data()
    const source = xpSnapshot.data()
    if (!stats || !source) throw new Error("Fixtures de área ausentes")

    transaction.update(statsReference, {
      tasksCompleted: stats.tasksCompleted + (options.increment ?? 1),
      lastEvidenceId: evidenceId,
      updatedAt: serverTimestamp(),
    })
    transaction.set(evidenceReference, {
      areaId: evidenceAreaId,
      metric: "areaTasksCompleted",
      sourceType: "TASK_COMPLETED",
      sourceId: taskId,
      occurredAt: source.createdAt,
      recordedAt: serverTimestamp(),
    })
  })
}

async function attemptAreaAchievementUnlock(
  database: Firestore,
  userId: string,
  areaId: ITAreaId,
  rewardXp: number,
) {
  const definition = IT_AREA_CONFIG[areaId].achievement
  const transactionId = `achievement__${definition.id}`
  const profileReference = doc(database, "users", userId)
  const unlockReference = doc(
    database,
    "users",
    userId,
    "achievements",
    definition.id,
  )
  const xpReference = doc(
    database,
    "users",
    userId,
    "xpTransactions",
    transactionId,
  )
  const statsReference = doc(
    database,
    "users",
    userId,
    "achievementAreaStats",
    areaId,
  )

  return runTransaction(database, async (transaction) => {
    const [profileSnapshot, statsSnapshot] = await Promise.all([
      transaction.get(profileReference),
      transaction.get(statsReference),
    ])
    const profile = profileSnapshot.data()
    const stats = statsSnapshot.data()
    if (!profile || !stats) throw new Error("Fixtures de unlock ausentes")

    const amount = definition.rewardXp
    const xpAfter = profile.xp + amount
    transaction.update(profileReference, {
      xp: xpAfter,
      level: 1,
      lastXpTransactionId: transactionId,
      xpWindowStartedAt: serverTimestamp(),
      xpWindowAmount: amount,
      updatedAt: serverTimestamp(),
    })
    transaction.set(unlockReference, {
      achievementId: definition.id,
      unlockedAt: serverTimestamp(),
      progressValue: stats.tasksCompleted,
      rewardXp,
      awardedXp: amount,
      triggerEvidenceId: stats.lastEvidenceId,
      definitionVersion: 2,
    })
    transaction.set(xpReference, {
      userId,
      amount,
      reason: "Conquista desbloqueada",
      eventType: "ACHIEVEMENT_UNLOCKED",
      achievementId: definition.id,
      achievementName: definition.name,
      createdAt: serverTimestamp(),
      xpBefore: profile.xp,
      xpAfter,
      levelBefore: profile.level,
      levelAfter: 1,
    })
  })
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: FIRESTORE_RULES,
    },
  })
})

afterEach(async () => {
  await testEnvironment.clearFirestore()
})

afterAll(async () => {
  await testEnvironment.cleanup()
})

describe("Firestore user ownership rules", () => {
  it("mantém paridade do contrato de áreas e conquistas entre Rules e config", () => {
    const areaFunction = FIRESTORE_RULES.match(
      /function isValidArea\(area\) \{([\s\S]*?)\n\s{4}\}/,
    )?.[1]
    const ruleAreaIds = [
      ...(areaFunction?.matchAll(/area == '([^']+)'/g) ?? []),
    ].map((match) => match[1])

    expect(new Set(ruleAreaIds)).toEqual(new Set(IT_AREA_IDS))
    expect(ruleAreaIds).toHaveLength(IT_AREA_IDS.length)
    expect(CONFIGURED_AREA_IDS).toEqual([...IT_AREA_IDS])

    for (const areaId of IT_AREA_IDS) {
      const achievement = IT_AREA_CONFIG[areaId].achievement
      expect(achievement.id).toBe(`area-${areaId}-specialist`)
      expect(achievement.target).toBe(5)
      expect(achievement.rewardXp).toBe(75)
      expect(FIRESTORE_RULES).toContain(`'${areaId}'`)
      expect(FIRESTORE_RULES).toContain(`'${achievement.id}'`)
      expect(FIRESTORE_RULES).toContain(`'${achievement.name}'`)
    }

    expect(FIRESTORE_RULES).toMatch(
      /function achievementTarget[\s\S]*?isAreaAchievement\(achievementId\) \? 5/,
    )
    expect(FIRESTORE_RULES).toMatch(
      /function achievementXp[\s\S]*?isAreaAchievement\(achievementId\) \? 75/,
    )
    expect(FIRESTORE_RULES).toMatch(
      /function achievementDefinitionVersion[\s\S]*?isAreaAchievement\(achievementId\) \? 2/,
    )
  })

  it("nega leitura e criação sem autenticação", async () => {
    const database = testEnvironment.unauthenticatedContext().firestore()

    await assertFails(getDoc(doc(database, "users", "alice")))
    await assertFails(
      setDoc(
        doc(database, "users", "alice"),
        validProfile("alice", "alice@example.com"),
      ),
    )
  })

  it("permite criar e ler o próprio perfil com defaults seguros", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice")

    await assertSucceeds(
      setDoc(reference, validProfile("alice", "alice@example.com")),
    )
    await assertSucceeds(getDoc(reference))
  })

  it("nega acesso ao perfil de outro usuário e consultas à coleção", async () => {
    const aliceDb = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const bobDb = testEnvironment
      .authenticatedContext("bob", { email: "bob@example.com" })
      .firestore()

    await assertSucceeds(
      setDoc(
        doc(aliceDb, "users", "alice"),
        validProfile("alice", "alice@example.com"),
      ),
    )
    await assertFails(getDoc(doc(bobDb, "users", "alice")))
    await assertFails(getDocs(collection(aliceDb, "users")))
  })

  it("permite concluir onboarding sem alterar progressão protegida", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice")

    await assertSucceeds(
      setDoc(reference, validProfile("alice", "alice@example.com")),
    )
    await assertSucceeds(
      updateDoc(reference, {
        avatar: "preset:emerald",
        primaryArea: "software-development",
        secondaryAreas: ["cloud"],
        primaryObjective: "improve-focus",
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it("nega alteração de XP, nível, streak e createdAt pelo cliente", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice")

    await assertSucceeds(
      setDoc(reference, validProfile("alice", "alice@example.com")),
    )
    await assertFails(
      updateDoc(reference, { xp: 9999, updatedAt: serverTimestamp() }),
    )
    await assertFails(
      updateDoc(reference, { level: 99, updatedAt: serverTimestamp() }),
    )
    await assertFails(
      updateDoc(reference, { streak: 365, updatedAt: serverTimestamp() }),
    )
    await assertFails(
      updateDoc(reference, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it("nega campos inesperados, uid divergente e exclusão", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice")

    await assertFails(
      setDoc(reference, {
        ...validProfile("bob", "alice@example.com"),
        admin: true,
      }),
    )
    await assertSucceeds(
      setDoc(reference, validProfile("alice", "alice@example.com")),
    )
    await assertFails(deleteDoc(reference))
  })

  it("nega áreas, configurações e regressão de onboarding inválidas", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice")

    await assertSucceeds(
      setDoc(reference, validProfile("alice", "alice@example.com")),
    )
    await assertFails(
      updateDoc(reference, {
        name: "A",
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        name: "   ",
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        primaryArea: "invalid-area",
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        settings: { timezone: "UTC" },
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        primaryObjective: "invalid-objective",
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        dailyTaskGoal: 51,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        primaryArea: "software-development",
        secondaryAreas: ["cloud", "cloud"],
        primaryObjective: "all",
        dailyTaskGoal: 5,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        primaryArea: "software-development",
        secondaryAreas: ["software-development"],
        primaryObjective: "all",
        dailyTaskGoal: 5,
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        primaryArea: "software-development",
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(reference, {
        primaryArea: "software-development",
        primaryObjective: "all",
        onboardingCompleted: true,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        onboardingCompleted: false,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it("permite migrar perfil legado concluído sem reabrir onboarding", async () => {
    const legacyProfile: Record<string, unknown> = validProfile(
      "alice",
      "alice@example.com",
    )
    delete legacyProfile.primaryObjective
    delete legacyProfile.dailyTaskGoal
    legacyProfile.primaryArea = "software-development"
    legacyProfile.onboardingCompleted = true

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users", "alice"), legacyProfile)
    })

    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice")

    await assertSucceeds(
      updateDoc(reference, {
        primaryObjective: null,
        dailyTaskGoal: null,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, { xp: 100, updatedAt: serverTimestamp() }),
    )
  })

  it("mantém coleções não declaradas fechadas", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()

    await assertFails(
      setDoc(doc(database, "admin", "config"), { enabled: true }),
    )
  })
})

describe("Firestore goal progress rules", () => {
  it("aceita IDs legados e V2 por timezone e rejeita formato V2 inválido", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    await assertSucceeds(
      setDoc(doc(database, "users", "alice"), {
        ...validProfile("alice", "alice@example.com"),
        primaryArea: "software-development",
      }),
    )
    await assertSucceeds(
      setDoc(doc(database, "users", "alice", "goals", "weekly"), {
        userId: "alice",
        cadence: "weekly",
        metric: "tasksCompleted",
        target: 1,
        rewardXp: 100,
        active: true,
        effectiveFromPeriodKey: "2026-W35",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )

    const startsAt = Timestamp.fromDate(new Date("2026-01-01T00:00:00.000Z"))
    const endsAt = Timestamp.fromDate(new Date("2026-12-31T23:59:59.999Z"))
    const progress = {
      userId: "alice",
      cadence: "weekly",
      periodKey: "2026-W35",
      timezone: "America/Sao_Paulo",
      periodStartsAt: startsAt,
      periodEndsAt: endsAt,
      eligibleFrom: startsAt,
      metric: "tasksCompleted",
      target: 1,
      rewardXp: 100,
      current: 0,
      completed: false,
      completedAt: null,
      lastEvidenceId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    await assertSucceeds(
      setDoc(
        doc(database, "users", "alice", "goalProgress", "weekly__2026-W35"),
        progress,
      ),
    )
    await assertSucceeds(
      setDoc(
        doc(
          database,
          "users",
          "alice",
          "goalProgress",
          "weekly__2026-W35__v2__1787530800000__1788135600000__America~Sao_Paulo",
        ),
        progress,
      ),
    )
    await assertFails(
      setDoc(
        doc(
          database,
          "users",
          "alice",
          "goalProgress",
          "weekly__2026-W35__v2__1787530800000__1788135600000__timezone!invalido",
        ),
        progress,
      ),
    )

    const legacyProgressId = "weekly__2026-W35"
    const scopedProgressId =
      "weekly__2026-W35__v2__1787530800000__1788135600000__America~Sao_Paulo"
    await assertSucceeds(
      setDoc(doc(database, "users", "alice", "tasks", "goal-task-1"), {
        ...validTask(),
        areaId: "software-development",
      }),
    )
    await assertSucceeds(completeTaskWithXp(database, "alice", "goal-task-1"))
    await assertSucceeds(
      completeGoalProgressWithTask(
        database,
        "alice",
        legacyProgressId,
        "goal-task-1",
      ),
    )

    await assertSucceeds(
      setDoc(doc(database, "users", "alice", "tasks", "goal-task-2"), {
        ...validTask(),
        areaId: "software-development",
      }),
    )
    await assertSucceeds(completeTaskWithXp(database, "alice", "goal-task-2"))
    await assertSucceeds(
      completeGoalProgressWithTask(
        database,
        "alice",
        scopedProgressId,
        "goal-task-2",
      ),
    )

    const canonicalCompletion = await getDoc(
      doc(database, "users", "alice", "goalCompletions", "weekly__2026-W35"),
    )
    const canonicalXp = await getDoc(
      doc(
        database,
        "users",
        "alice",
        "xpTransactions",
        "goal__weekly__2026-W35",
      ),
    )
    expect(canonicalCompletion.data()?.progressId).toBe(legacyProgressId)
    expect(canonicalXp.data()?.progressId).toBe(legacyProgressId)
    expect(
      (
        await getDoc(
          doc(
            database,
            "users",
            "alice",
            "xpTransactions",
            `goal__${scopedProgressId}`,
          ),
        )
      ).exists(),
    ).toBe(false)
    expect((await getDoc(doc(database, "users", "alice"))).data()?.xp).toBe(180)
  })
})

describe("Firestore task ownership rules", () => {
  it("permite ao proprietário criar, listar, editar, concluir, reabrir e excluir", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice", "tasks", "task-1")

    await assertSucceeds(
      setDoc(
        doc(database, "users", "alice"),
        validProfile("alice", "alice@example.com"),
      ),
    )
    await assertSucceeds(setDoc(reference, validTask()))
    await assertSucceeds(getDoc(reference))
    await assertSucceeds(
      getDocs(collection(database, "users", "alice", "tasks")),
    )
    await assertSucceeds(
      updateDoc(reference, {
        title: "Sistema de tarefas completo",
        priority: "high",
        xp: 75,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(completeTaskWithXp(database, "alice", "task-1"))

    const completedSnapshot = await getDoc(reference)
    expect(completedSnapshot.data()?.status).toBe("completed")
    expect(completedSnapshot.data()?.completedAt).toBeTruthy()

    await assertSucceeds(
      updateDoc(reference, {
        status: "todo",
        completedAt: null,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(deleteDoc(reference))
    expect((await getDoc(reference)).exists()).toBe(false)
  })

  it("aceita área ausente ou nula na criação e exige a área principal quando informada", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const profile = {
      ...validProfile("alice", "alice@example.com"),
      primaryArea: "software-development",
      secondaryAreas: ["cloud"],
    }

    await assertSucceeds(setDoc(doc(database, "users", "alice"), profile))
    await assertSucceeds(
      setDoc(
        doc(database, "users", "alice", "tasks", "without-area"),
        validTask(),
      ),
    )
    await assertSucceeds(
      setDoc(doc(database, "users", "alice", "tasks", "null-area"), {
        ...validTask(),
        areaId: null,
      }),
    )
    await assertSucceeds(
      setDoc(doc(database, "users", "alice", "tasks", "primary-area"), {
        ...validTask(),
        areaId: "software-development",
      }),
    )
    await assertFails(
      setDoc(doc(database, "users", "alice", "tasks", "secondary-area"), {
        ...validTask(),
        areaId: "cloud",
      }),
    )
    await assertFails(
      setDoc(doc(database, "users", "alice", "tasks", "invalid-area"), {
        ...validTask(),
        areaId: "not-in-config",
      }),
    )
  })

  it("faz novas cópias adotarem a área principal após uma troca de perfil", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const profileReference = doc(database, "users", "alice")

    await assertSucceeds(
      setDoc(profileReference, {
        ...validProfile("alice", "alice@example.com"),
        primaryArea: "software-development",
        secondaryAreas: ["cloud"],
      }),
    )
    await assertSucceeds(
      setDoc(doc(database, "users", "alice", "tasks", "historical"), {
        ...validTask(),
        areaId: "software-development",
      }),
    )
    await assertSucceeds(
      updateDoc(profileReference, {
        primaryArea: "cloud",
        secondaryAreas: ["software-development"],
        updatedAt: serverTimestamp(),
      }),
    )

    await assertFails(
      setDoc(doc(database, "users", "alice", "tasks", "stale-copy"), {
        ...validTask(),
        areaId: "software-development",
      }),
    )
    await assertSucceeds(
      setDoc(doc(database, "users", "alice", "tasks", "current-copy"), {
        ...validTask(),
        areaId: "cloud",
      }),
    )

    expect(
      (
        await getDoc(doc(database, "users", "alice", "tasks", "historical"))
      ).data()?.areaId,
    ).toBe("software-development")
  })

  it("preserva a equivalência semântica de areaId em toda atualização", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    await assertSucceeds(
      setDoc(doc(database, "users", "alice"), {
        ...validProfile("alice", "alice@example.com"),
        primaryArea: "software-development",
      }),
    )

    const unassigned = doc(database, "users", "alice", "tasks", "unassigned")
    const assigned = doc(database, "users", "alice", "tasks", "assigned")
    await assertSucceeds(setDoc(unassigned, validTask()))
    await assertSucceeds(
      setDoc(assigned, {
        ...validTask(),
        areaId: "software-development",
      }),
    )

    await assertSucceeds(
      updateDoc(unassigned, {
        areaId: null,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(unassigned, {
        areaId: deleteField(),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(unassigned, {
        areaId: "software-development",
        updatedAt: serverTimestamp(),
      }),
    )

    await assertSucceeds(
      updateDoc(assigned, {
        title: "Título atualizado sem trocar a área",
        areaId: "software-development",
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(assigned, {
        areaId: null,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(assigned, {
        areaId: deleteField(),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(assigned, {
        areaId: "cloud",
        updatedAt: serverTimestamp(),
      }),
    )

    await assertSucceeds(completeTaskWithXp(database, "alice", "assigned"))
    await assertFails(
      updateDoc(assigned, {
        areaId: "cloud",
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(assigned, {
        areaId: null,
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it("nega tarefas a visitantes e a outros usuários", async () => {
    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await setDoc(
        doc(context.firestore(), "users", "alice", "tasks", "task-1"),
        validTask(),
      )
    })

    const anonymousDb = testEnvironment.unauthenticatedContext().firestore()
    const bobDb = testEnvironment
      .authenticatedContext("bob", { email: "bob@example.com" })
      .firestore()
    const aliceTaskForAnonymous = doc(
      anonymousDb,
      "users",
      "alice",
      "tasks",
      "task-1",
    )
    const aliceTaskForBob = doc(bobDb, "users", "alice", "tasks", "task-1")

    await assertFails(getDoc(aliceTaskForAnonymous))
    await assertFails(
      setDoc(
        doc(anonymousDb, "users", "anonymous", "tasks", "task-1"),
        validTask(),
      ),
    )
    await assertFails(getDoc(aliceTaskForBob))
    await assertFails(getDocs(collection(bobDb, "users", "alice", "tasks")))
    await assertFails(
      updateDoc(aliceTaskForBob, {
        title: "Acesso indevido",
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(deleteDoc(aliceTaskForBob))
  })

  it("nega shape, enums, XP, timestamps e conclusões incoerentes", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice", "tasks", "task-1")

    await assertFails(setDoc(reference, { ...validTask(), admin: true }))
    await assertFails(setDoc(reference, { ...validTask(), title: "   " }))
    await assertFails(
      setDoc(reference, { ...validTask(), status: "invalid-status" }),
    )
    await assertFails(setDoc(reference, { ...validTask(), xp: 501 }))
    await assertFails(
      setDoc(reference, {
        ...validTask(),
        status: "completed",
        completedAt: null,
      }),
    )
    await assertFails(
      setDoc(reference, {
        ...validTask(),
        createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
      }),
    )

    await assertSucceeds(setDoc(reference, validTask()))
    await assertFails(
      updateDoc(reference, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        status: "completed",
        completedAt: null,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        tags: ["duplicada", "duplicada"],
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        tags: [42],
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        tags: [""],
        updatedAt: serverTimestamp(),
      }),
    )
    await assertFails(
      updateDoc(reference, {
        tags: ["tag-com-mais-de-trinta-e-dois-caracteres"],
        updatedAt: serverTimestamp(),
      }),
    )
  })

  it("concede XP atomicamente uma única vez por tarefa", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const profileReference = doc(database, "users", "alice")
    const taskReference = doc(database, "users", "alice", "tasks", "task-1")
    const xpReference = doc(
      database,
      "users",
      "alice",
      "xpTransactions",
      "task-1",
    )

    await assertSucceeds(
      setDoc(profileReference, validProfile("alice", "alice@example.com")),
    )
    await assertSucceeds(setDoc(taskReference, validTask()))
    await assertFails(
      updateDoc(taskReference, {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(completeTaskWithXp(database, "alice", "task-1"))

    expect((await getDoc(profileReference)).data()?.xp).toBe(40)
    expect((await getDoc(xpReference)).data()?.amount).toBe(40)

    await assertSucceeds(
      updateDoc(taskReference, {
        status: "todo",
        completedAt: null,
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(taskReference, {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )
    expect((await getDoc(profileReference)).data()?.xp).toBe(40)
    await assertFails(
      updateDoc(xpReference, {
        amount: 120,
      }),
    )
    await assertFails(deleteDoc(xpReference))
  })
})

describe("Firestore area achievement rules", () => {
  it("registra stats e evidence válidas após uma conclusão com área", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const profileReference = doc(database, "users", "alice")
    const taskReference = doc(database, "users", "alice", "tasks", "area-task")

    await assertSucceeds(
      setDoc(profileReference, {
        ...validProfile("alice", "alice@example.com"),
        primaryArea: "software-development",
      }),
    )
    await assertSucceeds(
      setDoc(taskReference, {
        ...validTask(),
        areaId: "software-development",
      }),
    )
    await assertSucceeds(
      createAreaStats(database, "alice", "software-development"),
    )
    await assertSucceeds(completeTaskWithXp(database, "alice", "area-task"))
    await assertSucceeds(
      recordAreaTaskEvidence(
        database,
        "alice",
        "software-development",
        "area-task",
      ),
    )

    const stats = await getDoc(
      doc(
        database,
        "users",
        "alice",
        "achievementAreaStats",
        "software-development",
      ),
    )
    const evidence = await getDoc(
      doc(
        database,
        "users",
        "alice",
        "achievementAreaEvidence",
        "area_task_completed__area-task",
      ),
    )
    expect(stats.data()?.tasksCompleted).toBe(1)
    expect(stats.data()?.lastEvidenceId).toBe("area_task_completed__area-task")
    expect(evidence.data()?.areaId).toBe("software-development")
  })

  it("nega evidence com área divergente ou incremento maior que um", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()

    await assertSucceeds(
      setDoc(doc(database, "users", "alice"), {
        ...validProfile("alice", "alice@example.com"),
        primaryArea: "software-development",
      }),
    )
    await assertSucceeds(
      setDoc(doc(database, "users", "alice", "tasks", "area-task"), {
        ...validTask(),
        areaId: "software-development",
      }),
    )
    await assertSucceeds(
      createAreaStats(database, "alice", "software-development"),
    )
    await assertSucceeds(completeTaskWithXp(database, "alice", "area-task"))

    await assertFails(
      recordAreaTaskEvidence(
        database,
        "alice",
        "software-development",
        "area-task",
        { evidenceAreaId: "cloud" },
      ),
    )
    await assertFails(
      recordAreaTaskEvidence(
        database,
        "alice",
        "software-development",
        "area-task",
        { increment: 2 },
      ),
    )
  })

  it("nega evidence de área quando a XP de origem não tem areaId", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()

    await assertSucceeds(
      setDoc(
        doc(database, "users", "alice"),
        validProfile("alice", "alice@example.com"),
      ),
    )
    await assertSucceeds(
      setDoc(
        doc(database, "users", "alice", "tasks", "legacy-task"),
        validTask(),
      ),
    )
    await assertSucceeds(createAreaStats(database, "alice", "cloud"))
    await assertSucceeds(completeTaskWithXp(database, "alice", "legacy-task"))
    await assertFails(
      recordAreaTaskEvidence(database, "alice", "cloud", "legacy-task"),
    )
  })

  it("nega unlock de área prematuro e recompensa divergente", async () => {
    const areaId = "software-development"
    const achievement = IT_AREA_CONFIG[areaId].achievement
    const evidenceId = "area_task_completed__seed-task"

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      const database = context.firestore()
      await setDoc(
        doc(database, "users", "alice"),
        validProfile("alice", "alice@example.com"),
      )
      await setDoc(
        doc(database, "users", "alice", "achievementAreaStats", areaId),
        {
          areaId,
          tasksCompleted: 1,
          lastEvidenceId: evidenceId,
          updatedAt: Timestamp.now(),
        },
      )
      await setDoc(
        doc(database, "users", "alice", "achievementAreaEvidence", evidenceId),
        {
          areaId,
          metric: "areaTasksCompleted",
          sourceType: "TASK_COMPLETED",
          sourceId: "seed-task",
          occurredAt: Timestamp.now(),
          recordedAt: Timestamp.now(),
        },
      )
    })

    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    await assertFails(
      attemptAreaAchievementUnlock(
        database,
        "alice",
        areaId,
        achievement.rewardXp,
      ),
    )

    await testEnvironment.withSecurityRulesDisabled(async (context) => {
      await updateDoc(
        doc(
          context.firestore(),
          "users",
          "alice",
          "achievementAreaStats",
          areaId,
        ),
        { tasksCompleted: achievement.target },
      )
    })
    await assertFails(
      attemptAreaAchievementUnlock(
        database,
        "alice",
        areaId,
        achievement.rewardXp - 1,
      ),
    )
  })

  it("nega a outro usuário escritas nas coleções de área", async () => {
    const bobDb = testEnvironment
      .authenticatedContext("bob", { email: "bob@example.com" })
      .firestore()

    await assertFails(
      setDoc(
        doc(
          bobDb,
          "users",
          "alice",
          "achievementAreaStats",
          "software-development",
        ),
        {
          areaId: "software-development",
          tasksCompleted: 0,
          lastEvidenceId: null,
          updatedAt: serverTimestamp(),
        },
      ),
    )
    await assertFails(
      setDoc(
        doc(
          bobDb,
          "users",
          "alice",
          "achievementAreaEvidence",
          "area_task_completed__forged",
        ),
        {
          areaId: "software-development",
          metric: "areaTasksCompleted",
          sourceType: "TASK_COMPLETED",
          sourceId: "forged",
          occurredAt: serverTimestamp(),
          recordedAt: serverTimestamp(),
        },
      ),
    )
    await assertFails(
      setDoc(
        doc(
          bobDb,
          "users",
          "alice",
          "achievements",
          "area-software-development-specialist",
        ),
        {
          achievementId: "area-software-development-specialist",
          unlockedAt: serverTimestamp(),
          progressValue: 5,
          rewardXp: 75,
          awardedXp: 75,
          triggerEvidenceId: "area_task_completed__forged",
          definitionVersion: 2,
        },
      ),
    )
  })
})
