import { describe, it, expect, beforeEach } from 'vitest'
import { Permission } from '@/enums'
import { useAuthStore } from '@/stores/auth.store'

describe('useAuthStore — permissions', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  it('initial state has empty permissions array', () => {
    const state = useAuthStore.getState()
    expect(state.permissions).toEqual([])
  })

  it('setPermissions updates the permissions array', () => {
    const perms = [Permission.ALERTS_VIEW, Permission.CASES_VIEW, Permission.DASHBOARD_VIEW]
    useAuthStore.getState().setPermissions(perms)
    expect(useAuthStore.getState().permissions).toEqual(perms)
  })

  it('setPermissions replaces previous permissions entirely', () => {
    useAuthStore.getState().setPermissions([Permission.ALERTS_VIEW])
    useAuthStore.getState().setPermissions([Permission.CASES_VIEW, Permission.HUNT_CREATE])

    const { permissions } = useAuthStore.getState()
    expect(permissions).toEqual([Permission.CASES_VIEW, Permission.HUNT_CREATE])
    expect(permissions).not.toContain(Permission.ALERTS_VIEW)
  })

  it('setPermissions with empty array clears permissions', () => {
    useAuthStore.getState().setPermissions([Permission.ALERTS_VIEW, Permission.CASES_VIEW])
    useAuthStore.getState().setPermissions([])
    expect(useAuthStore.getState().permissions).toEqual([])
  })

  it('logout clears permissions', () => {
    useAuthStore
      .getState()
      .setPermissions([
        Permission.ALERTS_VIEW,
        Permission.ALERTS_INVESTIGATE,
        Permission.CASES_CREATE,
      ])
    useAuthStore.getState().logout()
    expect(useAuthStore.getState().permissions).toEqual([])
  })

  it('logout clears permissions along with other auth state', () => {
    useAuthStore.getState().setTokens('access-tok', 'refresh-tok')
    useAuthStore.getState().setUser({ id: 'u1', email: 'test@test.com', name: 'Test' } as never)
    useAuthStore.getState().setPermissions([Permission.ADMIN_USERS_VIEW])

    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.permissions).toEqual([])
    expect(state.accessToken).toBe('')
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
  })

  it('setPermissions does not affect other auth state', () => {
    useAuthStore.getState().setTokens('tok', 'ref')
    useAuthStore.getState().setUser({ id: 'u1' } as never)

    useAuthStore.getState().setPermissions([Permission.ALERTS_VIEW])

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('tok')
    expect(state.user).toEqual({ id: 'u1' })
    expect(state.permissions).toEqual([Permission.ALERTS_VIEW])
  })

  it('handles a large permissions array', () => {
    const allPermissions = Object.values(Permission)
    useAuthStore.getState().setPermissions(allPermissions)
    expect(useAuthStore.getState().permissions).toHaveLength(allPermissions.length)
    expect(useAuthStore.getState().permissions).toEqual(allPermissions)
  })
})
