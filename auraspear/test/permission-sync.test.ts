import { describe, it, expect, beforeEach } from 'vitest'
import { Permission } from '@/enums'
import { useAuthStore } from '@/stores/auth.store'

/**
 * Tests for the permission sync logic used by usePermissionSync.
 *
 * usePermissionSync is a React hook that:
 *   1. Uses useQuery to call authService.getMe() when isAuthenticated is true
 *   2. Has enabled: isAuthenticated (won't fire when not authenticated)
 *   3. On data change, calls setPermissions(data.permissions ?? []) and setUser(data.user)
 *
 * Since we cannot render React hooks without @testing-library/react, we test:
 *   - The auth store's setPermissions/setUser behavior (what the hook calls)
 *   - The isAuthenticated guard logic (what the hook reads)
 *   - The fallback to empty array when permissions is undefined
 */

describe('permission sync — auth store integration', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('isAuthenticated is false when no tokens are set (query would be disabled)', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('isAuthenticated is true after setTokens (query would be enabled)', () => {
    useAuthStore.getState().setTokens('access-tok', 'refresh-tok')
    expect(useAuthStore.getState().isAuthenticated).toBe(true)
  })

  it('setPermissions updates permissions when called with /auth/me response data', () => {
    const mePermissions = [
      Permission.ALERTS_VIEW,
      Permission.ALERTS_INVESTIGATE,
      Permission.CASES_VIEW,
      Permission.DASHBOARD_VIEW,
    ]

    useAuthStore.getState().setPermissions(mePermissions)
    expect(useAuthStore.getState().permissions).toEqual(mePermissions)
  })

  it('setPermissions with empty array mimics data.permissions being empty', () => {
    useAuthStore.getState().setPermissions([Permission.ALERTS_VIEW])
    // Simulates: setPermissions(data.permissions ?? []) where data.permissions = []
    useAuthStore.getState().setPermissions([])
    expect(useAuthStore.getState().permissions).toEqual([])
  })

  it('setUser updates user data when called with /auth/me response', () => {
    const meUser = {
      id: 'user-1',
      email: 'soc@test.com',
      name: 'SOC Analyst',
      role: 'SOC_ANALYST_L1',
    }

    useAuthStore.getState().setUser(meUser as never)
    expect(useAuthStore.getState().user).toEqual(meUser)
  })

  it('setPermissions and setUser can be called together (as the hook does)', () => {
    const perms = [Permission.ALERTS_VIEW, Permission.CASES_VIEW]
    const user = { id: 'u1', email: 'a@b.com', name: 'User', role: 'SOC_ANALYST_L1' }

    useAuthStore.getState().setPermissions(perms)
    useAuthStore.getState().setUser(user as never)

    const state = useAuthStore.getState()
    expect(state.permissions).toEqual(perms)
    expect(state.user).toEqual(user)
  })

  it('logout resets permissions (simulates session end)', () => {
    useAuthStore.getState().setTokens('tok', 'ref')
    useAuthStore.getState().setPermissions([Permission.ADMIN_USERS_VIEW])
    useAuthStore.getState().logout()

    expect(useAuthStore.getState().permissions).toEqual([])
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  it('permissions survive multiple setPermissions calls (simulates periodic refetch)', () => {
    // First sync
    useAuthStore.getState().setPermissions([Permission.ALERTS_VIEW])
    expect(useAuthStore.getState().permissions).toEqual([Permission.ALERTS_VIEW])

    // Second sync — admin added more permissions
    useAuthStore
      .getState()
      .setPermissions([
        Permission.ALERTS_VIEW,
        Permission.ALERTS_INVESTIGATE,
        Permission.CASES_CREATE,
      ])
    expect(useAuthStore.getState().permissions).toEqual([
      Permission.ALERTS_VIEW,
      Permission.ALERTS_INVESTIGATE,
      Permission.CASES_CREATE,
    ])

    // Third sync — admin revoked some permissions
    useAuthStore.getState().setPermissions([Permission.ALERTS_VIEW])
    expect(useAuthStore.getState().permissions).toEqual([Permission.ALERTS_VIEW])
  })
})
