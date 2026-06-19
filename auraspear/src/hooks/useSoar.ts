import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { soarService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { SoarPlaybookSearchParams, SoarExecutionSearchParams } from '@/types'

export function usePlaybooks(params?: SoarPlaybookSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['soar', 'playbooks', tenantId, params],
    queryFn: () => soarService.getPlaybooks(params),
    placeholderData: keepPreviousData,
  })
}

export function usePlaybookStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['soar', 'stats', tenantId],
    queryFn: () => soarService.getStats(),
  })
}

export function useCreatePlaybook() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.SOAR_CREATE)
      return soarService.createPlaybook(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['soar', tenantId] })
    },
  })
}

export function useUpdatePlaybook() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.SOAR_UPDATE)
      return soarService.updatePlaybook(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['soar', tenantId] })
    },
  })
}

export function useDeletePlaybook() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.SOAR_DELETE)
      return soarService.deletePlaybook(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['soar', tenantId] })
    },
  })
}

export function useExecutions(params?: SoarExecutionSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['soar', 'executions', tenantId, params],
    queryFn: () => soarService.getExecutions(params),
    placeholderData: keepPreviousData,
  })
}

export function useExecutePlaybook() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.SOAR_EXECUTE)
      return soarService.executePlaybook(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['soar', tenantId] })
    },
  })
}
