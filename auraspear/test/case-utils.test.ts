import { describe, it, expect } from 'vitest'
import { CaseStatus } from '@/enums'
import { getAvailableTransitions, getInitials, STATUS_VARIANT_MAP } from '@/lib/case.utils'

// ─── STATUS_VARIANT_MAP ────────────────────────────────────────

describe('STATUS_VARIANT_MAP', () => {
  it('should map OPEN to default variant', () => {
    expect(STATUS_VARIANT_MAP[CaseStatus.OPEN]).toBe('default')
  })

  it('should map IN_PROGRESS to secondary variant', () => {
    expect(STATUS_VARIANT_MAP[CaseStatus.IN_PROGRESS]).toBe('secondary')
  })

  it('should map CLOSED to outline variant', () => {
    expect(STATUS_VARIANT_MAP[CaseStatus.CLOSED]).toBe('outline')
  })

  it('should have a mapping for every CaseStatus', () => {
    for (const status of Object.values(CaseStatus)) {
      expect(Reflect.get(STATUS_VARIANT_MAP, status)).toBeDefined()
    }
  })
})

// ─── getAvailableTransitions ───────────────────────────────────

describe('getAvailableTransitions', () => {
  it('OPEN can transition to IN_PROGRESS or CLOSED', () => {
    const transitions = getAvailableTransitions(CaseStatus.OPEN)
    expect(transitions).toContain(CaseStatus.IN_PROGRESS)
    expect(transitions).toContain(CaseStatus.CLOSED)
    expect(transitions).toHaveLength(2)
  })

  it('IN_PROGRESS can transition to CLOSED', () => {
    const transitions = getAvailableTransitions(CaseStatus.IN_PROGRESS)
    expect(transitions).toContain(CaseStatus.CLOSED)
    expect(transitions).toHaveLength(1)
  })

  it('CLOSED can transition to OPEN (re-open)', () => {
    const transitions = getAvailableTransitions(CaseStatus.CLOSED)
    expect(transitions).toContain(CaseStatus.OPEN)
    expect(transitions).toHaveLength(1)
  })
})

// ─── getInitials ───────────────────────────────────────────────

describe('getInitials', () => {
  it('should return two initials from full name', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  it('should return two initials from multi-word name', () => {
    expect(getInitials('Jane Alice Smith')).toBe('JA')
  })

  it('should return first char from single word', () => {
    expect(getInitials('Admin')).toBe('A')
  })

  it('should return "U" for null', () => {
    expect(getInitials(null)).toBe('U')
  })

  it('should return "U" for undefined', () => {
    expect(getInitials(undefined)).toBe('U')
  })

  it('should return "U" for empty string', () => {
    expect(getInitials('')).toBe('U')
  })

  it('should handle single character name', () => {
    const result = getInitials('A')
    expect(result).toBe('A')
  })
})
