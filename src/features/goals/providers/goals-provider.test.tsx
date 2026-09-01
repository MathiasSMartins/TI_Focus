import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  synchronizedNow: null as number | null,
  migrateLegacyDailyGoal: vi.fn(async () => undefined),
  reconcileGoals: vi.fn<
    (uid: string, timezone: string, force?: boolean) => Promise<void>
  >(async () => undefined),
  synchronizeServerClock: vi.fn<() => Promise<number | null>>(),
  unsubscribe: vi.fn(),
}))

vi.mock("@/features/auth", () => ({
  useAuth: () => ({
    user: { uid: "user-1" },
    profile: {
      uid: "user-1",
      dailyTaskGoal: null,
      settings: { timezone: "UTC" },
    },
  }),
}))
vi.mock("@/features/gamification/services/xp-repository", () => ({
  getSynchronizedServerNow: () => mocks.synchronizedNow,
  synchronizeServerClock: mocks.synchronizeServerClock,
}))
vi.mock("@/features/goals/services/goal-repository", () => ({
  migrateLegacyDailyGoal: mocks.migrateLegacyDailyGoal,
  processPersistedPomodoroForGoals: vi.fn(),
  processPersistedTaskCompletionForGoals: vi.fn(),
  processPersistedXpTransactionForGoals: vi.fn(),
  reconcileGoals: mocks.reconcileGoals,
}))
vi.mock("@/features/goals/events/goal-events", () => ({
  subscribeToGoalCompleted: vi.fn(() => mocks.unsubscribe),
}))
vi.mock("@/features/tasks/events/task-events", () => ({
  subscribeToTaskCompleted: vi.fn(() => mocks.unsubscribe),
}))
vi.mock("@/features/pomodoro/events/pomodoro-events", () => ({
  subscribeToPomodoroCompleted: vi.fn(() => mocks.unsubscribe),
}))
vi.mock("@/features/achievements/events/achievement-events", () => ({
  subscribeToAchievementUnlocked: vi.fn(() => mocks.unsubscribe),
}))
vi.mock("@/features/goals/components/goal-completed-feedback", () => ({
  GoalCompletedFeedback: () => null,
}))

import { GoalsProvider } from "@/features/goals/providers/goals-provider"

async function flushPromises() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  })
}

describe("GoalsProvider", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mocks.synchronizedNow = null
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("recupera o relógio e força reconciliação antes de agendar rollover", async () => {
    mocks.synchronizeServerClock
      .mockRejectedValueOnce(new Error("indisponível"))
      .mockImplementationOnce(async () => {
        mocks.synchronizedNow = Date.parse("2026-08-27T12:00:00.000Z")
        return mocks.synchronizedNow
      })

    const view = render(
      <GoalsProvider>
        <div>conteúdo</div>
      </GoalsProvider>,
    )
    await flushPromises()

    expect(mocks.synchronizeServerClock).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileGoals).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileGoals).toHaveBeenNthCalledWith(
      1,
      "user-1",
      "UTC",
      true,
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(999)
    })
    expect(mocks.synchronizeServerClock).toHaveBeenCalledTimes(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    await flushPromises()

    expect(mocks.synchronizeServerClock).toHaveBeenCalledTimes(2)
    expect(mocks.reconcileGoals).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "UTC",
      true,
    )
    expect(
      mocks.synchronizeServerClock.mock.invocationCallOrder[1],
    ).toBeLessThan(mocks.reconcileGoals.mock.invocationCallOrder[1])
    expect(vi.getTimerCount()).toBe(1)

    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("repete a inicialização com backoff quando a migração falha", async () => {
    mocks.migrateLegacyDailyGoal
      .mockRejectedValueOnce(new Error("falha transitória"))
      .mockResolvedValueOnce(undefined)
    mocks.synchronizeServerClock.mockImplementationOnce(async () => {
      mocks.synchronizedNow = Date.parse("2026-08-27T12:00:00.000Z")
      return mocks.synchronizedNow
    })

    const view = render(
      <GoalsProvider>
        <div>conteúdo</div>
      </GoalsProvider>,
    )
    await flushPromises()

    expect(mocks.migrateLegacyDailyGoal).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileGoals).not.toHaveBeenCalled()
    expect(mocks.synchronizeServerClock).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    await flushPromises()

    expect(mocks.migrateLegacyDailyGoal).toHaveBeenCalledTimes(2)
    expect(mocks.reconcileGoals).toHaveBeenCalledWith("user-1", "UTC", true)
    expect(mocks.synchronizeServerClock).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)

    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it("repete a inicialização com backoff quando a reconciliação falha", async () => {
    mocks.reconcileGoals
      .mockRejectedValueOnce(new Error("falha transitória"))
      .mockResolvedValueOnce(undefined)
    mocks.synchronizeServerClock.mockImplementationOnce(async () => {
      mocks.synchronizedNow = Date.parse("2026-08-27T12:00:00.000Z")
      return mocks.synchronizedNow
    })

    const view = render(
      <GoalsProvider>
        <div>conteúdo</div>
      </GoalsProvider>,
    )
    await flushPromises()

    expect(mocks.migrateLegacyDailyGoal).toHaveBeenCalledTimes(1)
    expect(mocks.reconcileGoals).toHaveBeenCalledTimes(1)
    expect(mocks.synchronizeServerClock).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(1)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })
    await flushPromises()

    expect(mocks.migrateLegacyDailyGoal).toHaveBeenCalledTimes(2)
    expect(mocks.reconcileGoals).toHaveBeenCalledTimes(2)
    expect(mocks.reconcileGoals).toHaveBeenNthCalledWith(
      2,
      "user-1",
      "UTC",
      true,
    )
    expect(mocks.synchronizeServerClock).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(1)

    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
