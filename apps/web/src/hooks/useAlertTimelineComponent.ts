'use client'

import { useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { AlertTimelineEventType } from '@/enums'
import { getTimelineEventColor, getTimelineEventIcon } from '@/lib/alert.utils'
import { sortByDateAsc } from '@/lib/dayjs'
import type { Alert, AlertTimelineEvent } from '@/types'

export function useAlertTimelineComponent(alert: Alert) {
  const t = useTranslations('alerts')

  const derivedTimeline = useMemo((): AlertTimelineEvent[] => {
    const events: AlertTimelineEvent[] = []

    events.push({
      id: `${alert.id}-created`,
      type: AlertTimelineEventType.CREATED,
      timestamp: alert.createdAt,
      actor: null,
      detail: t('timelineCreated'),
    })

    if (alert.acknowledgedAt) {
      events.push({
        id: `${alert.id}-acknowledged`,
        type: AlertTimelineEventType.ACKNOWLEDGED,
        timestamp: alert.acknowledgedAt,
        actor: alert.acknowledgedBy,
        detail: t('timelineAcknowledged'),
      })
    }

    if (alert.closedAt) {
      events.push({
        id: `${alert.id}-closed`,
        type: AlertTimelineEventType.CLOSED,
        timestamp: alert.closedAt,
        actor: alert.closedBy,
        detail: alert.resolution ?? t('timelineClosed'),
      })
    }

    return sortByDateAsc(events, e => e.timestamp)
  }, [alert, t])

  return {
    t,
    derivedTimeline,
    getEventIcon: getTimelineEventIcon,
    getEventColor: getTimelineEventColor,
  }
}
