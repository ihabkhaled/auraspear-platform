'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Permission } from '@/enums'
import { hasPermission } from '@/lib/permissions'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { uebaService } from '@/services'
import { useAiConnectorStore, useAuthStore } from '@/stores'
import type { AiUebaNarrativeResult } from '@/types'

export function useAiUebaNarrative(anomalyId: string) {
  const t = useTranslations('ueba')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')
  const permissions = useAuthStore(s => s.permissions)
  const canExplain = hasPermission(permissions, Permission.AI_UEBA_NARRATIVE)

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [result, setResult] = useState<AiUebaNarrativeResult | null>(null)

  const explainMutation = useMutation({
    mutationFn: () => uebaService.aiExplainAnomaly(anomalyId, connectorValue),
    onSuccess: (data: AiUebaNarrativeResult) => {
      setResult(data)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleExplain = useCallback(() => {
    explainMutation.mutate()
  }, [explainMutation])

  const handleClearResult = useCallback(() => {
    setResult(null)
  }, [])

  return {
    t,
    tCommon,
    tErrors,
    canExplain,
    explain: handleExplain,
    isExplaining: explainMutation.isPending,
    result,
    clearResult: handleClearResult,
  }
}
