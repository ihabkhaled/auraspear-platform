import type { AlertSeverity, HuntStatus, TimeRange } from '@/enums'
import type { HuntMessage, Tenant, TenantMembershipInfo } from '@/types'

export interface FilterStoreState {
  severity: AlertSeverity[]
  timeRange: TimeRange
  agents: string[]
  kqlQuery: string
  setSeverity: (severity: AlertSeverity[]) => void
  setTimeRange: (timeRange: TimeRange) => void
  setAgents: (agents: string[]) => void
  setKqlQuery: (query: string) => void
  resetFilters: () => void
}

export interface HuntStoreState {
  messages: HuntMessage[]
  huntStatus: HuntStatus | null
  huntId: string | null
  addMessage: (message: HuntMessage) => void
  setHuntStatus: (status: HuntStatus) => void
  setHuntId: (id: string) => void
  resetHuntState: () => void
  clearSession: () => void
}

export interface NotificationUIStoreState {
  panelOpen: boolean
  setPanelOpen: (open: boolean) => void
}

export interface TenantStoreState {
  currentTenantId: string
  tenants: Tenant[]
  userTenants: TenantMembershipInfo[]
  setCurrentTenant: (id: string) => void
  setTenants: (tenants: Tenant[]) => void
  setUserTenants: (tenants: TenantMembershipInfo[]) => void
}

export interface UIStoreState {
  sidebarCollapsed: boolean
  mobileSidebarOpen: boolean
  commandPaletteOpen: boolean
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  toggleMobileSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
}
