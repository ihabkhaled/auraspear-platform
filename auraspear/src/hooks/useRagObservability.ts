'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { aiRagService } from '@/services'
import { useAuthStore, useTenantStore } from '@/stores'
import type { RagStats, RagTraceResult } from '@/types'

export function useRagObservability() {
  const t = useTranslations('ragObservability')
  const permissions = useAuthStore(s => s.permissions)
  const tenantId = useTenantStore(s => s.currentTenantId)
  const canView = hasPermission(permissions, Permission.AI_MEMORY_VIEW)

  const [traceQuery, setTraceQuery] = useState('')
  const [traceResult, setTraceResult] = useState<RagTraceResult | null>(null)

  const statsQuery = useQuery<RagStats>({
    queryKey: ['rag-stats', tenantId],
    queryFn: () => aiRagService.getStats(),
    enabled: canView,
    staleTime: 30_000,
  })

  const traceMutation = useMutation({
    mutationFn: (query: string) => aiRagService.trace(query),
    onSuccess: (result) => {
      setTraceResult(result)
    },
  })

  function handleTrace() {
    if (traceQuery.trim().length > 0) {
      traceMutation.mutate(traceQuery)
    }
  }

  return {
    t,
    canView,
    stats: statsQuery.data ?? null,
    isLoading: statsQuery.isLoading,
    traceQuery,
    setTraceQuery,
    traceResult,
    handleTrace,
    isTracing: traceMutation.isPending,
  }
}
