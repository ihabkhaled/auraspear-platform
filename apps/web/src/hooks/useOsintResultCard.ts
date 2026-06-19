'use client'

import { useMemo } from 'react'
import { extractVtAnalysisUrl, extractVtGuiUrl, extractVtSummary } from '@/lib/osint.utils'
import type { OsintQueryResult } from '@/types'

export function useOsintResultCard(result: OsintQueryResult, fetchedData: unknown) {
  return useMemo(() => {
    const analysisUrl = result.success ? extractVtAnalysisUrl(result.rawResponse) : null
    const hasAnalysisStub = analysisUrl !== null
    const displayData = fetchedData ?? result.data
    const vtSummary =
      displayData !== null && displayData !== undefined ? extractVtSummary(displayData) : null
    const vtGuiUrl =
      displayData !== null && displayData !== undefined ? extractVtGuiUrl(displayData) : null

    return { analysisUrl, hasAnalysisStub, displayData, vtSummary, vtGuiUrl }
  }, [result, fetchedData])
}
