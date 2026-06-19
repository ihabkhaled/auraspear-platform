import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { huntService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'

export function useCreateHuntSession() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (data: { query: string; timeRange: string }) => {
      requirePermission(permissions, Permission.HUNT_CREATE)
      return huntService.createSession(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['hunt', tenantId] })
    },
  })
}

export function useSendHuntMessage() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ sessionId, content }: { sessionId: string; content: string }) => {
      requirePermission(permissions, Permission.HUNT_EXECUTE)
      return huntService.sendMessage(sessionId, content)
    },
    onSuccess: (_data, { sessionId }) => {
      void queryClient.invalidateQueries({ queryKey: ['hunt', tenantId, sessionId] })
    },
  })
}

export function useHuntEvents(sessionId: string, page = 1, limit = 25) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['hunt', tenantId, sessionId, 'events', page, limit],
    queryFn: () => huntService.getEvents(sessionId, page, limit),
    enabled: sessionId.length > 0,
  })
}
