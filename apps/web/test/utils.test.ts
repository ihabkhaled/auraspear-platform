import { describe, test, expect } from 'vitest'
import { cn, formatDate, formatTimestamp, formatNumber, formatPercentage } from '@/lib/utils'

describe('cn', () => {
  test('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  test('should handle conditional classes', () => {
    const result = cn('base', false && 'hidden', 'visible')
    expect(result).toBe('base visible')
  })

  test('should resolve Tailwind conflicts via twMerge', () => {
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  test('should handle empty inputs', () => {
    expect(cn()).toBe('')
  })
})

describe('formatDate', () => {
  test('should format Date object', () => {
    const result = formatDate(new Date('2026-03-14T10:00:00Z'))
    expect(result).toMatch(/Mar 14, 2026/)
  })

  test('should format date string', () => {
    const result = formatDate('2026-01-01T00:00:00Z')
    expect(result).toMatch(/Jan 1, 2026|Dec 31, 2025/)
  })
})

describe('formatTimestamp', () => {
  test('should include time in output', () => {
    const result = formatTimestamp(new Date('2026-03-14T15:30:45Z'))
    expect(result).toMatch(/2026/)
    expect(result).toMatch(/\d{2}:\d{2}:\d{2}/)
  })
})

describe('formatNumber', () => {
  test('should abbreviate millions', () => {
    expect(formatNumber(1500000)).toBe('1.5M')
  })

  test('should abbreviate thousands', () => {
    expect(formatNumber(2300)).toBe('2.3K')
  })

  test('should not abbreviate small numbers', () => {
    expect(formatNumber(500)).toBe('500')
  })

  test('should handle zero', () => {
    expect(formatNumber(0)).toBe('0')
  })

  test('should handle exactly 1000', () => {
    expect(formatNumber(1000)).toBe('1.0K')
  })

  test('should handle exactly 1000000', () => {
    expect(formatNumber(1000000)).toBe('1.0M')
  })
})

describe('formatPercentage', () => {
  test('should format number with one decimal', () => {
    expect(formatPercentage(85.5)).toBe('85.5%')
  })

  test('should return dash for undefined', () => {
    expect(formatPercentage(undefined)).toBe('-')
  })

  test('should return dash for null', () => {
    expect(formatPercentage(null)).toBe('-')
  })

  test('should handle zero', () => {
    expect(formatPercentage(0)).toBe('0.0%')
  })

  test('should round to one decimal', () => {
    expect(formatPercentage(85.555)).toBe('85.6%')
  })
})
