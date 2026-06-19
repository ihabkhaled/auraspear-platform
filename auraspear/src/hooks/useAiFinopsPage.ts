'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { aiUsageService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AiFinopsDashboard } from '@/types'

export function useAiFinopsPage() {
  const t = useTranslations('aiFinops')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  const canView = hasPermission(permissions, Permission.AI_FINOPS_VIEW)
  const canManage = hasPermission(permissions, Permission.AI_FINOPS_MANAGE)

  const dashboardQuery = useQuery<AiFinopsDashboard>({
    queryKey: ['ai-finops-dashboard', tenantId],
    queryFn: () => aiUsageService.getFinopsDashboard(),
    enabled: canView,
    staleTime: 30_000,
  })

  const dashboard = dashboardQuery.data ?? null

  const formattedCost = useMemo(
    () => `$${Number(dashboard?.totalCost ?? 0).toFixed(2)}`,
    [dashboard]
  )

  const formattedTokens = useMemo(
    () => Number(dashboard?.totalTokens ?? 0).toLocaleString(),
    [dashboard]
  )

  const formattedRequests = useMemo(
    () => Number(dashboard?.totalRequests ?? 0).toLocaleString(),
    [dashboard]
  )

  const formattedProjection = useMemo(
    () => `$${Number(dashboard?.projectedMonthEnd ?? 0).toFixed(2)}`,
    [dashboard]
  )

  const budgetLabel = useMemo(() => {
    if (!dashboard?.budgetTotal) return t('noBudgetSet')
    return `$${Number(dashboard.budgetTotal).toFixed(2)}`
  }, [dashboard, t])

  const budgetPct = Number(dashboard?.budgetUsedPct ?? 0)

  return {
    t,
    tErrors,
    canView,
    canManage,
    dashboard,
    isLoading: dashboardQuery.isLoading,
    isFetching: dashboardQuery.isFetching,
    formattedCost,
    formattedTokens,
    formattedRequests,
    formattedProjection,
    budgetLabel,
    budgetPct,
  }
}
