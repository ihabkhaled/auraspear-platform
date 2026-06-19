import type { UserRole } from '@/enums'

export interface AuthUser {
  sub: string
  email: string
  tenantId: string
  tenantSlug: string
  role: UserRole
}

export interface LoginRequest {
  email: string
  password: string
}

export interface TenantMembershipInfo {
  id: string
  name: string
  slug: string
  role: UserRole
}

export interface LoginResponse {
  accessToken: string
  csrfToken: string
  user: AuthUser
  permissions: string[]
  tenants: TenantMembershipInfo[]
}

export interface MeResponse {
  user: AuthUser
  permissions: string[]
}

export interface RefreshResponse {
  accessToken: string
  csrfToken: string
}

export interface BackendLoginResponse {
  accessToken: string
  csrfToken: string
  user: {
    sub: string
    email: string
    tenantId: string
    tenantSlug: string
    role: UserRole
  }
  permissions: string[]
}

export interface ImpersonationInfo {
  sub: string
  email: string
  role: UserRole
  tenantId: string
  tenantSlug: string
}

export interface ImpersonateResponse {
  accessToken: string
  csrfToken: string
  user: {
    sub: string
    email: string
    tenantId: string
    tenantSlug: string
    role: UserRole
  }
  impersonator: ImpersonationInfo
}

export interface EndImpersonationResponse {
  accessToken: string
  csrfToken: string
  user: {
    sub: string
    email: string
    tenantId: string
    tenantSlug: string
    role: UserRole
  }
}

export interface BackendLoginWithTenants extends BackendLoginResponse {
  tenants: TenantMembershipInfo[]
}

export interface BackendRefreshResponse {
  accessToken: string
  csrfToken: string
}

export interface AuthState {
  accessToken: string
  user: AuthUser | null
  isAuthenticated: boolean
  permissions: string[]
  impersonator: ImpersonationInfo | null
  setTokens: (accessToken: string, refreshToken?: string) => void
  setUser: (user: AuthUser) => void
  setPermissions: (permissions: string[]) => void
  startImpersonation: (impersonator: ImpersonationInfo) => void
  endImpersonation: () => void
  logout: () => void
}
