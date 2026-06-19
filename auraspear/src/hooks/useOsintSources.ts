'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { CreateOsintSourceInput, UpdateOsintSourceInput } from '@/types'

export function useOsintSources(enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['agent-config', 'osint-sources', tenantId],
    queryFn: () => agentConfigService.getOsintSources(),
    enabled,
  })
}

export function useCreateOsintSource() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (data: CreateOsintSourceInput) => agentConfigService.createOsintSource(data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['agent-config', 'osint-sources', tenantId],
      })
    },
  })
}

export function useUpdateOsintSource() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOsintSourceInput }) =>
      agentConfigService.updateOsintSource(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['agent-config', 'osint-sources', tenantId],
      })
    },
  })
}

export function useDeleteOsintSource() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: (id: string) => agentConfigService.deleteOsintSource(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['agent-config', 'osint-sources', tenantId],
      })
    },
  })
}

export function useTestOsintSource() {
  return useMutation({
    mutationFn: (id: string) => agentConfigService.testOsintSource(id),
  })
}
