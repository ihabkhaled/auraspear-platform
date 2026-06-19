'use client'

import { useCallback, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { AiExecutionFinding } from '@/types'

export function useAiFindingsTab() {
  const tenantId = useTenantStore(s => s.currentTenantId)
  const [page, setPage] = useState(1)
  const [agentFilter, setAgentFilter] = useState<string>('')
  const [moduleFilter, setModuleFilter] = useState<string>('')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['ai-findings', 'all', tenantId, page, agentFilter, moduleFilter],
    queryFn: () => {
      const params: { page: number; limit: number; agentId?: string; sourceModule?: string } = {
        page,
        limit: 50,
      }
      if (agentFilter) {
        params.agentId = agentFilter
      }
      if (moduleFilter) {
        params.sourceModule = moduleFilter
      }
      return agentConfigService.getFindings(params)
    },
    placeholderData: keepPreviousData,
  })

  const findings: AiExecutionFinding[] = query.data?.data ?? []
  const pagination = query.data?.pagination ?? null

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }, [])

  const handleAgentFilterChange = useCallback((value: string) => {
    setAgentFilter(value === 'all' ? '' : value)
    setPage(1)
  }, [])

  const handleModuleFilterChange = useCallback((value: string) => {
    setModuleFilter(value === 'all' ? '' : value)
    setPage(1)
  }, [])

  return {
    findings,
    pagination,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    page,
    setPage,
    agentFilter,
    handleAgentFilterChange,
    moduleFilter,
    handleModuleFilterChange,
    expandedId,
    toggleExpanded,
  }
}
