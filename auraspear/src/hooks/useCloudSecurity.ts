import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { cloudSecurityService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CloudAccountSearchParams, CloudFindingSearchParams } from '@/types'

export function useCloudAccounts(params?: CloudAccountSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['cloud-security', 'accounts', tenantId, params],
    queryFn: () => cloudSecurityService.listAccounts(params),
    placeholderData: keepPreviousData,
  })
}

export function useCloudSecurityStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['cloud-security', 'stats', tenantId],
    queryFn: () => cloudSecurityService.getStats(),
  })
}

export function useCreateCloudAccount() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.CLOUD_SECURITY_CREATE)
      return cloudSecurityService.createAccount(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cloud-security', tenantId] })
    },
  })
}

export function useUpdateCloudAccount() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.CLOUD_SECURITY_UPDATE)
      return cloudSecurityService.updateAccount(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cloud-security', tenantId] })
    },
  })
}

export function useDeleteCloudAccount() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.CLOUD_SECURITY_DELETE)
      return cloudSecurityService.deleteAccount(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['cloud-security', tenantId] })
    },
  })
}

export function useCloudFindings(params?: CloudFindingSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['cloud-security', 'findings', tenantId, params],
    queryFn: () => cloudSecurityService.listFindings(params),
    enabled: params !== undefined,
    placeholderData: keepPreviousData,
  })
}
