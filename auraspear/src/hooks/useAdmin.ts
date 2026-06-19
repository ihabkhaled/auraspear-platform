import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { POLLING_INTERVAL } from '@/lib/constants'
import { requirePermission } from '@/lib/permissions'
import { adminService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type {
  AddUserInput,
  AssignUserInput,
  AuditLogParams,
  CreateTenantInput,
  TenantListParams,
  TenantUserListParams,
} from '@/types'

export function useTenants(params?: TenantListParams, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'tenants', params],
    queryFn: () => adminService.getTenants(params),
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useCurrentTenant(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['admin', tenantId, 'current-tenant'],
    queryFn: () => adminService.getCurrentTenant(),
    enabled,
  })
}

export function useCreateTenant() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (data: CreateTenantInput) => {
      requirePermission(permissions, Permission.ADMIN_TENANTS_CREATE)
      return adminService.createTenant(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
    },
  })
}

export function useTenantUsers(tenantId: string, params?: TenantUserListParams) {
  return useQuery({
    queryKey: ['admin', 'tenants', tenantId, 'users', params],
    queryFn: () => adminService.getUsers(tenantId, params),
    enabled: tenantId.length > 0,
    placeholderData: keepPreviousData,
  })
}

export function useAddUser() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: AddUserInput }) => {
      requirePermission(permissions, Permission.ADMIN_USERS_CREATE)
      return adminService.addUser(tenantId, data)
    },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId, 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
    },
  })
}

export function useServiceHealth(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['admin', tenantId, 'service-health'],
    queryFn: () => adminService.getServiceHealth(),
    enabled,
    refetchInterval: POLLING_INTERVAL,
  })
}

export function useAuditLogs(params?: AuditLogParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['admin', tenantId, 'audit-logs', params],
    queryFn: () => adminService.getAuditLogs(params),
  })
}

export function useUpdateTenant() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: { name: string } }) => {
      requirePermission(permissions, Permission.ADMIN_TENANTS_UPDATE)
      return adminService.updateTenant(tenantId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
    },
  })
}

export function useDeleteTenant() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (tenantId: string) => {
      requirePermission(permissions, Permission.ADMIN_TENANTS_DELETE)
      return adminService.deleteTenant(tenantId)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
    },
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({
      tenantId,
      userId,
      data,
    }: {
      tenantId: string
      userId: string
      data: { name?: string; role?: string; password?: string }
    }) => {
      requirePermission(permissions, Permission.ADMIN_USERS_UPDATE)
      return adminService.updateUser(tenantId, userId, data)
    },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId, 'users'] })
    },
  })
}

export function useRemoveUser() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) => {
      requirePermission(permissions, Permission.ADMIN_USERS_DELETE)
      return adminService.removeUser(tenantId, userId)
    },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId, 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
    },
  })
}

export function useBlockUser() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) => {
      requirePermission(permissions, Permission.ADMIN_USERS_BLOCK)
      return adminService.blockUser(tenantId, userId)
    },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId, 'users'] })
    },
  })
}

export function useUnblockUser() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) => {
      requirePermission(permissions, Permission.ADMIN_USERS_BLOCK)
      return adminService.unblockUser(tenantId, userId)
    },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId, 'users'] })
    },
  })
}

export function useRestoreUser() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) => {
      requirePermission(permissions, Permission.ADMIN_USERS_RESTORE)
      return adminService.restoreUser(tenantId, userId)
    },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId, 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
    },
  })
}

export function useCheckEmail(tenantId: string, email: string) {
  return useQuery({
    queryKey: ['admin', 'tenants', tenantId, 'check-email', email],
    queryFn: () => adminService.checkEmail(tenantId, email),
    enabled: tenantId.length > 0 && email.length > 0 && email.includes('@'),
  })
}

export function useAssignUser() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ tenantId, data }: { tenantId: string; data: AssignUserInput }) => {
      requirePermission(permissions, Permission.ADMIN_USERS_CREATE)
      return adminService.assignUser(tenantId, data)
    },
    onSuccess: (_data, { tenantId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants', tenantId, 'users'] })
      void queryClient.invalidateQueries({ queryKey: ['admin', 'tenants'] })
    },
  })
}

export function useImpersonateUser() {
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ tenantId, userId }: { tenantId: string; userId: string }) => {
      requirePermission(permissions, Permission.ADMIN_USERS_UPDATE)
      return adminService.impersonateUser(tenantId, userId)
    },
  })
}
