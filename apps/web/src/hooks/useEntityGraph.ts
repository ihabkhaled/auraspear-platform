import { useQuery } from '@tanstack/react-query'
import { entityService } from '@/services'
import { useTenantStore } from '@/stores'

export function useEntityGraph(entityId: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)
  return useQuery({
    queryKey: ['entity-graph', tenantId, entityId],
    queryFn: () => entityService.getGraph(entityId),
    enabled: Boolean(entityId),
  })
}
