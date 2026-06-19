import { useQuery } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'

export function useAiFindings(sourceModule?: string, sourceEntityId?: string) {
  const tenantId = useTenantStore(s => s.currentTenantId)

  return useQuery({
    queryKey: ['ai-findings', tenantId, sourceModule, sourceEntityId],
    queryFn: () => agentConfigService.getFindingsByEntity(sourceModule ?? '', sourceEntityId ?? ''),
    enabled: Boolean(sourceModule && sourceEntityId),
    staleTime: 30_000,
  })
}
