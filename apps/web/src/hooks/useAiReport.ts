'use client'

import { useState, useCallback } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { reportService } from '@/services'
import { useAiConnectorStore } from '@/stores'
import type { AiResponse } from '@/types'

export function useAiReport() {
  const t = useTranslations('reports')
  const tCommon = useTranslations('common')
  const tErrors = useTranslations('errors')

  const selectedConnector = useAiConnectorStore(s => s.selectedConnector)
  const connectorValue = selectedConnector === 'default' ? undefined : selectedConnector

  const [report, setReport] = useState<AiResponse | null>(null)
  const [selectedTimeRange, setSelectedTimeRange] = useState('7d')

  const reportMutation = useMutation({
    mutationFn: (timeRange: string) => reportService.aiExecutiveReport(timeRange, connectorValue),
    onSuccess: (data: AiResponse) => {
      setReport(data)
    },
    onError: buildErrorToastHandler(tErrors),
  })

  const generateReport = useCallback(() => {
    reportMutation.mutate(selectedTimeRange)
  }, [reportMutation, selectedTimeRange])

  const handleTimeRangeChange = useCallback((timeRange: string) => {
    setSelectedTimeRange(timeRange)
  }, [])

  return {
    t,
    tCommon,
    report,
    selectedTimeRange,
    handleTimeRangeChange,
    generateReport,
    isLoading: reportMutation.isPending,
  }
}
