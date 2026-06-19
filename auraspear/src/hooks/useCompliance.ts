import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { complianceService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { ComplianceSearchParams } from '@/types'

export function useComplianceFrameworks(params?: ComplianceSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['compliance', 'frameworks', tenantId, params],
    queryFn: () => complianceService.getFrameworks(params),
    placeholderData: keepPreviousData,
  })
}

export function useComplianceStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['compliance', 'stats', tenantId],
    queryFn: () => complianceService.getStats(),
  })
}

export function useCreateFramework() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.COMPLIANCE_CREATE)
      return complianceService.createFramework(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['compliance', tenantId] })
    },
  })
}

export function useUpdateFramework() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.COMPLIANCE_UPDATE)
      return complianceService.updateFramework(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['compliance', tenantId] })
    },
  })
}

export function useDeleteFramework() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.COMPLIANCE_UPDATE)
      return complianceService.deleteFramework(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['compliance', tenantId] })
    },
  })
}

export function useComplianceControls(frameworkId: string | null) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['compliance', 'controls', tenantId, frameworkId],
    queryFn: () => complianceService.getControls(frameworkId ?? ''),
    enabled: frameworkId !== null && frameworkId.length > 0,
  })
}

export function useUpdateControl() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({
      frameworkId,
      controlId,
      data,
    }: {
      frameworkId: string
      controlId: string
      data: Record<string, unknown>
    }) => {
      requirePermission(permissions, Permission.COMPLIANCE_UPDATE)
      return complianceService.updateControl(frameworkId, controlId, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['compliance', tenantId] })
    },
  })
}
