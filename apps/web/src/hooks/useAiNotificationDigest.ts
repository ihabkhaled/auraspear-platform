'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { dashboardService } from '@/services'
import { useAiConnectorStore } from '@/stores'
import type { AiNotificationDigestResult } from '@/types'

export function useAiNotificationDigest() {
  const t = useTranslations('notifications')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [digestResult, setDigestResult] = useState<AiNotificationDigestResult | null>(null)

  const digestMutation = useMutation({
    mutationFn: () => dashboardService.aiDailySummary(connectorValue),
    onSuccess: (data: AiNotificationDigestResult) => {
      setDigestResult(data)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const handleGenerateDigest = useCallback(() => {
    digestMutation.mutate()
  }, [digestMutation])

  return {
    t,
    tCommon,
    tErrors,
    digestResult,
    isLoading: digestMutation.isPending,
    handleGenerateDigest,
  }
}
