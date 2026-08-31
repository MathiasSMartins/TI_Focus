import { describe, expect, it, vi } from "vitest"

import {
  publishTaskCompleted,
  subscribeToTaskCompleted,
  TASK_COMPLETED,
  type TaskCompletedEvent,
} from "@/features/tasks/events/task-events"

const event: TaskCompletedEvent = {
  type: TASK_COMPLETED,
  version: 1,
  userId: "user-1",
  taskId: "task-1",
  xp: 20,
  occurredAt: new Date("2026-08-27T12:00:00Z"),
}

describe("TASK_COMPLETED", () => {
  it("isola falhas de listeners sem interromper os demais consumidores", () => {
    const failingListener = vi.fn(() => {
      throw new Error("Falha no consumidor")
    })
    const healthyListener = vi.fn()
    const unsubscribeFailing = subscribeToTaskCompleted(failingListener)
    const unsubscribeHealthy = subscribeToTaskCompleted(healthyListener)

    expect(() => publishTaskCompleted(event)).not.toThrow()
    expect(failingListener).toHaveBeenCalledWith(event)
    expect(healthyListener).toHaveBeenCalledWith(event)

    unsubscribeFailing()
    unsubscribeHealthy()
  })
})
