import { describe, test, expect } from 'vitest'
import { UserRole } from '@/enums'
import { getStatusDotClass, getRoleBadgeClass } from '@/lib/admin-utils'

describe('getStatusDotClass (admin)', () => {
  test('active user returns success', () => {
    expect(getStatusDotClass(true, false, false)).toBe('bg-status-success')
  })

  test('blocked user returns warning', () => {
    expect(getStatusDotClass(false, true, false)).toBe('bg-status-warning')
  })

  test('deleted user returns error', () => {
    expect(getStatusDotClass(false, false, true)).toBe('bg-status-error')
  })

  test('no flags returns neutral', () => {
    expect(getStatusDotClass(false, false, false)).toBe('bg-status-neutral')
  })

  test('active takes priority over blocked', () => {
    expect(getStatusDotClass(true, true, false)).toBe('bg-status-success')
  })

  test('active takes priority over deleted', () => {
    expect(getStatusDotClass(true, false, true)).toBe('bg-status-success')
  })

  test('blocked takes priority over deleted', () => {
    expect(getStatusDotClass(false, true, true)).toBe('bg-status-warning')
  })
})

describe('getRoleBadgeClass', () => {
  test('GLOBAL_ADMIN returns primary classes', () => {
    expect(getRoleBadgeClass(UserRole.GLOBAL_ADMIN)).toContain('text-primary')
  })

  test('TENANT_ADMIN returns primary classes', () => {
    expect(getRoleBadgeClass(UserRole.TENANT_ADMIN)).toContain('text-primary')
  })

  test('SOC_ANALYST_L1 returns chart-1 classes', () => {
    expect(getRoleBadgeClass(UserRole.SOC_ANALYST_L1)).toContain('chart-1')
  })

  test('SOC_ANALYST_L2 returns chart-1 classes', () => {
    expect(getRoleBadgeClass(UserRole.SOC_ANALYST_L2)).toContain('chart-1')
  })

  test('THREAT_HUNTER returns chart-3 classes', () => {
    expect(getRoleBadgeClass(UserRole.THREAT_HUNTER)).toContain('chart-3')
  })

  test('EXECUTIVE_READONLY returns muted classes', () => {
    expect(getRoleBadgeClass(UserRole.EXECUTIVE_READONLY)).toContain('text-muted-foreground')
  })
})
