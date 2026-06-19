import { describe, test, expect } from 'vitest'
import { CaseStatus } from '@/enums'
import { STATUS_VARIANT_MAP, getAvailableTransitions, getInitials } from '@/lib/case.utils'

describe('STATUS_VARIANT_MAP', () => {
  test('OPEN maps to default', () => {
    expect(STATUS_VARIANT_MAP[CaseStatus.OPEN]).toBe('default')
  })

  test('IN_PROGRESS maps to secondary', () => {
    expect(STATUS_VARIANT_MAP[CaseStatus.IN_PROGRESS]).toBe('secondary')
  })

  test('CLOSED maps to outline', () => {
    expect(STATUS_VARIANT_MAP[CaseStatus.CLOSED]).toBe('outline')
  })
})

describe('getAvailableTransitions', () => {
  test('OPEN can transition to IN_PROGRESS or CLOSED', () => {
    const transitions = getAvailableTransitions(CaseStatus.OPEN)
    expect(transitions).toEqual([CaseStatus.IN_PROGRESS, CaseStatus.CLOSED])
  })

  test('IN_PROGRESS can transition to CLOSED', () => {
    const transitions = getAvailableTransitions(CaseStatus.IN_PROGRESS)
    expect(transitions).toEqual([CaseStatus.CLOSED])
  })

  test('CLOSED can transition to OPEN (re-open)', () => {
    const transitions = getAvailableTransitions(CaseStatus.CLOSED)
    expect(transitions).toEqual([CaseStatus.OPEN])
  })
})

describe('getInitials', () => {
  test('full name returns two initials', () => {
    expect(getInitials('John Doe')).toBe('JD')
  })

  test('single name returns one initial', () => {
    expect(getInitials('John')).toBe('J')
  })

  test('null returns U', () => {
    expect(getInitials(null)).toBe('U')
  })

  test('undefined returns U', () => {
    expect(getInitials(undefined)).toBe('U')
  })

  test('empty string returns U', () => {
    expect(getInitials('')).toBe('U')
  })

  test('three words returns first two initials', () => {
    expect(getInitials('Alice Bob Charlie')).toBe('AB')
  })

  test('converts to uppercase', () => {
    expect(getInitials('john doe')).toBe('JD')
  })
})
