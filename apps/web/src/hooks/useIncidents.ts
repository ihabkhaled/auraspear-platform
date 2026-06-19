import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { type IncidentStatus, Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { incidentService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { IncidentSearchParams } from '@/types'

export function useIncidents(params?: IncidentSearchParams) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['incidents', tenantId, params],
    queryFn: () => incidentService.getIncidents(params),
    placeholderData: keepPreviousData,
  })
}

export function useIncidentStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['incidents', 'stats', tenantId],
    queryFn: () => incidentService.getIncidentStats(),
  })
}

export function useCreateIncident() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.INCIDENTS_CREATE)
      return incidentService.createIncident(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['incidents', 'stats', tenantId] })
    },
  })
}

export function useUpdateIncident() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.INCIDENTS_UPDATE)
      return incidentService.updateIncident(id, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['incidents', 'stats', tenantId] })
    },
  })
}

export function useChangeIncidentStatus() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) => {
      requirePermission(permissions, Permission.INCIDENTS_CHANGE_STATUS)
      return incidentService.changeIncidentStatus(id, status)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['incidents', 'stats', tenantId] })
    },
  })
}

export function useDeleteIncident() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: (id: string) => {
      requirePermission(permissions, Permission.INCIDENTS_DELETE)
      return incidentService.deleteIncident(id)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['incidents', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['incidents', 'stats', tenantId] })
    },
  })
}

export function useIncidentTimeline(incidentId: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['incidents', 'timeline', tenantId, incidentId],
    queryFn: () => incidentService.getIncidentTimeline(incidentId),
    enabled: incidentId.length > 0,
  })
}

export function useAddTimelineEntry() {
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { event: string; actorType?: string } }) => {
      requirePermission(permissions, Permission.INCIDENTS_ADD_TIMELINE)
      return incidentService.addTimelineEntry(id, data)
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({
        queryKey: ['incidents', 'timeline', tenantId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['incidents', tenantId, variables.id],
      })
    },
  })
}
