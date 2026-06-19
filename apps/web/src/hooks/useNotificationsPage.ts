'use client'

import { useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import { Permission } from '@/enums'
import { getErrorKey } from '@/lib/api-error'
import { hasPermission } from '@/lib/permissions'
import { useAuthStore } from '@/stores'
import type { NotificationItem } from '@/types'
import { useAiNotificationDigest } from './useAiNotificationDigest'
import { useMarkAllNotificationsRead, useMarkNotificationRead } from './useNotifications'
import { useNotificationsPageFilters } from './useNotificationsPageFilters'

export function useNotificationsPage() {
  const filters = useNotificationsPageFilters()
  const { t } = filters
  const tError = useTranslations('errors')
  const aiDigest = useAiNotificationDigest()
  const permissions = useAuthStore(s => s.permissions)

  const canManageNotifications = hasPermission(permissions, Permission.NOTIFICATIONS_MANAGE)
  const router = useRouter()

  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      if (!notification.isRead) {
        markRead.mutate(notification.id, {
          onError: (error: unknown) => {
            Toast.error(tError(getErrorKey(error)))
          },
        })
      }

      if (notification.caseId) {
        const commentAnchor = notification.caseCommentId
          ? `#comment-${notification.caseCommentId}`
          : ''
        router.push(`/cases/${notification.caseId}${commentAnchor}`)
      }
    },
    [markRead, router, tError]
  )

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        Toast.success(t('allMarkedRead'))
      },
      onError: (error: unknown) => {
        Toast.error(tError(getErrorKey(error)))
      },
    })
  }, [markAllRead, t, tError])

  return {
    ...filters,
    tError,
    handleNotificationClick,
    handleMarkAllRead,
    markAllReadPending: markAllRead.isPending,
    canManageNotifications,
    aiDigest,
  }
}
