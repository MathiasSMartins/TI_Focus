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
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore"
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest"

const PROJECT_ID = "ti-focus-test"
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
    xp: 10,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    completedAt: null,
  }
}

beforeAll(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync(
        new URL("../firestore.rules", import.meta.url),
        "utf8",
      ),
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
        dailyTaskGoal: 5,
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
        dailyTaskGoal: 5,
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

describe("Firestore task ownership rules", () => {
  it("permite ao proprietário criar, listar, editar, concluir, reabrir e excluir", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const reference = doc(database, "users", "alice", "tasks", "task-1")

    await assertSucceeds(setDoc(reference, validTask()))
    await assertSucceeds(getDoc(reference))
    await assertSucceeds(
      getDocs(collection(database, "users", "alice", "tasks")),
    )
    await assertSucceeds(
      updateDoc(reference, {
        title: "Sistema de tarefas completo",
        priority: "high",
        updatedAt: serverTimestamp(),
      }),
    )
    await assertSucceeds(
      updateDoc(reference, {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )

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

  it("concluir tarefa não altera o XP protegido do perfil", async () => {
    const database = testEnvironment
      .authenticatedContext("alice", { email: "alice@example.com" })
      .firestore()
    const profileReference = doc(database, "users", "alice")
    const taskReference = doc(database, "users", "alice", "tasks", "task-1")

    await assertSucceeds(
      setDoc(profileReference, validProfile("alice", "alice@example.com")),
    )
    await assertSucceeds(setDoc(taskReference, validTask()))
    await assertSucceeds(
      updateDoc(taskReference, {
        status: "completed",
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    )

    expect((await getDoc(profileReference)).data()?.xp).toBe(0)
  })
})
