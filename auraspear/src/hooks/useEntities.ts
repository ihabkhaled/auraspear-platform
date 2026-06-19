import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { entityService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CreateEntityInput, EntitySearchParams, UpdateEntityInput } from '@/types'

export function useEntities(params?: EntitySearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['entities', tenantId, params],
    queryFn: () => entityService.list(params),
  })
}

export function useTopRiskyEntities() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['entities-top-risky', tenantId],
    queryFn: () => entityService.getTopRisky(),
  })
}

export function useCreateEntity() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (data: CreateEntityInput) => {
      requirePermission(permissions, Permission.ENTITIES_CREATE)
      return entityService.create(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['entities', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['entities-top-risky', tenantId] })
    },
  })
}

export function useUpdateEntity() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateEntityInput }) => {
      requirePermission(permissions, Permission.ENTITIES_UPDATE)
      return entityService.update(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['entities', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['entities-top-risky', tenantId] })
    },
  })
}

export function useEntityRiskBreakdown(entityId: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['entity-risk-breakdown', tenantId, entityId],
    queryFn: () => entityService.getRiskBreakdown(entityId),
    enabled: Boolean(entityId),
  })
}
