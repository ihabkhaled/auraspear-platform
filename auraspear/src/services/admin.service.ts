import api from '@/lib/api'
import type {
  AddUserInput,
  ApiResponse,
  ApplicationLogEntry,
  AppLogSearchParams,
  AssignUserInput,
  AuditLogEntry,
  AuditLogParams,
  CheckEmailResult,
  CreateTenantInput,
  ImpersonateResponse,
  ServiceHealth,
  Tenant,
  TenantListParams,
  TenantMember,
  TenantUser,
  TenantUserListParams,
} from '@/types'

export const adminService = {
  getTenants: (params?: TenantListParams) =>
    api.get<ApiResponse<Tenant[]>>('/admin/tenants', { params }).then(r => r.data),

  getCurrentTenant: () => api.get<ApiResponse<Tenant>>('/admin/tenants/current').then(r => r.data),

  createTenant: (data: CreateTenantInput) =>
    api.post<ApiResponse<Tenant>>('/admin/tenants', data).then(r => r.data),

  getUsers: (tenantId: string, params?: TenantUserListParams) =>
    api
      .get<ApiResponse<TenantUser[]>>(`/admin/tenants/${tenantId}/users`, { params })
      .then(r => r.data),

  addUser: (tenantId: string, data: AddUserInput) =>
    api.post<ApiResponse<TenantUser>>(`/admin/tenants/${tenantId}/users`, data).then(r => r.data),

  checkEmail: (tenantId: string, email: string) =>
    api
      .get<ApiResponse<CheckEmailResult>>(`/admin/tenants/${tenantId}/users/check-email`, {
        params: { email },
      })
      .then(r => r.data),

  assignUser: (tenantId: string, data: AssignUserInput) =>
    api
      .post<ApiResponse<TenantUser>>(`/admin/tenants/${tenantId}/users/assign`, data)
      .then(r => r.data),

  getServiceHealth: () => api.get<ApiResponse<ServiceHealth[]>>('/admin/health').then(r => r.data),

  getAuditLogs: (params?: AuditLogParams) =>
    api.get<ApiResponse<AuditLogEntry[]>>('/admin/audit-logs', { params }).then(r => r.data),

  updateTenant: (tenantId: string, data: { name: string }) =>
    api.patch<ApiResponse<Tenant>>(`/admin/tenants/${tenantId}`, data).then(r => r.data),

  deleteTenant: (tenantId: string) =>
    api.delete<ApiResponse<{ deleted: boolean }>>(`/admin/tenants/${tenantId}`).then(r => r.data),

  updateUser: (
    tenantId: string,
    userId: string,
    data: { name?: string; role?: string; password?: string }
  ) =>
    api
      .patch<ApiResponse<TenantUser>>(`/admin/tenants/${tenantId}/users/${userId}`, data)
      .then(r => r.data),

  removeUser: (tenantId: string, userId: string) =>
    api
      .delete<ApiResponse<{ deleted: boolean }>>(`/admin/tenants/${tenantId}/users/${userId}`)
      .then(r => r.data),

  blockUser: (tenantId: string, userId: string) =>
    api
      .post<ApiResponse<TenantUser>>(`/admin/tenants/${tenantId}/users/${userId}/block`)
      .then(r => r.data),

  unblockUser: (tenantId: string, userId: string) =>
    api
      .post<ApiResponse<TenantUser>>(`/admin/tenants/${tenantId}/users/${userId}/unblock`)
      .then(r => r.data),

  restoreUser: (tenantId: string, userId: string) =>
    api
      .post<ApiResponse<TenantUser>>(`/admin/tenants/${tenantId}/users/${userId}/restore`)
      .then(r => r.data),

  impersonateUser: (tenantId: string, userId: string) =>
    api
      .post<
        ApiResponse<ImpersonateResponse>
      >(`/admin/tenants/${tenantId}/users/${userId}/impersonate`, {})
      .then(r => r.data),

  getMembers: () => api.get<ApiResponse<TenantMember[]>>('/members').then(r => r.data),

  getAppLogs: (params?: AppLogSearchParams) =>
    api.get<ApiResponse<ApplicationLogEntry[]>>('/admin/app-logs', { params }).then(r => r.data),

  getAppLogById: (id: string) =>
    api.get<ApiResponse<ApplicationLogEntry>>(`/admin/app-logs/${id}`).then(r => r.data),
}
