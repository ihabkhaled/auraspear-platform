import { describe, expect, it } from 'vitest'
import { UserRole, UserSessionStatus, UserStatus, UsersControlUserSortField } from '@/enums'
import {
  canManageUsersControlTarget,
  getUsersControlMembershipStatusLabelKey,
  getUsersControlPresenceLabelKey,
  getUsersControlSessionStatusLabelKey,
  isUsersControlSortField,
} from '@/lib/users-control'
import type { UsersControlUser } from '@/types'

const BASE_USER: UsersControlUser = {
  id: 'user-001',
  name: 'Analyst One',
  email: 'analyst.one@auraspear.com',
  createdAt: '2026-03-18T10:00:00.000Z',
  role: UserRole.SOC_ANALYST_L1,
  status: UserStatus.ACTIVE,
  tenantId: 'tenant-001',
  tenantName: 'AuraSpear',
  tenantCount: 1,
  lastLoginAt: null,
  lastSeenAt: null,
  isOnline: false,
  activeSessionCount: 0,
  totalSessionCount: 0,
  sessionPlatforms: [],
  isProtected: false,
  hasGlobalAdminMembership: false,
  mfaEnabled: true,
}

describe('users control utilities', () => {
  it('recognizes valid users control sort fields', () => {
    expect(isUsersControlSortField(UsersControlUserSortField.NAME)).toBe(true)
    expect(isUsersControlSortField(UsersControlUserSortField.ACTIVE_SESSION_COUNT)).toBe(true)
    expect(isUsersControlSortField('invalid-sort')).toBe(false)
  })

  it('returns relative translation keys for badges and statuses', () => {
    expect(getUsersControlPresenceLabelKey(true)).toBe('online')
    expect(getUsersControlMembershipStatusLabelKey(UserStatus.SUSPENDED)).toBe(
      'membershipStatus.suspended'
    )
    expect(getUsersControlSessionStatusLabelKey(UserSessionStatus.REVOKED)).toBe(
      'sessionStatus.revoked'
    )
  })

  it('allows global admins to manage any target', () => {
    expect(
      canManageUsersControlTarget(UserRole.GLOBAL_ADMIN, {
        ...BASE_USER,
        isProtected: true,
        hasGlobalAdminMembership: true,
      })
    ).toBe(true)
  })

  it('blocks tenant admins from managing protected or global-admin targets', () => {
    expect(
      canManageUsersControlTarget(UserRole.TENANT_ADMIN, {
        ...BASE_USER,
        isProtected: true,
      })
    ).toBe(false)
    expect(
      canManageUsersControlTarget(UserRole.TENANT_ADMIN, {
        ...BASE_USER,
        hasGlobalAdminMembership: true,
      })
    ).toBe(false)
  })

  it('allows tenant admins to manage non-protected tenant users', () => {
    expect(canManageUsersControlTarget(UserRole.TENANT_ADMIN, BASE_USER)).toBe(true)
  })

  it('blocks non-admin roles from managing any target', () => {
    expect(canManageUsersControlTarget(UserRole.SOC_ANALYST_L1, BASE_USER)).toBe(false)
    expect(canManageUsersControlTarget(UserRole.SOC_ANALYST_L2, BASE_USER)).toBe(false)
    expect(canManageUsersControlTarget(UserRole.THREAT_HUNTER, BASE_USER)).toBe(false)
    expect(canManageUsersControlTarget(UserRole.EXECUTIVE_READONLY, BASE_USER)).toBe(false)
    expect(canManageUsersControlTarget(UserRole.AUDITOR_READONLY, BASE_USER)).toBe(false)
  })

  it('blocks tenant admin from managing global admin even if not protected', () => {
    expect(
      canManageUsersControlTarget(UserRole.TENANT_ADMIN, {
        ...BASE_USER,
        isProtected: false,
        hasGlobalAdminMembership: true,
      })
    ).toBe(false)
  })

  it('handles null or undefined actor role safely', () => {
    expect(canManageUsersControlTarget(null, BASE_USER)).toBe(false)
    expect(canManageUsersControlTarget(undefined, BASE_USER)).toBe(false)
  })
})
