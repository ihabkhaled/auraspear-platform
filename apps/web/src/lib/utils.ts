import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Re-export date utilities from centralized dayjs module
export { formatDate, formatTimestamp, formatRelativeTime } from '@/lib/dayjs'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`
  }
  return num.toString()
}

export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null) {
    return '-'
  }
  return `${value.toFixed(1)}%`
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text)
}

export function getNestedValue<T>(row: T, key: string): unknown {
  return key.split('.').reduce<unknown>((obj, k) => {
    if (obj !== null && obj !== undefined && typeof obj === 'object') {
      return Reflect.get(obj as object, k)
    }
    return
  }, row)
}

/**
 * Parse InfluxDB Flux CSV response into structured rows and columns.
 * Handles the annotated CSV format returned by InfluxDB queries.
 */
export function parseFluxCSV(csv: string): {
  columns: string[]
  rows: Record<string, string>[]
} {
  const lines = csv.split('\n').filter(line => line.trim().length > 0)
  if (lines.length === 0) return { columns: [], rows: [] }

  // Find the header line (first non-empty, non-annotation line)
  let headerIdx = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines.at(i) ?? ''
    // Skip annotation lines that start with #
    if (line.startsWith('#')) {
      headerIdx = i + 1
      continue
    }
    break
  }

  const headerLine = lines.at(headerIdx)
  if (!headerLine) return { columns: [], rows: [] }

  const headers = headerLine.split(',').map(h => h.trim())
  // Filter out internal columns (empty first col, "result", "table")
  const visibleHeaders = headers.filter(h => h.length > 0 && h !== 'result' && h !== 'table')

  const rows: Record<string, string>[] = []
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines.at(i) ?? ''
    if (line.startsWith('#') || line.trim().length === 0) continue

    const values = line.split(',')
    const row: Record<string, string> = {}
    for (const header of visibleHeaders) {
      const colIdx = headers.indexOf(header)
      const cellValue = colIdx >= 0 ? (values.at(colIdx)?.trim() ?? '') : ''
      Reflect.set(row, header, cellValue)
    }
    rows.push(row)
  }

  return { columns: visibleHeaders, rows }
}

/**
 * Type-safe record lookup using Reflect.get to avoid
 * eslint security/detect-object-injection false positives
 * on typed enum-keyed constant maps.
 */
export function lookup<K extends string, V>(record: Readonly<Record<K, V>>, key: K): V {
  return Reflect.get(record, key) as V
}

/**
 * Safely parse a JSON string, returning a fallback value on failure or empty input.
 */
export function safeJsonParse<T>(value: string | undefined | null, fallback: T): T {
  if (!value || value.trim() === '') return fallback
  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

export function formatFileSize(bytes: number | string): string {
  const normalizedBytes = typeof bytes === 'string' ? Number(bytes) : bytes
  if (!Number.isFinite(normalizedBytes) || normalizedBytes <= 0) {
    return '0 B'
  }
  const units = ['B', 'KB', 'MB', 'GB']
  const k = 1024
  const i = Math.floor(Math.log(normalizedBytes) / Math.log(k))
  const size = normalizedBytes / Math.pow(k, i)
  return `${Math.round(size * 100) / 100} ${units.at(i) ?? 'B'}`
}
