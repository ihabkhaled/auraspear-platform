import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { HuntMobileTab, HuntStatus, MessageRole, Permission, ReasoningStepStatus } from '@/enums'
import { nowISO, uniqueId } from '@/lib/dayjs'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore, useHuntStore } from '@/stores'
import type { HuntSession } from '@/types'
import { useCreateHuntSession, useHuntEvents } from './useHunt'
import { usePagination } from './usePagination'

export function useHuntPage() {
  const t = useTranslations('hunt')
  const permissions = useAuthStore(s => s.permissions)
  const canCreate = hasPermission(permissions, Permission.HUNT_CREATE)
  const canExecute = hasPermission(permissions, Permission.HUNT_EXECUTE)
  const [mobileTab, setMobileTab] = useState<HuntMobileTab>(HuntMobileTab.CHAT)
  const [session, setSession] = useState<HuntSession | null>(null)
  const {
    messages,
    huntStatus,
    huntId,
    addMessage,
    setHuntStatus,
    setHuntId,
    resetHuntState,
    clearSession,
  } = useHuntStore()

  const pagination = usePagination({ initialLimit: 25 })
  const { setTotal, resetPage } = pagination

  const createSession = useCreateHuntSession()
  const { data: eventsData, isLoading: eventsLoading } = useHuntEvents(
    huntId ?? '',
    pagination.page,
    pagination.limit
  )

  const events = useMemo(
    () => (Array.isArray(eventsData?.data) ? eventsData.data : []),
    [eventsData]
  )

  // Sync total from backend pagination metadata
  useEffect(() => {
    if (eventsData?.pagination?.total !== undefined) {
      setTotal(eventsData.pagination.total)
    }
  }, [eventsData?.pagination?.total, setTotal])

  // Use backend-computed metrics from session, NOT client-side calculations
  const uniqueIps = session?.uniqueIps ?? 0
  const threatScore = session?.threatScore ?? 0
  const eventsFound = session?.eventsFound ?? 0

  const handleSend = useCallback(
    (content: string) => {
      // Reset hunt state (keep chat messages as history) so a new session is created
      resetHuntState()
      setSession(null)
      resetPage()

      // Add user message
      addMessage({
        id: uniqueId('user'),
        role: MessageRole.USER,
        content,
        timestamp: nowISO(),
      })

      setHuntStatus(HuntStatus.RUNNING)

      createSession.mutate(
        { query: content, timeRange: '7d' },
        {
          onSuccess: result => {
            const sessionData = result.data
            setSession(sessionData)
            setHuntId(sessionData.id)
            let nextStatus: HuntStatus = HuntStatus.RUNNING
            if (sessionData.status === HuntStatus.COMPLETED) {
              nextStatus = HuntStatus.COMPLETED
            } else if (sessionData.status === HuntStatus.ERROR) {
              nextStatus = HuntStatus.ERROR
            }
            setHuntStatus(nextStatus)

            // Add AI analysis from session as AI response
            const hasAnalysis = sessionData.aiAnalysis !== null
            const hasReasoning =
              Array.isArray(sessionData.reasoning) && sessionData.reasoning.length > 0

            if (hasAnalysis || hasReasoning) {
              const reasoningSteps = Array.isArray(sessionData.reasoning)
                ? sessionData.reasoning
                : []

              addMessage({
                id: uniqueId('ai'),
                role: MessageRole.AI,
                content: sessionData.aiAnalysis ?? reasoningSteps.join('\n'),
                timestamp: nowISO(),
                reasoningSteps: reasoningSteps.map((step: string, i: number) => ({
                  id: `step-${String(i)}`,
                  label: step,
                  status: ReasoningStepStatus.COMPLETED,
                })),
                actions: sessionData.status === HuntStatus.COMPLETED ? ['complete'] : [],
              })

              if (sessionData.status === HuntStatus.COMPLETED) {
                setHuntStatus(HuntStatus.COMPLETED)
              }
            }
          },
          onError: () => {
            Toast.error(t('sessionError'))
            setHuntStatus(HuntStatus.ERROR)
          },
        }
      )
    },
    [createSession, addMessage, setHuntId, setHuntStatus, resetHuntState, resetPage, t]
  )

  const isSending = createSession.isPending

  const handleNewHunt = useCallback(() => {
    clearSession()
    setSession(null)
    resetPage()
  }, [clearSession, resetPage])

  return {
    t,
    mobileTab,
    setMobileTab,
    messages,
    huntStatus,
    huntId,
    events,
    uniqueIps,
    threatScore,
    eventsFound,
    eventsLoading,
    isSending,
    handleSend,
    handleNewHunt,
    page: pagination.page,
    totalPages: pagination.totalPages,
    total: pagination.total,
    onPageChange: pagination.setPage,
    canCreate,
    canExecute,
  }
}
