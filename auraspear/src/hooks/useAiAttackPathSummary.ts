'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { attackPathService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiAttackPathSummaryResult } from '@/types'

export function useAiAttackPathSummary(pathId: string) {
  const t = useTranslations('attackPath')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canSummarize = hasPermission(permissions, Permission.AI_ATTACK_PATH_SUMMARY)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [result, setResult] = useState<AiAttackPathSummaryResult | null>(null)

  const summarizeMutation = useMutation({
    mutationFn: () => attackPathService.aiSummarize(pathId, connectorValue),
    onSuccess: (data: AiAttackPathSummaryResult) => {
      setResult(data)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleSummarize = useCallback(() => {
    summarizeMutation.mutate()
  }, [summarizeMutation])

  const handleClearResult = useCallback(() => {
    setResult(null)
  }, [])

  return {
    t,
    tCommon,
    tErrors,
    canSummarize,
    summarize: handleSummarize,
    isSummarizing: summarizeMutation.isPending,
    result,
    clearResult: handleClearResult,
  }
}
