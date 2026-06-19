export interface AuthStorageState {
  state?: {
    accessToken?: string
    isAuthenticated?: boolean
    user?: { tenantId?: string }
  }
}

export interface TenantStorageState {
  state?: {
    currentTenantId?: string
  }
}
