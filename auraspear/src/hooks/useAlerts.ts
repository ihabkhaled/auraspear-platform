import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { alertService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AlertSearchParams, BulkCloseInput } from '@/types'

export function useAlerts(params?: AlertSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['alerts', tenantId, params],
    queryFn: () => alertService.getAlerts(params),
  })
}

export function useAlert(id: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['alerts', tenantId, id],
    queryFn: () => alertService.getAlertById(id),
    enabled: id.length > 0,
  })
}

export function useInvestigateAlert() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.ALERTS_INVESTIGATE)
      return alertService.investigateAlert(id)
    },
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: ['alerts', tenantId, id] })
      void queryClient.invalidateQueries({ queryKey: ['alerts', tenantId] })
    },
  })
}

export function useBulkAcknowledgeAlerts() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (ids: string[]) => {
      requirePermission(permissions, Permission.ALERTS_ACKNOWLEDGE)
      return alertService.bulkAcknowledge(ids)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts', tenantId] })
    },
  })
}

export function useBulkCloseAlerts() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ ids, resolution }: BulkCloseInput) => {
      requirePermission(permissions, Permission.ALERTS_CLOSE)
      return alertService.bulkClose(ids, resolution)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['alerts', tenantId] })
    },
  })
}

export function useAlertTimeline(alertId: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['alerts', 'timeline', tenantId, alertId],
    queryFn: () => alertService.getAlertTimeline(alertId),
    enabled: alertId.length > 0,
  })
}
