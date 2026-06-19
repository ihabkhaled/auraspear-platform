import { describe, test, expect, beforeEach } from 'vitest'
import { TimeRange } from '@/enums'
import { useAuthStore } from '@/stores/auth.store'
import { useFilterStore } from '@/stores/filter.store'
import { useHuntStore } from '@/stores/hunt.store'
import { useNotificationStore } from '@/stores/notification.store'
import { useTenantStore } from '@/stores/tenant.store'
import { useUIStore } from '@/stores/ui.store'

/* ------------------------------------------------------------------ */
/* Auth Store                                                           */
/* ------------------------------------------------------------------ */

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().logout()
  })

  test('initial state has no auth', () => {
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('')
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.impersonator).toBeNull()
  })

  test('setTokens sets tokens and isAuthenticated', () => {
    useAuthStore.getState().setTokens('access-123', 'refresh-456')
    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('access-123')
    expect(state.isAuthenticated).toBe(true)
  })

  test('setTokens with empty accessToken sets isAuthenticated false', () => {
    useAuthStore.getState().setTokens('', 'refresh-456')
    expect(useAuthStore.getState().isAuthenticated).toBe(false)
  })

  test('setUser sets user', () => {
    const user = { id: 'u1', email: 'test@test.com', name: 'Test', role: 'TENANT_ADMIN' }
    useAuthStore.getState().setUser(user as never)
    expect(useAuthStore.getState().user).toEqual(user)
  })

  test('startImpersonation sets impersonator', () => {
    const imp = { userId: 'admin-1', email: 'admin@test.com', name: 'Admin' }
    useAuthStore.getState().startImpersonation(imp as never)
    expect(useAuthStore.getState().impersonator).toEqual(imp)
  })

  test('endImpersonation clears impersonator only', () => {
    useAuthStore.getState().setTokens('tok', 'ref')
    useAuthStore.getState().startImpersonation({ userId: 'a', email: 'a@a.com' } as never)
    useAuthStore.getState().endImpersonation()
    expect(useAuthStore.getState().impersonator).toBeNull()
    expect(useAuthStore.getState().accessToken).toBe('tok')
  })

  test('logout clears all state', () => {
    useAuthStore.getState().setTokens('tok', 'ref')
    useAuthStore.getState().setUser({ id: 'u1' } as never)
    useAuthStore.getState().startImpersonation({ userId: 'a' } as never)
    useAuthStore.getState().logout()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('')
    expect(state.user).toBeNull()
    expect(state.isAuthenticated).toBe(false)
    expect(state.impersonator).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/* Tenant Store                                                         */
/* ------------------------------------------------------------------ */

describe('useTenantStore', () => {
  beforeEach(() => {
    useTenantStore.setState({ currentTenantId: '', tenants: [], userTenants: [] })
  })

  test('setCurrentTenant updates ID', () => {
    useTenantStore.getState().setCurrentTenant('tenant-123')
    expect(useTenantStore.getState().currentTenantId).toBe('tenant-123')
  })

  test('setTenants replaces tenants array', () => {
    const tenants = [{ id: 't1', name: 'Tenant 1' }]
    useTenantStore.getState().setTenants(tenants as never[])
    expect(useTenantStore.getState().tenants).toEqual(tenants)
  })

  test('setUserTenants replaces userTenants array', () => {
    const userTenants = [{ id: 't1', name: 'T1', slug: 't1', role: 'TENANT_ADMIN' }]
    useTenantStore.getState().setUserTenants(userTenants as never[])
    expect(useTenantStore.getState().userTenants).toEqual(userTenants)
  })
})

/* ------------------------------------------------------------------ */
/* Filter Store                                                         */
/* ------------------------------------------------------------------ */

describe('useFilterStore', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters()
  })

  test('initial state has defaults', () => {
    const state = useFilterStore.getState()
    expect(state.severity).toEqual([])
    expect(state.timeRange).toBe(TimeRange.H24)
    expect(state.agents).toEqual([])
    expect(state.kqlQuery).toBe('')
  })

  test('setSeverity updates severity array', () => {
    useFilterStore.getState().setSeverity(['critical', 'high'] as never[])
    expect(useFilterStore.getState().severity).toEqual(['critical', 'high'])
  })

  test('setTimeRange updates time range', () => {
    useFilterStore.getState().setTimeRange(TimeRange.D7)
    expect(useFilterStore.getState().timeRange).toBe(TimeRange.D7)
  })

  test('setAgents updates agents array', () => {
    useFilterStore.getState().setAgents(['web-01', 'db-01'])
    expect(useFilterStore.getState().agents).toEqual(['web-01', 'db-01'])
  })

  test('setKqlQuery updates query', () => {
    useFilterStore.getState().setKqlQuery('severity:critical')
    expect(useFilterStore.getState().kqlQuery).toBe('severity:critical')
  })

  test('resetFilters returns to initial state', () => {
    useFilterStore.getState().setSeverity(['critical'] as never[])
    useFilterStore.getState().setTimeRange(TimeRange.D30)
    useFilterStore.getState().setKqlQuery('test')
    useFilterStore.getState().resetFilters()

    const state = useFilterStore.getState()
    expect(state.severity).toEqual([])
    expect(state.timeRange).toBe(TimeRange.H24)
    expect(state.kqlQuery).toBe('')
  })
})

/* ------------------------------------------------------------------ */
/* Hunt Store                                                           */
/* ------------------------------------------------------------------ */

describe('useHuntStore', () => {
  beforeEach(() => {
    useHuntStore.getState().clearSession()
  })

  test('initial state is empty', () => {
    const state = useHuntStore.getState()
    expect(state.messages).toEqual([])
    expect(state.huntStatus).toBeNull()
    expect(state.huntId).toBeNull()
  })

  test('addMessage appends to messages', () => {
    const msg1 = { id: '1', role: 'user', content: 'hello' }
    const msg2 = { id: '2', role: 'ai', content: 'world' }
    useHuntStore.getState().addMessage(msg1 as never)
    useHuntStore.getState().addMessage(msg2 as never)

    const { messages } = useHuntStore.getState()
    expect(messages).toHaveLength(2)
    expect(messages[0]).toEqual(msg1)
    expect(messages[1]).toEqual(msg2)
  })

  test('setHuntStatus updates status', () => {
    useHuntStore.getState().setHuntStatus('running' as never)
    expect(useHuntStore.getState().huntStatus).toBe('running')
  })

  test('setHuntId updates ID', () => {
    useHuntStore.getState().setHuntId('hunt-123')
    expect(useHuntStore.getState().huntId).toBe('hunt-123')
  })

  test('clearSession resets all state', () => {
    useHuntStore.getState().addMessage({ id: '1' } as never)
    useHuntStore.getState().setHuntStatus('running' as never)
    useHuntStore.getState().setHuntId('hunt-1')
    useHuntStore.getState().clearSession()

    const state = useHuntStore.getState()
    expect(state.messages).toEqual([])
    expect(state.huntStatus).toBeNull()
    expect(state.huntId).toBeNull()
  })
})

/* ------------------------------------------------------------------ */
/* UI Store                                                             */
/* ------------------------------------------------------------------ */

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      sidebarCollapsed: false,
      mobileSidebarOpen: false,
      commandPaletteOpen: false,
    })
  })

  test('initial state all false', () => {
    const state = useUIStore.getState()
    expect(state.sidebarCollapsed).toBe(false)
    expect(state.mobileSidebarOpen).toBe(false)
    expect(state.commandPaletteOpen).toBe(false)
  })

  test('toggleSidebar flips sidebarCollapsed', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })

  test('setMobileSidebarOpen sets value', () => {
    useUIStore.getState().setMobileSidebarOpen(true)
    expect(useUIStore.getState().mobileSidebarOpen).toBe(true)
  })

  test('toggleMobileSidebar flips mobileSidebarOpen', () => {
    useUIStore.getState().toggleMobileSidebar()
    expect(useUIStore.getState().mobileSidebarOpen).toBe(true)
    useUIStore.getState().toggleMobileSidebar()
    expect(useUIStore.getState().mobileSidebarOpen).toBe(false)
  })

  test('setCommandPaletteOpen sets value', () => {
    useUIStore.getState().setCommandPaletteOpen(true)
    expect(useUIStore.getState().commandPaletteOpen).toBe(true)
  })
})

/* ------------------------------------------------------------------ */
/* Notification Store (UI state only — data is in React Query)         */
/* ------------------------------------------------------------------ */

describe('useNotificationStore', () => {
  beforeEach(() => {
    useNotificationStore.setState({ panelOpen: false })
  })

  test('initial state has panel closed', () => {
    const state = useNotificationStore.getState()
    expect(state.panelOpen).toBe(false)
  })

  test('setPanelOpen opens the panel', () => {
    useNotificationStore.getState().setPanelOpen(true)
    expect(useNotificationStore.getState().panelOpen).toBe(true)
  })

  test('setPanelOpen closes the panel', () => {
    useNotificationStore.getState().setPanelOpen(true)
    useNotificationStore.getState().setPanelOpen(false)
    expect(useNotificationStore.getState().panelOpen).toBe(false)
  })
})
