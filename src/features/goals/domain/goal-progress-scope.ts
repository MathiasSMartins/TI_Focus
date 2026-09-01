import type { Timestamp } from "firebase/firestore"

import type { getCivilPeriod } from "@/features/goals/domain/civil-period"
import type {
  GoalCadence,
  GoalProgressDocument,
} from "@/features/goals/types/goal"

type CivilPeriod = ReturnType<typeof getCivilPeriod>

export interface ResolvedGoalProgress {
  id: string
  progress: GoalProgressDocument
}

export function getScopedGoalProgressId(
  cadence: GoalCadence,
  period: CivilPeriod,
  timezone: string,
) {
  const timezoneToken = timezone.replaceAll("/", "~")
  return `${cadence}__${period.key}__v2__${period.startsAt.getTime()}__${period.endsAt.getTime()}__${timezoneToken}`
}

export function matchesGoalProgressScope(
  progress: GoalProgressDocument,
  cadence: GoalCadence,
  period: CivilPeriod,
  timezone: string,
) {
  return (
    progress.cadence === cadence &&
    progress.periodKey === period.key &&
    progress.timezone === timezone &&
    progress.periodStartsAt.toMillis() === period.startsAt.getTime() &&
    progress.periodEndsAt.toMillis() === period.endsAt.getTime()
  )
}

export function findGoalProgressForScope(
  candidates: readonly ResolvedGoalProgress[],
  cadence: GoalCadence,
  period: CivilPeriod,
  timezone: string,
) {
  return (
    candidates
      .filter(({ progress }) =>
        matchesGoalProgressScope(progress, cadence, period, timezone),
      )
      .sort(
        (left, right) =>
          left.progress.createdAt.toMillis() -
            right.progress.createdAt.toMillis() ||
          left.id.localeCompare(right.id),
      )[0] ?? null
  )
}

function compareMostRecent(
  left: ResolvedGoalProgress,
  right: ResolvedGoalProgress,
) {
  const leftEligibleFrom = left.progress.eligibleFrom ?? left.progress.createdAt
  const rightEligibleFrom =
    right.progress.eligibleFrom ?? right.progress.createdAt
  return (
    rightEligibleFrom.toMillis() - leftEligibleFrom.toMillis() ||
    right.progress.createdAt.toMillis() - left.progress.createdAt.toMillis() ||
    left.id.localeCompare(right.id)
  )
}

export function resolveGoalProgressForSource(
  candidates: readonly ResolvedGoalProgress[],
  occurredAt: Timestamp,
  cadence: GoalCadence,
  period: CivilPeriod,
  timezone: string,
) {
  const occurredAtMillis = occurredAt.toMillis()
  const eligible = candidates.filter(({ progress }) => {
    const eligibleFrom = progress.eligibleFrom ?? progress.createdAt
    return (
      occurredAtMillis >= progress.periodStartsAt.toMillis() &&
      occurredAtMillis < progress.periodEndsAt.toMillis() &&
      occurredAtMillis >= eligibleFrom.toMillis()
    )
  })
  const scoped = eligible.filter(({ progress }) =>
    matchesGoalProgressScope(progress, cadence, period, timezone),
  )
  return (
    [...(scoped.length > 0 ? scoped : eligible)].sort(compareMostRecent)[0] ??
    null
  )
}

export function selectCurrentGoalProgress(
  progressItems: readonly GoalProgressDocument[],
  cadence: GoalCadence,
  period: CivilPeriod,
  timezone: string,
  now: number,
) {
  return (
    progressItems
      .filter((progress) => {
        const eligibleFrom = progress.eligibleFrom ?? progress.createdAt
        return (
          matchesGoalProgressScope(progress, cadence, period, timezone) &&
          eligibleFrom.toMillis() <= now &&
          now < progress.periodEndsAt.toMillis()
        )
      })
      .sort((left, right) => {
        const leftEligibleFrom = left.eligibleFrom ?? left.createdAt
        const rightEligibleFrom = right.eligibleFrom ?? right.createdAt
        return (
          rightEligibleFrom.toMillis() - leftEligibleFrom.toMillis() ||
          right.createdAt.toMillis() - left.createdAt.toMillis()
        )
      })[0] ?? null
  )
}
