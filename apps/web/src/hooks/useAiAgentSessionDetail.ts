import { useState, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiAgentSession } from '@/types'

export function useAiAgentSessionDetail() {
  const t = useTranslations('aiAgents')
  const [selectedSession, setSelectedSession] = useState<AiAgentSession | null>(null)
  const [open, setOpen] = useState(false)

  const handleSessionClick = useCallback((session: AiAgentSession) => {
    setSelectedSession(session)
    setOpen(true)
  }, [])

  const handleClose = useCallback(() => {
    setOpen(false)
    setSelectedSession(null)
  }, [])

  const formattedDuration = useMemo(() => {
    if (!selectedSession?.durationMs) {
      return '-'
    }
    const seconds = selectedSession.durationMs / 1000
    if (seconds < 1) {
      return `${selectedSession.durationMs}ms`
    }
    return `${seconds.toFixed(1)}s`
  }, [selectedSession?.durationMs])

  const formattedCost = useMemo(
    () => (selectedSession ? `$${selectedSession.cost.toFixed(4)}` : '-'),
    [selectedSession]
  )

  const formattedTokens = useMemo(
    () => (selectedSession ? selectedSession.tokensUsed.toLocaleString() : '-'),
    [selectedSession]
  )

  const formattedStartedAt = useMemo(
    () => (selectedSession?.startedAt ? formatTimestamp(selectedSession.startedAt) : '-'),
    [selectedSession]
  )

  const formattedCompletedAt = useMemo(
    () => (selectedSession?.completedAt ? formatTimestamp(selectedSession.completedAt) : '-'),
    [selectedSession]
  )

  return {
    t,
    selectedSession,
    open,
    handleSessionClick,
    handleClose,
    formattedDuration,
    formattedCost,
    formattedTokens,
    formattedStartedAt,
    formattedCompletedAt,
  }
}
