import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { Alert, AlertAiResult } from '@/types'

export function useAlertAiResult(alert: Alert | null) {
  const t = useTranslations('alerts')

  const aiResult: AlertAiResult | null = useMemo(() => {
    if (!alert) {
      return null
    }

    const record = alert as unknown as Record<string, unknown>
    const aiSummary = (record['aiSummary'] as string | null) ?? null
    const aiConfidence = (record['aiConfidence'] as number | null) ?? null
    const aiSeveritySuggestion = (record['aiSeveritySuggestion'] as string | null) ?? null
    const aiEscalationSuggestion = (record['aiEscalationSuggestion'] as string | null) ?? null
    const aiLastRunAt = (record['aiLastRunAt'] as string | null) ?? null
    const aiStatusRaw = (record['aiStatus'] as string | null) ?? null

    const hasAnyField =
      aiSummary ??
      aiConfidence ??
      aiSeveritySuggestion ??
      aiEscalationSuggestion ??
      aiLastRunAt ??
      aiStatusRaw

    if (!hasAnyField) {
      return null
    }

    return {
      aiSummary,
      aiConfidence,
      aiSeveritySuggestion,
      aiEscalationSuggestion,
      aiLastRunAt,
      aiStatus: aiStatusRaw as AlertAiResult['aiStatus'],
    }
  }, [alert])

  return { aiResult, isLoading: false, t }
}
