import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { correlationService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CorrelationSearchParams } from '@/types'

export function useCorrelationRules(params?: CorrelationSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['correlation', tenantId, params],
    queryFn: () => correlationService.getRules(params),
  })
}

export function useCorrelationStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['correlation-stats', tenantId],
    queryFn: () => correlationService.getCorrelationStats(),
  })
}

export function useCreateRule() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.CORRELATION_CREATE)
      return correlationService.createRule(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['correlation', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['correlation-stats', tenantId] })
    },
  })
}

export function useUpdateRule() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.CORRELATION_UPDATE)
      return correlationService.updateRule(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['correlation', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['correlation-stats', tenantId] })
    },
  })
}

export function useDeleteRule() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.CORRELATION_DELETE)
      return correlationService.deleteRule(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['correlation', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['correlation-stats', tenantId] })
    },
  })
}
