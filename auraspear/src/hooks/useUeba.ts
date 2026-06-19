import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { uebaService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { UebaEntitySearchParams, UebaAnomalySearchParams, MlModelSearchParams } from '@/types'

export function useUebaEntities(params?: UebaEntitySearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ueba', 'entities', tenantId, params],
    queryFn: () => uebaService.getEntities(params),
    placeholderData: keepPreviousData,
  })
}

export function useUebaEntity(id: string | null) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ueba', 'entity', tenantId, id],
    queryFn: () => uebaService.getEntityById(id ?? ''),
    enabled: id !== null && id.length > 0,
  })
}

export function useUebaAnomalies(params?: UebaAnomalySearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ueba', 'anomalies', tenantId, params],
    queryFn: () => uebaService.getAnomalies(params),
    placeholderData: keepPreviousData,
  })
}

export function useMlModels(params?: MlModelSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ueba', 'models', tenantId, params],
    queryFn: () => uebaService.getModels(params),
    placeholderData: keepPreviousData,
  })
}

export function useUebaStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['ueba', 'stats', tenantId],
    queryFn: () => uebaService.getStats(),
  })
}

export function useCreateUebaEntity() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.UEBA_CREATE)
      return uebaService.createEntity(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'entities', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'stats', tenantId] })
    },
  })
}

export function useUpdateUebaEntity() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.UEBA_UPDATE)
      return uebaService.updateEntity(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'entities', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'entity', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'stats', tenantId] })
    },
  })
}

export function useDeleteUebaEntity() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.UEBA_UPDATE)
      return uebaService.deleteEntity(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'entities', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'stats', tenantId] })
    },
  })
}

export function useResolveAnomaly() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.UEBA_UPDATE)
      return uebaService.resolveAnomaly(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'anomalies', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'entity', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ueba', 'stats', tenantId] })
    },
  })
}
