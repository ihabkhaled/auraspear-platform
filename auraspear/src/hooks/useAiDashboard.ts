'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { dashboardService } from '@/services'
import { useAiConnectorStore } from '@/stores'
import type { AiResponse, ExplainAnomalyInput } from '@/types'

export function useAiDashboard() {
  const t = useTranslations('dashboard')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [dailySummary, setDailySummary] = useState<AiResponse | null>(null)
  const [anomalyExplanation, setAnomalyExplanation] = useState<AiResponse | null>(null)

  const dailySummaryMutation = useMutation({
    mutationFn: () => dashboardService.aiDailySummary(connectorValue),
    onSuccess: (data: AiResponse) => {
      setDailySummary(data)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const explainAnomalyMutation = useMutation({
    mutationFn: (input: ExplainAnomalyInput) =>
      dashboardService.aiExplainAnomaly(input, connectorValue),
    onSuccess: (data: AiResponse) => {
      setAnomalyExplanation(data)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const generateDailySummary = useCallback(() => {
    dailySummaryMutation.mutate()
  }, [dailySummaryMutation])

  const explainAnomaly = useCallback(
    (input: ExplainAnomalyInput) => {
      explainAnomalyMutation.mutate(input)
    },
    [explainAnomalyMutation]
  )

  return {
    t,
    tCommon,
    dailySummary,
    anomalyExplanation,
    generateDailySummary,
    explainAnomaly,
    isDailySummaryLoading: dailySummaryMutation.isPending,
    isExplainAnomalyLoading: explainAnomalyMutation.isPending,
  }
}
