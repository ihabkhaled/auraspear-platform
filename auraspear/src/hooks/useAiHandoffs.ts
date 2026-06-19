'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { aiHandoffService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AiHandoffHistoryItem, AiHandoffStats } from '@/types'

export function useAiHandoffs() {
  const t = useTranslations('aiHandoffs')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  const queryClient = useQueryClient()

  const canPromote = hasPermission(permissions, Permission.AI_HANDOFF_PROMOTE)

  const [page, setPage] = useState(1)
  const [targetFilter, setTargetFilter] = useState('')
  const limit = 25

  const statsQuery = useQuery<AiHandoffStats>({
    queryKey: ['ai-handoffs-stats', tenantId],
    queryFn: () => aiHandoffService.getStats(),
    enabled: canPromote,
    staleTime: 30_000,
  })

  const historyQuery = useQuery<{ data: AiHandoffHistoryItem[]; total: number }>({
    queryKey: ['ai-handoffs-history', tenantId, page, targetFilter],
    queryFn: () => {
      const params: Record<string, string | number> = { limit, offset: (page - 1) * limit }
      if (targetFilter) {
        params['targetModule'] = targetFilter
      }
      return aiHandoffService.getHistory(params)
    },
    enabled: canPromote,
    staleTime: 15_000,
  })

  const promoteMutation = useMutation({
    mutationFn: (data: {
      findingId: string
      targetModule: string
      title?: string
      description?: string
    }) => aiHandoffService.promote(data),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['ai-handoffs-stats', tenantId] })
      void queryClient.invalidateQueries({ queryKey: ['ai-handoffs-history', tenantId] })
      Toast.success(
        `${t('promoted')} → ${result.targetModule} (${result.createdEntityId.slice(0, 8)})`
      )
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const stats = statsQuery.data ?? null
  const history = Array.isArray(historyQuery.data?.data) ? historyQuery.data.data : []
  const totalHistory = Number(historyQuery.data?.total ?? 0)

  return {
    t,
    canPromote,
    stats,
    history,
    totalHistory,
    isLoading: statsQuery.isLoading,
    isFetchingHistory: historyQuery.isFetching,
    page,
    limit,
    targetFilter,
    setPage,
    setTargetFilter: (v: string) => {
      setTargetFilter(v)
      setPage(1)
    },
    promote: promoteMutation.mutate,
    isPromoting: promoteMutation.isPending,
  }
}
