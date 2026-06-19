import { describe, it, expect } from 'vitest'
import { CaseCycleStatus } from '@/enums'

describe('CaseCycleStatus', () => {
  it('should have ACTIVE value', () => {
    expect(CaseCycleStatus.ACTIVE).toBe('active')
  })

  it('should have CLOSED value', () => {
    expect(CaseCycleStatus.CLOSED).toBe('closed')
  })

  it('should only have 2 values', () => {
    expect(Object.values(CaseCycleStatus)).toHaveLength(2)
  })

  it('should contain all expected statuses', () => {
    const values = Object.values(CaseCycleStatus)
    expect(values).toContain('active')
    expect(values).toContain('closed')
  })
})
