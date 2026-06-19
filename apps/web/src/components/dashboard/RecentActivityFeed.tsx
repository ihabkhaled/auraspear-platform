'use client'

import Link from 'next/link'
import { Bell, Clock } from 'lucide-react'
import { EmptyState, LoadingSpinner } from '@/components/common'
import { Button } from '@/components/ui'
import { useRecentActivityFeed } from '@/hooks'
import { NOTIFICATION_TYPE_LABEL_MAP } from '@/lib/constants/notifications'
import { getNotificationIcon, getNotificationIconColor } from '@/lib/notification.utils'
import { cn, formatRelativeTime, lookup } from '@/lib/utils'
import type { ActivityItemProps } from '@/types'

function ActivityItem({ item, tNotifications, resolveMessage, locale }: ActivityItemProps) {
  const labelKey = lookup(NOTIFICATION_TYPE_LABEL_MAP, item.type)
  const displayTitle = labelKey ? tNotifications(labelKey) : item.title

  return (
    <div
      className={cn(
        'flex items-start gap-3 rounded-lg p-3 transition-colors',
        item.isRead ? 'opacity-70' : 'bg-muted/50'
      )}
    >
      <div
        className={cn(
          'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          getNotificationIconColor(item.type)
        )}
      >
        {getNotificationIcon(item.type)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{displayTitle}</p>
        <p className="text-muted-foreground line-clamp-1 text-xs">
          {item.actorName}
          {item.message ? ` - ${resolveMessage(item.message)}` : ''}
        </p>
        <div className="text-muted-foreground mt-1 flex items-center gap-1.5 text-xs">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(item.createdAt, locale)}</span>
        </div>
      </div>
    </div>
  )
}

export function RecentActivityFeed() {
  const { t, tNotifications, locale, items, isLoading, resolveMessage } = useRecentActivityFeed()

  if (isLoading) {
    return <LoadingSpinner />
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-6 w-6" />}
        title={t('noRecentActivity')}
        description={t('noRecentActivityDescription')}
      />
    )
  }

  return (
    <div className="space-y-1">
      {items.map(item => (
        <ActivityItem
          key={item.id}
          item={item}
          tNotifications={tNotifications}
          resolveMessage={resolveMessage}
          locale={locale}
        />
      ))}
      <div className="flex justify-end pt-2">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/notifications">{t('viewAll')}</Link>
        </Button>
      </div>
    </div>
  )
}
