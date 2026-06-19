import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { attackPathService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AttackPathSearchParams } from '@/types'

export function useAttackPaths(params?: AttackPathSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['attack-paths', tenantId, params],
    queryFn: () => attackPathService.getAttackPaths(params),
    placeholderData: keepPreviousData,
  })
}

export function useAttackPathStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['attack-paths', 'stats', tenantId],
    queryFn: () => attackPathService.getAttackPathStats(),
  })
}

export function useAttackPath(id: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['attack-paths', id, tenantId],
    queryFn: () => attackPathService.getAttackPathById(id),
    enabled: id.length > 0,
  })
}

export function useCreateAttackPath() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.ATTACK_PATHS_CREATE)
      return attackPathService.createAttackPath(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attack-paths', tenantId] })
    },
  })
}

export function useUpdateAttackPath() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.ATTACK_PATHS_UPDATE)
      return attackPathService.updateAttackPath(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attack-paths', tenantId] })
    },
  })
}

export function useDeleteAttackPath() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.ATTACK_PATHS_DELETE)
      return attackPathService.deleteAttackPath(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['attack-paths', tenantId] })
    },
  })
}
