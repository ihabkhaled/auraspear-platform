'use client'

import { useQuery } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'

export function useOrchestratorStats() {
  const tenantId = useTenantStore(s => s.currentTenantId)

  const query = useQuery({
    queryKey: ['orchestrator-stats', tenantId],
    queryFn: () => agentConfigService.getOrchestratorStats(),
    staleTime: 30_000,
  })

  return {
    stats: query.data?.data ?? null,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
  }
}
