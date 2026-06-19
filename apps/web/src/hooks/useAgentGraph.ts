'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { aiGraphService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AgentGraphNode, ScheduleHealthSummary } from '@/types'

export function useAgentGraph() {
  const t = useTranslations('aiAgentGraph')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  const canView = hasPermission(permissions, Permission.AI_AGENTS_VIEW)

  const graphQuery = useQuery<AgentGraphNode[]>({
    queryKey: ['ai-agent-graph', tenantId],
    queryFn: () => aiGraphService.getGraph(),
    enabled: canView,
    staleTime: 30_000,
  })

  const healthQuery = useQuery<ScheduleHealthSummary>({
    queryKey: ['ai-schedule-health', tenantId],
    queryFn: () => aiGraphService.getScheduleHealth(),
    enabled: canView,
    staleTime: 30_000,
  })

  const agents = graphQuery.data ?? []
  const health = healthQuery.data ?? null

  return {
    t,
    canView,
    agents,
    health,
    isLoading: graphQuery.isLoading || healthQuery.isLoading,
    isFetching: graphQuery.isFetching,
  }
}
