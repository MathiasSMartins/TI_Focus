export type CivilCadence = "daily" | "weekly" | "monthly"

export interface CivilPeriod {
  cadence: CivilCadence
  key: string
  startsAt: Date
  endsAt: Date
}

interface CivilDateParts {
  year: number
  month: number
  day: number
}

function getParts(date: Date, timeZone: string): CivilDateParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  return { year: value("year"), month: value("month"), day: value("day") }
}

function civilUtc(parts: CivilDateParts) {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day))
}

function fromCivilUtc(date: Date): CivilDateParts {
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  }
}

function addCivilDays(parts: CivilDateParts, days: number) {
  const date = civilUtc(parts)
  date.setUTCDate(date.getUTCDate() + days)
  return fromCivilUtc(date)
}

function addCivilMonths(parts: CivilDateParts, months: number) {
  const date = civilUtc({ ...parts, day: 1 })
  date.setUTCMonth(date.getUTCMonth() + months)
  return fromCivilUtc(date)
}

function getOffsetMilliseconds(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date)
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value)
  const representedAsUtc = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  )
  return representedAsUtc - date.getTime()
}

function civilMidnightToInstant(parts: CivilDateParts, timeZone: string) {
  const desiredUtc = Date.UTC(parts.year, parts.month - 1, parts.day)
  let candidate = new Date(desiredUtc)
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const next = new Date(
      desiredUtc - getOffsetMilliseconds(candidate, timeZone),
    )
    if (next.getTime() === candidate.getTime()) return next
    candidate = next
  }
  return candidate
}

function pad(value: number) {
  return String(value).padStart(2, "0")
}

function dailyKey(parts: CivilDateParts) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`
}

function isoWeekKey(parts: CivilDateParts) {
  const date = civilUtc(parts)
  const weekday = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - weekday)
  const isoYear = date.getUTCFullYear()
  const yearStart = new Date(Date.UTC(isoYear, 0, 1))
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  )
  return `${isoYear}-W${pad(week)}`
}

export function getCivilPeriod(
  date: Date,
  timeZone: string,
  cadence: CivilCadence,
): CivilPeriod {
  const local = getParts(date, timeZone)
  let start = local
  let end: CivilDateParts
  let key: string

  if (cadence === "daily") {
    end = addCivilDays(start, 1)
    key = dailyKey(start)
  } else if (cadence === "weekly") {
    const weekday = civilUtc(local).getUTCDay() || 7
    start = addCivilDays(local, 1 - weekday)
    end = addCivilDays(start, 7)
    key = isoWeekKey(local)
  } else {
    start = { ...local, day: 1 }
    end = addCivilMonths(start, 1)
    key = `${start.year}-${pad(start.month)}`
  }

  return {
    cadence,
    key,
    startsAt: civilMidnightToInstant(start, timeZone),
    endsAt: civilMidnightToInstant(end, timeZone),
  }
}

export function differenceInCivilDays(leftKey: string, rightKey: string) {
  const parse = (key: string) => {
    const [year, month, day] = key.split("-").map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round((parse(leftKey) - parse(rightKey)) / 86_400_000)
}
