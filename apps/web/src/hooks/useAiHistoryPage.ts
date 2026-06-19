'use client'

import { useCallback, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { agentConfigService } from '@/services'
import { useTenantStore } from '@/stores'
import type { AiJobRunSummary } from '@/types'

export function useAiHistoryPage() {
  const t = useTranslations('aiHistory')
  const tenantId = useTenantStore(s => s.currentTenantId)
  const [page, setPage] = useState(1)
  const [agentFilter, setAgentFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [moduleFilter, setModuleFilter] = useState('')
  const [selectedRun, setSelectedRun] = useState<AiJobRunSummary | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  const query = useQuery({
    queryKey: ['ai-history', tenantId, page, agentFilter, statusFilter, moduleFilter],
    queryFn: () => {
      const params: {
        page: number
        limit: number
        agentId?: string
        status?: string
        sourceModule?: string
      } = {
        page,
        limit: 25,
      }
      if (agentFilter) {
        params.agentId = agentFilter
      }
      if (statusFilter) {
        params.status = statusFilter
      }
      if (moduleFilter) {
        params.sourceModule = moduleFilter
      }
      return agentConfigService.getJobRuns(params)
    },
    placeholderData: keepPreviousData,
  })

  const runs: AiJobRunSummary[] = query.data?.data ?? []
  const pagination = query.data?.pagination ?? null

  const handleOpenDetail = useCallback((run: AiJobRunSummary) => {
    setSelectedRun(run)
    setDetailOpen(true)
  }, [])

  const handleFilterChange = useCallback((type: string, value: string) => {
    const resolved = value === 'all' ? '' : value
    switch (type) {
      case 'agent':
        setAgentFilter(resolved)
        break
      case 'status':
        setStatusFilter(resolved)
        break
      case 'module':
        setModuleFilter(resolved)
        break
    }
    setPage(1)
  }, [])

  return {
    t,
    runs,
    pagination,
    isLoading: query.isLoading,
    page,
    setPage,
    agentFilter,
    statusFilter,
    moduleFilter,
    handleFilterChange,
    selectedRun,
    detailOpen,
    setDetailOpen,
    handleOpenDetail,
  }
}
