'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { connectorWorkspaceService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { WorkspaceSearchRequest } from '@/types'

export function useWorkspaceOverview(type: string, enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['connector-workspace', tenantId, type, 'overview'],
    queryFn: () => connectorWorkspaceService.getOverview(type),
    enabled: Boolean(type) && enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useWorkspaceRecentActivity(type: string, page = 1, pageSize = 20, enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['connector-workspace', tenantId, type, 'recent-activity', page, pageSize],
    queryFn: () => connectorWorkspaceService.getRecentActivity(type, page, pageSize),
    enabled: Boolean(type) && enabled,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}

export function useWorkspaceEntities(type: string, page = 1, pageSize = 20, enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['connector-workspace', tenantId, type, 'entities', page, pageSize],
    queryFn: () => connectorWorkspaceService.getEntities(type, page, pageSize),
    enabled: Boolean(type) && enabled,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  })
}

export function useWorkspaceSearch(type: string) {
  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: (request: WorkspaceSearchRequest) => {
      requirePermission(permissions, Permission.CONNECTORS_VIEW)
      return connectorWorkspaceService.search(type, request)
    },
  })
}

export function useWorkspaceAction(type: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()

  const permissions = useAuthStore(s => s.permissions)
  return useMutation({
    mutationFn: ({ action, params }: { action: string; params?: Record<string, unknown> }) => {
      requirePermission(permissions, Permission.CONNECTORS_UPDATE)
      return connectorWorkspaceService.executeAction(type, action, params)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['connector-workspace', tenantId, type],
      })
    },
  })
}
