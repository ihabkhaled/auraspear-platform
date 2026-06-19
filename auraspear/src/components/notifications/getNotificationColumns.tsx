import { CheckCircle2, Circle, Clock } from 'lucide-react'
import { SortOrder } from '@/enums'
import { NOTIFICATION_TYPE_LABEL_MAP } from '@/lib/constants/notifications'
import { getNotificationIcon, getNotificationIconColor } from '@/lib/notification.utils'
import { cn, formatRelativeTime, lookup } from '@/lib/utils'
import type { Column, NotificationColumnTranslations, NotificationItem } from '@/types'

export function getNotificationColumns(
  translations: NotificationColumnTranslations
): Column<NotificationItem>[] {
  const { notifications: t, resolveMessage, locale } = translations

  return [
    {
      key: 'isRead',
      label: t('columns.status'),
      sortable: true,
      className: 'w-24',
      render: (value: unknown) => {
        const isRead = Boolean(value)
        return isRead ? (
          <CheckCircle2 className="text-muted-foreground h-4 w-4" />
        ) : (
          <Circle className="text-primary h-4 w-4 fill-current" />
        )
      },
    },
    {
      key: 'type',
      label: t('columns.type'),
      sortable: true,
      className: 'w-40',
      render: (value: unknown) => {
        const typeStr = String(value)
        const labelKey = lookup(NOTIFICATION_TYPE_LABEL_MAP, typeStr)
        return (
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
                getNotificationIconColor(typeStr)
              )}
            >
              {getNotificationIcon(typeStr)}
            </div>
            <span className="text-xs">{labelKey ? t(labelKey) : typeStr}</span>
          </div>
        )
      },
    },
    {
      key: 'title',
      label: t('columns.title'),
      sortable: true,
      render: (_value: unknown, row: NotificationItem) => {
        const titleLabelKey = lookup(NOTIFICATION_TYPE_LABEL_MAP, row.type)
        const displayTitle = titleLabelKey ? t(titleLabelKey) : String(_value)
        return (
          <div className="max-w-xs">
            <p className={cn('truncate text-sm', !row.isRead && 'font-semibold')}>{displayTitle}</p>
            <p className="text-muted-foreground truncate text-xs">{resolveMessage(row.message)}</p>
          </div>
        )
      },
    },
    {
      key: 'actorName',
      label: t('columns.actor'),
      sortable: true,
      render: (value: unknown) => (
        <span className="text-muted-foreground text-sm">{String(value)}</span>
      ),
    },
    {
      key: 'createdAt',
      label: t('columns.date'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      className: 'w-40',
      render: (value: unknown) => (
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(String(value), locale)}</span>
        </div>
      ),
    },
  ]
}
