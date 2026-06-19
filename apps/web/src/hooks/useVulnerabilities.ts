import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { vulnerabilityService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { VulnerabilitySearchParams } from '@/types'

export function useVulnerabilities(params?: VulnerabilitySearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['vulnerabilities', tenantId, params],
    queryFn: () => vulnerabilityService.getVulnerabilities(params),
  })
}

export function useVulnerabilityStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['vulnerability-stats', tenantId],
    queryFn: () => vulnerabilityService.getVulnerabilityStats(),
  })
}

export function useCreateVulnerability() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.VULNERABILITIES_CREATE)
      return vulnerabilityService.createVulnerability(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vulnerabilities', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['vulnerability-stats', tenantId] })
    },
  })
}

export function useUpdateVulnerability() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.VULNERABILITIES_UPDATE)
      return vulnerabilityService.updateVulnerability(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vulnerabilities', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['vulnerability-stats', tenantId] })
    },
  })
}

export function useDeleteVulnerability() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.VULNERABILITIES_DELETE)
      return vulnerabilityService.deleteVulnerability(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['vulnerabilities', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['vulnerability-stats', tenantId] })
    },
  })
}
