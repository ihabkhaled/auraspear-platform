'use client'

import { useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { aiOpsService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { AiOpsWorkspace } from '@/types'

export function useAiOpsWorkspace() {
  const t = useTranslations('aiOps')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)

  const canView = hasPermission(permissions, Permission.AI_OPS_VIEW)

  const workspaceQuery = useQuery<AiOpsWorkspace>({
    queryKey: ['ai-ops-workspace', tenantId],
    queryFn: () => aiOpsService.getWorkspace(),
    enabled: canView,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const workspace = workspaceQuery.data ?? null

  return {
    t,
    canView,
    workspace,
    isLoading: workspaceQuery.isLoading,
    isFetching: workspaceQuery.isFetching,
  }
}
