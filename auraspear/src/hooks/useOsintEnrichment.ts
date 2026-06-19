'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { buildErrorToastHandler } from '@/lib/toast.utils'
import { agentConfigService } from '@/services'
import type { OsintEnrichmentResult } from '@/types'

export function useOsintEnrichment() {
  const tErrors = useTranslations('errors')
  const tCommon = useTranslations('common')

  const [result, setResult] = useState<OsintEnrichmentResult | null>(null)
  const [isEnriching, setIsEnriching] = useState(false)
  const [fetchedAnalysisData, setFetchedAnalysisData] = useState<Record<string, unknown>>({})
  const [fetchingSourceId, setFetchingSourceId] = useState<string | null>(null)

  const enrich = useCallback(
    async (iocType: string, iocValue: string) => {
      setIsEnriching(true)
      setResult(null)
      setFetchedAnalysisData({})
      try {
        const sourcesResponse = await agentConfigService.getOsintSources()
        const enabledSources = (sourcesResponse?.data ?? []).filter(s => s.isEnabled)

        if (enabledSources.length === 0) {
          Toast.warning(tErrors('osint.sourceNotFound'))
          setIsEnriching(false)
          return
        }

        const sourceIds = enabledSources.map(s => s.id).slice(0, 10)

        const enrichResult = await agentConfigService.enrichIoc({
          iocType,
          iocValue,
          sourceIds,
        })

        const enrichData = enrichResult?.data ?? null
        setResult(enrichData)

        if (enrichData) {
          const { successCount, totalSources, failureCount, results: sourceResults } = enrichData

          if (failureCount === 0) {
            Toast.success(
              `${tCommon('osintEnrichComplete')}: ${String(successCount)}/${String(totalSources)}`
            )
          } else {
            // Toast each failed source with its translated messageKey
            for (const sr of sourceResults) {
              if (!sr.success && sr.messageKey) {
                const key = sr.messageKey.replace('errors.', '')
                Toast.error(`${sr.sourceName}: ${tErrors(key)}`)
              } else if (!sr.success && sr.error) {
                Toast.error(`${sr.sourceName}: ${sr.error}`)
              }
            }

            if (successCount > 0) {
              Toast.success(
                `${tCommon('osintEnrichComplete')}: ${String(successCount)}/${String(totalSources)}`
              )
            }
          }
        }
      } catch (error: unknown) {
        buildErrorToastHandler(tErrors)(error)
      } finally {
        setIsEnriching(false)
      }
    },
    [tErrors, tCommon]
  )

  const fetchAnalysis = useCallback(
    async (analysisUrl: string, sourceId: string) => {
      setFetchingSourceId(sourceId)
      try {
        const resp = await agentConfigService.fetchVtAnalysis(analysisUrl)
        setFetchedAnalysisData(prev => ({ ...prev, [sourceId]: resp.data }))
      } catch (error: unknown) {
        buildErrorToastHandler(tErrors)(error)
      } finally {
        setFetchingSourceId(null)
      }
    },
    [tErrors]
  )

  const clearResult = useCallback(() => {
    setResult(null)
    setFetchedAnalysisData({})
  }, [])

  return {
    enrich,
    isEnriching,
    result,
    clearResult,
    fetchedAnalysisData,
    fetchingSourceId,
    fetchAnalysis,
  }
}
