import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { CONNECTOR_TYPES } from '@/lib/constants/connectors.constants'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useConnectors, useConnectorStats } from './useConnectors'
import { useLlmConnectors } from './useLlmConnectors'

export function useConnectorsPage() {
  const t = useTranslations('connectors')
  const tLlm = useTranslations('llmConnectors')
  const router = useRouter()
  const permissions = useAuthStore(s => s.permissions)
  const { data: connectors, isLoading, isFetching } = useConnectors()
  const { data: stats, isLoading: statsLoading } = useConnectorStats()
  const { data: llmConnectorsResponse, isFetching: llmFetching } = useLlmConnectors()

  const canCreate = hasPermission(permissions, Permission.CONNECTORS_CREATE)
  const canDelete = hasPermission(permissions, Permission.CONNECTORS_DELETE)
  const canCreateLlm = hasPermission(permissions, Permission.LLM_CONNECTORS_CREATE)

  const list = useMemo(() => connectors ?? [], [connectors])
  const llmConnectors = useMemo(() => llmConnectorsResponse?.data ?? [], [llmConnectorsResponse])

  const unconfiguredTypes = useMemo(() => {
    const configuredTypes = new Set(list.map(c => c.type))
    return CONNECTOR_TYPES.filter(ct => !configuredTypes.has(ct))
  }, [list])

  const handleNavigateToLlm = useCallback(() => {
    router.push('/connectors/llm')
  }, [router])

  return {
    t,
    tLlm,
    list,
    llmConnectors,
    llmFetching,
    stats,
    statsLoading,
    isLoading,
    isFetching,
    unconfiguredTypes,
    canCreate,
    canDelete,
    canCreateLlm,
    handleNavigateToLlm,
  }
}
