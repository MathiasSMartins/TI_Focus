import { Timestamp } from "firebase/firestore"
import { describe, expect, it } from "vitest"

import { getCivilPeriod } from "@/features/goals/domain/civil-period"
import {
  getScopedGoalProgressId,
  resolveGoalProgressForSource,
  selectCurrentGoalProgress,
} from "@/features/goals/domain/goal-progress-scope"
import type { GoalProgressDocument } from "@/features/goals/types/goal"

function progress(
  timezone: string,
  now: Date,
  eligibleFrom: Date,
): GoalProgressDocument {
  const period = getCivilPeriod(now, timezone, "daily")
  return {
    userId: "alice",
    cadence: "daily",
    periodKey: period.key,
    timezone,
    periodStartsAt: Timestamp.fromDate(period.startsAt),
    periodEndsAt: Timestamp.fromDate(period.endsAt),
    eligibleFrom: Timestamp.fromDate(eligibleFrom),
    metric: "tasksCompleted",
    target: 3,
    rewardXp: 30,
    current: 0,
    completed: false,
    completedAt: null,
    lastEvidenceId: null,
    createdAt: Timestamp.fromDate(eligibleFrom),
    updatedAt: Timestamp.fromDate(eligibleFrom),
  }
}

describe("goal progress scope", () => {
  it("gera IDs distintos e seguros para timezones com a mesma chave civil", () => {
    const now = new Date("2026-08-27T12:00:00.000Z")
    const utcPeriod = getCivilPeriod(now, "UTC", "daily")
    const saoPauloPeriod = getCivilPeriod(now, "America/Sao_Paulo", "daily")

    expect(utcPeriod.key).toBe(saoPauloPeriod.key)
    expect(getScopedGoalProgressId("daily", utcPeriod, "UTC")).not.toBe(
      getScopedGoalProgressId("daily", saoPauloPeriod, "America/Sao_Paulo"),
    )
    expect(
      getScopedGoalProgressId("daily", saoPauloPeriod, "America/Sao_Paulo"),
    ).not.toContain("/")
  })

  it("mantém fontes anteriores no escopo histórico e posteriores no timezone atual", () => {
    const now = new Date("2026-08-27T12:00:00.000Z")
    const currentPeriod = getCivilPeriod(now, "America/Sao_Paulo", "daily")
    const candidates = [
      {
        id: "daily__2026-08-27",
        progress: progress("UTC", now, new Date("2026-08-27T00:00:00.000Z")),
      },
      {
        id: "current-scope",
        progress: progress("America/Sao_Paulo", now, now),
      },
    ]

    expect(
      resolveGoalProgressForSource(
        candidates,
        Timestamp.fromDate(new Date("2026-08-27T11:00:00.000Z")),
        "daily",
        currentPeriod,
        "America/Sao_Paulo",
      )?.id,
    ).toBe("daily__2026-08-27")
    expect(
      resolveGoalProgressForSource(
        candidates,
        Timestamp.fromDate(new Date("2026-08-27T13:00:00.000Z")),
        "daily",
        currentPeriod,
        "America/Sao_Paulo",
      )?.id,
    ).toBe("current-scope")
  })

  it("seleciona para a UI apenas o progresso do escopo civil atual", () => {
    const now = new Date("2026-08-27T13:00:00.000Z")
    const currentPeriod = getCivilPeriod(now, "America/Sao_Paulo", "daily")
    const legacy = progress("UTC", now, new Date("2026-08-27T00:00:00.000Z"))
    const current = progress(
      "America/Sao_Paulo",
      now,
      new Date("2026-08-27T12:00:00.000Z"),
    )

    expect(
      selectCurrentGoalProgress(
        [legacy, current],
        "daily",
        currentPeriod,
        "America/Sao_Paulo",
        now.getTime(),
      ),
    ).toBe(current)
  })
})
