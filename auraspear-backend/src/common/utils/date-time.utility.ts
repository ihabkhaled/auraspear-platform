import dayjs from 'dayjs'
import duration from 'dayjs/plugin/duration'
import relativeTime from 'dayjs/plugin/relativeTime'
import timezone from 'dayjs/plugin/timezone'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)
dayjs.extend(timezone)
dayjs.extend(duration)
dayjs.extend(relativeTime)

export { dayjs }

/* ---------------------------------------------------------------- */
/* NOW / CURRENT TIME                                                */
/* ---------------------------------------------------------------- */

/** Returns the current date/time as a Day.js instance. */
export function now(): dayjs.Dayjs {
  return dayjs()
}

/** Returns the current date/time as a native Date (for Prisma). */
export function nowDate(): Date {
  return dayjs().toDate()
}

/** Returns current Unix timestamp in milliseconds. */
export function nowMs(): number {
  return dayjs().valueOf()
}

/** Returns current Unix timestamp in seconds. */
export function nowUnix(): number {
  return dayjs().unix()
}

/* ---------------------------------------------------------------- */
/* DATE CREATION                                                     */
/* ---------------------------------------------------------------- */

/** Wraps a value (Date, string, number, undefined) as a Day.js instance. */
export function toDay(value?: Date | string | number | null): dayjs.Dayjs {
  return dayjs(value ?? undefined)
}

/** Converts a Unix epoch in seconds to a Day.js instance. */
export function fromUnix(epochSeconds: number): dayjs.Dayjs {
  return dayjs.unix(epochSeconds)
}

/** Converts a Unix epoch in seconds to a native Date. */
export function fromUnixToDate(epochSeconds: number): Date {
  return dayjs.unix(epochSeconds).toDate()
}

/* ---------------------------------------------------------------- */
/* DATE ARITHMETIC                                                   */
/* ---------------------------------------------------------------- */

/** Returns a Date representing `count` days before now. */
export function daysAgo(count: number): Date {
  return dayjs().subtract(count, 'day').toDate()
}

/** Returns a Date representing `count` days from now. */
export function daysFromNow(count: number): Date {
  return dayjs().add(count, 'day').toDate()
}

/** Adds the given duration to a date. Returns a native Date. */
export function addDuration(
  date: Date | string | number,
  amount: number,
  unit: dayjs.ManipulateType
): Date {
  return dayjs(date).add(amount, unit).toDate()
}

/** Subtracts the given duration from a date. Returns a native Date. */
export function subtractDuration(
  date: Date | string | number,
  amount: number,
  unit: dayjs.ManipulateType
): Date {
  return dayjs(date).subtract(amount, unit).toDate()
}

/** Returns the number of milliseconds between two dates. */
export function diffMs(from: Date | string | number, to: Date | string | number): number {
  return dayjs(to).diff(dayjs(from))
}

/** Returns the difference in the given unit between two dates. */
export function diff(
  from: Date | string | number,
  to: Date | string | number,
  unit: dayjs.QUnitType | dayjs.OpUnitType
): number {
  return dayjs(to).diff(dayjs(from), unit)
}

/* ---------------------------------------------------------------- */
/* EXPIRY / TTL HELPERS                                              */
/* ---------------------------------------------------------------- */

/** Returns a Date that is `ttlSeconds` from now. */
export function expiresInSeconds(ttlSeconds: number): Date {
  return dayjs().add(ttlSeconds, 'second').toDate()
}

/** Returns a Date that is `ttlMs` milliseconds from now. */
export function expiresInMs(ttlMs: number): Date {
  return dayjs().add(ttlMs, 'millisecond').toDate()
}

/** Returns remaining seconds until a Unix epoch timestamp, minimum 0. */
export function remainingSecondsUntilEpoch(epochSeconds: number): number {
  return Math.max(epochSeconds - dayjs().unix(), 0)
}

/** Returns remaining seconds until a Date, minimum 0. */
export function remainingSecondsUntilDate(expiresAt: Date): number {
  return Math.max(Math.ceil(dayjs(expiresAt).diff(dayjs(), 'second', true)), 0)
}

/* ---------------------------------------------------------------- */
/* FORMATTING / SERIALIZATION                                        */
/* ---------------------------------------------------------------- */

/** Returns an ISO 8601 string of the given date (or now). */
export function toIso(date?: Date | string | number | null): string {
  return dayjs(date ?? undefined).toISOString()
}

/** Returns a formatted string of the given date (or now). */
export function formatDate(date: Date | string | number, template = 'YYYY-MM-DD HH:mm:ss'): string {
  return dayjs(date).format(template)
}

/* ---------------------------------------------------------------- */
/* COMPARISON / QUERY                                                */
/* ---------------------------------------------------------------- */

/** Returns true if `date` is before `other` (default: now). */
export function isBefore(date: Date | string | number, other?: Date | string | number): boolean {
  return dayjs(date).isBefore(other ? dayjs(other) : dayjs())
}

/** Returns true if `date` is after `other` (default: now). */
export function isAfter(date: Date | string | number, other?: Date | string | number): boolean {
  return dayjs(date).isAfter(other ? dayjs(other) : dayjs())
}

/** Returns true if the given value is a valid date. */
export function isValidDate(value: unknown): boolean {
  return dayjs(value as string | number | Date).isValid()
}

/* ---------------------------------------------------------------- */
/* DATE PARTS                                                        */
/* ---------------------------------------------------------------- */

/** Returns the year of the given date (or now). */
export function getYear(date?: Date | string | number): number {
  return dayjs(date ?? undefined).year()
}

/** Returns the 0-indexed month of the given date (or now). */
export function getMonth(date?: Date | string | number): number {
  return dayjs(date ?? undefined).month()
}

/** Returns {year, month} for the given date (or now). Month is 0-indexed. */
export function getYearMonth(date?: Date | string | number): { year: number; month: number } {
  const d = dayjs(date ?? undefined)
  return { year: d.year(), month: d.month() }
}

/** Returns the start of a given unit for the specified date (or now). Use `utc: true` for UTC boundaries. */
export function startOf(
  unit: dayjs.OpUnitType,
  date?: Date | string | number,
  options?: { utc?: boolean }
): Date {
  const d = options?.utc ? dayjs.utc(date ?? undefined) : dayjs(date ?? undefined)
  return d.startOf(unit).toDate()
}

/** Returns the end of a given unit for the specified date (or now). Use `utc: true` for UTC boundaries. */
export function endOf(
  unit: dayjs.OpUnitType,
  date?: Date | string | number,
  options?: { utc?: boolean }
): Date {
  const d = options?.utc ? dayjs.utc(date ?? undefined) : dayjs(date ?? undefined)
  return d.endOf(unit).toDate()
}

/* ---------------------------------------------------------------- */
/* ELAPSED / DURATION                                                */
/* ---------------------------------------------------------------- */

/** Returns the number of milliseconds elapsed since a start time (ms). */
export function elapsedMs(startMs: number): number {
  return dayjs().valueOf() - startMs
}

/** Returns a human-readable duration from milliseconds (e.g. "2 hours"). */
export function humanizeDuration(ms: number): string {
  return dayjs.duration(ms).humanize()
}

/** Returns the 1-based day of the month for the given date (or now). */
export function dayOfMonth(date?: Date | string | number): number {
  return dayjs(date ?? undefined).date()
}

/** Returns the total number of days in the month for the given date (or now). */
export function daysInMonth(date?: Date | string | number): number {
  return dayjs(date ?? undefined).daysInMonth()
}
