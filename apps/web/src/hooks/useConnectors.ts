'use client'

import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { Permission } from '@/enums'
import { requirePermission } from '@/lib/permissions'
import { connectorService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { CreateConnectorInput, ToggleConnectorInput } from '@/types'

export function useConnectors() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['connectors', tenantId],
    queryFn: () => connectorService.list(),
    placeholderData: keepPreviousData,
  })
}

export function useConnectorStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['connectors', tenantId, 'stats'],
    queryFn: () => connectorService.getStats(),
    placeholderData: keepPreviousData,
  })
}

export function useConnector(type: string, enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['connectors', tenantId, type],
    queryFn: () => connectorService.getByType(type),
    enabled: Boolean(type) && enabled,
  })
}

export function useUpdateConnector(type: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (data: Record<string, unknown>) => {
      requirePermission(permissions, Permission.CONNECTORS_UPDATE)
      return connectorService.update(type, data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-connectors-available', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', tenantId, 'service-health'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
    },
  })
}

export function useDeleteConnector() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (type: string) => {
      requirePermission(permissions, Permission.CONNECTORS_DELETE)
      return connectorService.remove(type)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-connectors-available', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', tenantId, 'service-health'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
    },
  })
}

export function useTestConnector() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (type: string) => {
      requirePermission(permissions, Permission.CONNECTORS_TEST)
      return connectorService.test(type)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', tenantId, 'service-health'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
    },
  })
}

export function useCreateConnector() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (data: CreateConnectorInput) => {
      requirePermission(permissions, Permission.CONNECTORS_CREATE)
      return connectorService.create(data)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-connectors-available', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', tenantId, 'service-health'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
    },
  })
}

export function useToggleConnector() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: ({ type, enabled }: ToggleConnectorInput) => {
      requirePermission(permissions, Permission.CONNECTORS_UPDATE)
      return connectorService.toggle({ type, enabled })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-connectors-available', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['admin', tenantId, 'service-health'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
    },
  })
}

export function useSyncConnector() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()
  const permissions = useAuthStore(s => s.permissions)

  return useMutation({
    mutationFn: (type: string) => {
      requirePermission(permissions, Permission.CONNECTORS_SYNC)
      return connectorService.sync(type)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['connectors', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['connector-sync-status', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['alerts', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard', tenantId] })
    },
  })
}

export function useSyncStatus() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['connector-sync-status', tenantId],
    queryFn: () => connectorService.getSyncStatus(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  })
}
