import { useCallback, useMemo } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { SortOrder } from '@/enums'
import { DASHBOARD_ACTIVITY_LIMIT } from '@/lib/constants/dashboard-preferences'
import { resolveNotificationMessage } from '@/lib/constants/notifications'
import type { RecentActivityItem } from '@/types'
import { useNotificationsList } from './useNotifications'

export function useRecentActivityFeed() {
  const t = useTranslations('dashboard')
  const tNotifications = useTranslations('notifications')
  const tMessages = useTranslations('notifications.messages')
  const locale = useLocale()
  const notificationParams = useMemo(
    () => ({
      page: 1,
      limit: DASHBOARD_ACTIVITY_LIMIT,
      sortBy: 'createdAt',
      sortOrder: SortOrder.DESC,
    }),
    []
  )
  const { data, isLoading } = useNotificationsList(notificationParams)

  const items: RecentActivityItem[] = useMemo(() => {
    const rawItems = data?.data
    if (!Array.isArray(rawItems)) {
      return []
    }
    return rawItems.slice(0, DASHBOARD_ACTIVITY_LIMIT).map(item => ({
      id: item.id,
      type: item.type,
      actorName: item.actorName,
      title: item.title,
      message: item.message,
      createdAt: item.createdAt,
      isRead: item.isRead,
    }))
  }, [data?.data])

  const resolveMessage = useCallback(
    (message: string) => resolveNotificationMessage(message, tMessages),
    [tMessages]
  )

  return {
    t,
    tNotifications,
    locale,
    items,
    isLoading,
    resolveMessage,
  }
}
