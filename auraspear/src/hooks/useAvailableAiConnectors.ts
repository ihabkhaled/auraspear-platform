'use client'

import { useQuery } from '@tanstack/react-query'
import { AI_CONNECTOR_FALLBACK } from '@/lib/constants/ai-agents'
import { llmConnectorService } from '@/services'
import { useAiConnectorStore, useTenantStore } from '@/stores'

/**
 * Shared hook for AI connector selection across all AI copilot surfaces.
 * Uses a global Zustand store so all components share the same selection.
 */
export function useAvailableAiConnectors() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const setSelectedConnector = useAiConnectorStore(s => s.setSelectedConnector)

  const { data: fetchedConnectors } = useQuery({
    queryKey: ['ai-connectors-available', tenantId],
    queryFn: () => llmConnectorService.getAvailable(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  })

  const availableConnectors = fetchedConnectors ?? AI_CONNECTOR_FALLBACK

  // undefined means "default/auto" — backend tries all connectors in priority order
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  return {
    availableConnectors,
    selectedConnector,
    setSelectedConnector,
    connectorValue,
  }
}
