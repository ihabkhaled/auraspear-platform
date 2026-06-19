'use client'

import { useCallback } from 'react'
import { useOsintEnrichment } from './useOsintEnrichment'

export function useOsintEnrichButton(iocType: string, iocValue: string) {
  const {
    enrich,
    isEnriching,
    result,
    clearResult,
    fetchedAnalysisData,
    fetchingSourceId,
    fetchAnalysis,
  } = useOsintEnrichment()

  const handleEnrich = useCallback(() => {
    void enrich(iocType, iocValue)
  }, [enrich, iocType, iocValue])

  return {
    handleEnrich,
    isEnriching,
    result,
    clearResult,
    fetchedAnalysisData,
    fetchingSourceId,
    fetchAnalysis,
  }
}
