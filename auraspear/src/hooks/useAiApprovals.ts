'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { ResolveApprovalInput } from '@/types'

export function useAiApprovals(status?: string, enabled = true) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['agent-config', 'approvals', status, tenantId],
    queryFn: () => agentConfigService.getApprovals(status),
    enabled,
  })
}

export function useResolveApproval() {
  const queryClient = useQueryClient()
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ResolveApprovalInput }) =>
      agentConfigService.resolveApproval(id, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['agent-config', 'approvals', undefined, tenantId],
      })
      void queryClient.invalidateQueries({
        queryKey: ['agent-config', 'approvals', 'pending', tenantId],
      })
    },
  })
}
