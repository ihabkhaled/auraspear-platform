import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import utc from 'dayjs/plugin/utc'
import 'dayjs/locale/ar'
import 'dayjs/locale/de'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/it'

dayjs.extend(relativeTime)
dayjs.extend(utc)

export { dayjs }

// ─── Date Formatting ───────────────────────────────────────

export function formatDate(date: string | Date): string {
  return dayjs(date).format('MMM D, YYYY')
}

export function formatTimestamp(date: string | Date): string {
  return dayjs(date).format('MMM D, YYYY HH:mm:ss')
}

export function formatRelativeTime(date: string | Date, locale = 'en'): string {
  return dayjs(date).locale(locale).fromNow()
}

export function formatDateShort(date: string | Date): string {
  return dayjs(date).format('YYYY-MM-DD')
}

export function formatTimeOnly(date: string | Date): string {
  return dayjs(date).format('HH:mm:ss')
}

// ─── Date Helpers ──────────────────────────────────────────

export function nowISO(): string {
  return dayjs().toISOString()
}

export function todayDate(): string {
  return dayjs().format('YYYY-MM-DD')
}

export function uniqueId(prefix: string): string {
  return `${prefix}-${String(dayjs().valueOf())}`
}

export function sortByDateAsc<T>(items: T[], getDate: (item: T) => string): T[] {
  return [...items].sort((a, b) => dayjs(getDate(a)).valueOf() - dayjs(getDate(b)).valueOf())
}

export function sortByDateDesc<T>(items: T[], getDate: (item: T) => string): T[] {
  return [...items].sort((a, b) => dayjs(getDate(b)).valueOf() - dayjs(getDate(a)).valueOf())
}

export function formatDateLocale(date: string | Date): string {
  return dayjs(date).format('lll')
}
