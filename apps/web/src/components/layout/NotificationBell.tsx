'use client'

import { Bell, BellOff, CheckCheck } from 'lucide-react'
import { LoadingSpinner } from '@/components/common'
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui'
import { useNotificationBell } from '@/hooks'
import { NOTIFICATION_TYPE_LABEL_MAP } from '@/lib/constants/notifications'
import { getNotificationIcon, getNotificationIconColor } from '@/lib/notification.utils'
import { cn, formatRelativeTime, lookup } from '@/lib/utils'

export function NotificationBell() {
  const {
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
    markAllReadPending,
    resolveMessage,
  } = useNotificationBell()

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative overflow-visible">
          <Bell className="text-muted-foreground h-4 w-4" />
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] leading-none font-bold shadow-sm">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[calc(100vw-2rem)] p-0 sm:w-96">
        {/* Header */}
        <div className="border-border flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold">{t('title')}</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1.5 text-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={handleMarkAllRead}
              disabled={markAllReadPending}
            >
              <CheckCheck className="me-1 h-3.5 w-3.5" />
              {t('markAllRead')}
            </Button>
          )}
        </div>

        {/* Notification list */}
        <div ref={scrollContainerRef} className="max-h-[60vh] overflow-y-auto sm:max-h-[400px]">
          {isLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          )}

          {!isLoading && allNotifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8">
              <BellOff className="text-muted-foreground h-8 w-8" />
              <p className="text-muted-foreground text-sm">{t('empty')}</p>
            </div>
          )}

          {allNotifications.map(notification => (
            <button
              key={notification.id}
              type="button"
              className={cn(
                'hover:bg-muted/50 flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-start transition-colors',
                !notification.isRead && 'bg-primary/5'
              )}
              onClick={() => handleNotificationClick(notification)}
            >
              <div
                className={cn(
                  'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  getNotificationIconColor(notification.type)
                )}
              >
                {getNotificationIcon(notification.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium">
                    {lookup(NOTIFICATION_TYPE_LABEL_MAP, notification.type)
                      ? t(lookup(NOTIFICATION_TYPE_LABEL_MAP, notification.type))
                      : notification.title}
                  </p>
                  {!notification.isRead && (
                    <span className="bg-primary mt-1.5 h-2 w-2 shrink-0 rounded-full" />
                  )}
                </div>
                <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs">
                  {notification.actorName}
                  {notification.message ? ` — ${resolveMessage(notification.message)}` : ''}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {formatRelativeTime(notification.createdAt, locale)}
                </p>
              </div>
            </button>
          ))}

          {/* Load more trigger */}
          <div ref={loadMoreRef} className="h-1" />

          {isFetchingNextPage && (
            <div className="flex justify-center py-2">
              <LoadingSpinner />
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
