import api from '@/lib/api'
import type {
  ApiResponse,
  EndImpersonationResponse,
  LoginResponse,
  MeResponse,
  RefreshResponse,
  TenantMembershipInfo,
} from '@/types'

export const authService = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then(r => r.data),

  refresh: () => api.post<RefreshResponse>('/auth/refresh', {}).then(r => r.data),

  getMe: () => api.get<MeResponse>('/auth/me').then(r => r.data),

  getUserTenants: () => api.get<TenantMembershipInfo[]>('/auth/tenants').then(r => r.data),

  logout: () => api.post('/auth/logout', {}).then(r => r.data),

  endImpersonation: () =>
    api.post<ApiResponse<EndImpersonationResponse>>('/auth/end-impersonation').then(r => r.data),
}
