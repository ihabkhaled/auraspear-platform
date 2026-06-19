import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { getErrorKey } from '@/lib/api-error'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import { useIncidentTimeline, useAddTimelineEntry } from './useIncidents'

export function useIncidentTimelineComponent(incidentId: string) {
  const t = useTranslations('incidents')
  const tError = useTranslations('errors')
  const { data, isLoading } = useIncidentTimeline(incidentId)
  const addEntry = useAddTimelineEntry()
  const permissions = useAuthStore(s => s.permissions)
  const canAddTimeline = hasPermission(permissions, Permission.INCIDENTS_ADD_TIMELINE)

  const [newEvent, setNewEvent] = useState('')

  const entries = data?.data ?? []

  const handleAddEntry = useCallback(() => {
    if (newEvent.trim().length === 0) {
      return
    }
    addEntry.mutate(
      { id: incidentId, data: { event: newEvent.trim() } },
      {
        onSuccess: () => {
          Toast.success(t('timelineEntryAdded'))
          setNewEvent('')
        },
        onError: (error: unknown) => {
          Toast.error(tError(getErrorKey(error)))
        },
      }
    )
  }, [addEntry, incidentId, newEvent, t, tError])

  return {
    t,
    entries,
    isLoading,
    newEvent,
    setNewEvent,
    handleAddEntry,
    isAdding: addEntry.isPending,
    canAddTimeline,
  }
}
