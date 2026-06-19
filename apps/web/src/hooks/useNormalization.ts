import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { normalizationService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { NormalizationSearchParams } from '@/types'

export function useNormalizationPipelines(params?: NormalizationSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['normalization', 'pipelines', tenantId, params],
    queryFn: () => normalizationService.listPipelines(params),
    placeholderData: keepPreviousData,
  })
}

export function useNormalizationStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['normalization', 'stats', tenantId],
    queryFn: () => normalizationService.getStats(),
  })
}

export function useCreatePipeline() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.NORMALIZATION_CREATE)
      return normalizationService.createPipeline(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['normalization', tenantId] })
    },
  })
}

export function useUpdatePipeline() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.NORMALIZATION_UPDATE)
      return normalizationService.updatePipeline(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['normalization', tenantId] })
    },
  })
}

export function useDeletePipeline() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.NORMALIZATION_DELETE)
      return normalizationService.deletePipeline(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['normalization', tenantId] })
    },
  })
}
