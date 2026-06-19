'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale, useTranslations } from 'next-intl'
import { Toast } from '@/components/common'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks'
import { getErrorKey } from '@/lib/api-error'
import { resolveNotificationMessage } from '@/lib/constants/notifications'
import type { NotificationItem } from '@/types'

export function useNotificationBell() {
  const t = useTranslations('notifications')
  const tMessages = useTranslations('notifications.messages')
  const tError = useTranslations('errors')
  const locale = useLocale()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const { data: unreadData } = useUnreadNotificationCount()
  const unreadCount = unreadData?.count ?? 0

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotifications()

  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()

  const allNotifications: NotificationItem[] = data?.pages.flatMap(page => page.data) ?? []

  // Infinite scroll inside the notification list
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const target = loadMoreRef.current
    const root = scrollContainerRef.current
    if (!target || !root || !open) return

    const observer = new IntersectionObserver(
      entries => {
        const entry = entries[0]
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage()
        }
      },
      { root, threshold: 0.1 }
    )

    observer.observe(target)
    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, open])

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      // Mark as read
      if (!notification.isRead) {
        markRead.mutate(notification.id, {
          onError: (error: unknown) => {
            Toast.error(tError(getErrorKey(error)))
          },
        })
      }

      // Navigate to case with comment anchor
      if (notification.caseId) {
        const commentAnchor = notification.caseCommentId
          ? `#comment-${notification.caseCommentId}`
          : ''
        setOpen(false)
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

  const resolveMessage = useCallback(
    (message: string) => resolveNotificationMessage(message, tMessages),
    [tMessages]
  )

  return {
    t,
    locale,
    open,
    setOpen,
    unreadCount,
    isLoading,
    isFetchingNextPage,
    allNotifications,
    scrollContainerRef,
    loadMoreRef,
    handleNotificationClick,
    handleMarkAllRead,
    markAllReadPending: markAllRead.isPending,
    resolveMessage,
  }
}
