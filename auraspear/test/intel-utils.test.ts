import { describe, test, expect } from 'vitest'
import { getThreatLevelVariant, truncateInfo, getTagClasses } from '@/lib/intel-utils'

describe('getThreatLevelVariant', () => {
  test('critical returns destructive', () => {
    expect(getThreatLevelVariant('critical')).toBe('destructive')
  })

  test('high returns destructive', () => {
    expect(getThreatLevelVariant('high')).toBe('destructive')
  })

  test('medium returns default', () => {
    expect(getThreatLevelVariant('medium')).toBe('default')
  })

  test('low returns secondary', () => {
    expect(getThreatLevelVariant('low')).toBe('secondary')
  })

  test('unknown returns outline', () => {
    expect(getThreatLevelVariant('unknown')).toBe('outline')
  })

  test('is case-insensitive', () => {
    expect(getThreatLevelVariant('CRITICAL')).toBe('destructive')
    expect(getThreatLevelVariant('Critical')).toBe('destructive')
  })
})

describe('truncateInfo', () => {
  test('short string unchanged', () => {
    expect(truncateInfo('hello', 60)).toBe('hello')
  })

  test('exactly at max returns unchanged', () => {
    const str = 'a'.repeat(60)
    expect(truncateInfo(str, 60)).toBe(str)
  })

  test('long string truncated with ellipsis', () => {
    const str = 'a'.repeat(70)
    expect(truncateInfo(str, 60)).toBe(`${'a'.repeat(60)}...`)
  })

  test('uses default maxLength of 60', () => {
    const str = 'a'.repeat(61)
    expect(truncateInfo(str)).toBe(`${'a'.repeat(60)}...`)
  })
})

describe('getTagClasses', () => {
  test('null returns secondary classes', () => {
    expect(getTagClasses(null)).toContain('bg-secondary')
  })

  test('undefined returns secondary classes', () => {
    expect(getTagClasses(undefined)).toContain('bg-secondary')
  })

  test('TLP:RED returns red-themed classes', () => {
    expect(getTagClasses('TLP:RED')).toContain('tag-tlp-red')
  })

  test('TLP:Red (case variations)', () => {
    expect(getTagClasses('TLP:Red')).toContain('tag-tlp-red')
  })

  test('TLP:AMBER returns amber-themed classes', () => {
    expect(getTagClasses('TLP:AMBER')).toContain('tag-tlp-amber')
  })

  test('TLP:GREEN returns green-themed classes', () => {
    expect(getTagClasses('TLP:GREEN')).toContain('tag-tlp-green')
  })

  test('TLP:WHITE returns muted classes', () => {
    expect(getTagClasses('TLP:WHITE')).toContain('bg-muted')
  })

  test('TLP:CLEAR returns muted classes', () => {
    expect(getTagClasses('TLP:CLEAR')).toContain('bg-muted')
  })

  test('APT- prefix returns apt-themed classes', () => {
    expect(getTagClasses('APT-28')).toContain('tag-apt')
  })

  test('APT with space prefix returns apt-themed classes', () => {
    expect(getTagClasses('APT 29')).toContain('tag-apt')
  })

  test('unknown tag returns secondary', () => {
    expect(getTagClasses('random-tag')).toContain('bg-secondary')
  })
})
