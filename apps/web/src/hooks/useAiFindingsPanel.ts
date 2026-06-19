import { useState, useCallback } from 'react'
import type { AiExecutionFinding } from '@/types'
import { useAiFindings } from './useAiFindings'

export function useAiFindingsPanel(sourceModule: string, sourceEntityId: string) {
  const { data, isLoading, isFetching } = useAiFindings(sourceModule, sourceEntityId)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const findings: AiExecutionFinding[] = data?.data ?? []

  const toggleExpanded = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }, [])

  return {
    findings,
    isLoading,
    isFetching,
    expandedId,
    toggleExpanded,
    count: findings.length,
  }
}
