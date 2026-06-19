import { useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { getAiAgentSessionColumns } from '@/components/ai-agents'
import type { AiAgentSessionSearchParams, AiAgentSessionTableProps } from '@/types'
import { useAiAgentSessions } from './useAiAgents'
import { useAiAgentSessionDetail } from './useAiAgentSessionDetail'
import { usePagination } from './usePagination'

export function useAiAgentSessionTable({ agentId }: AiAgentSessionTableProps) {
  const t = useTranslations('aiAgents')

  const pagination = usePagination({ initialPage: 1, initialLimit: 10 })
  const sessionDetail = useAiAgentSessionDetail()

  const searchParams: AiAgentSessionSearchParams = {
    page: pagination.page,
    limit: pagination.limit,
  }

  const { data, isFetching } = useAiAgentSessions(agentId, searchParams)

  useEffect(() => {
    if (data?.pagination) {
      pagination.setTotal(data.pagination.total)
    }
  }, [data?.pagination, pagination])

  const columns = useMemo(() => getAiAgentSessionColumns(t), [t])

  return {
    t,
    data: data?.data ?? [],
    isFetching,
    columns,
    pagination,
    sessionDetail,
  }
}
