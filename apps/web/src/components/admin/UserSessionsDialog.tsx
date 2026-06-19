'use client'

import { ArrowDown, ArrowUp, Globe, LogOut, MonitorSmartphone } from 'lucide-react'
import { Pagination } from '@/components/common'
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui'
import { SortOrder, UsersControlSessionSortField } from '@/enums'
import { formatRelativeTime, formatTimestamp } from '@/lib/utils'
import type { UserSessionsDialogProps } from '@/types'

export function UserSessionsDialog({
  open,
  onOpenChange,
  user,
  sessions,
  loading,
  pagination,
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
  onPageChange,
  onForceLogoutUser,
  canForceLogoutUser,
  canManageTarget,
  isForceLogoutUserPending,
  t,
}: UserSessionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] sm:max-w-5xl">
        <DialogHeader>
          <DialogTitle>{t('sessions.title')}</DialogTitle>
          <DialogDescription>
            {user
              ? t('sessions.description', { user: user.email })
              : t('sessions.descriptionEmpty')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 border-b pb-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="font-medium">{user?.name ?? '-'}</p>
            <p className="text-muted-foreground text-sm">{user?.email ?? '-'}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={sortBy}
              onValueChange={value => onSortByChange(value as UsersControlSessionSortField)}
            >
              <SelectTrigger size="sm" className="w-full sm:w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UsersControlSessionSortField.LAST_SEEN_AT}>
                  {t('sort.session.lastSeenAt')}
                </SelectItem>
                <SelectItem value={UsersControlSessionSortField.LAST_LOGIN_AT}>
                  {t('sort.session.lastLoginAt')}
                </SelectItem>
                <SelectItem value={UsersControlSessionSortField.CREATED_AT}>
                  {t('sort.session.createdAt')}
                </SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                onSortOrderChange(sortOrder === SortOrder.ASC ? SortOrder.DESC : SortOrder.ASC)
              }
            >
              {sortOrder === SortOrder.ASC ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
              {t(`sort.order.${sortOrder}`)}
            </Button>
          </div>
        </div>

        <ScrollArea className="h-[28rem] pe-4">
          <div className="space-y-3">
            {sessions.map(session => (
              <div key={session.id} className="rounded-xl border p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={session.isOnline ? 'default' : 'outline'}>
                        {t(session.isOnline ? 'online' : 'offline')}
                      </Badge>
                      <Badge variant="outline">{t(`sessionStatus.${session.status}`)}</Badge>
                      <Badge variant="outline">{t(`osFamily.${session.osFamily}`)}</Badge>
                      <Badge variant="outline">{t(`browser.${session.browser}`)}</Badge>
                      <Badge variant="outline">{t(`clientType.${session.clientType}`)}</Badge>
                    </div>
                    <div className="text-muted-foreground flex flex-wrap items-center gap-3 text-sm">
                      <span className="inline-flex items-center gap-1">
                        <Globe className="h-4 w-4" />
                        {session.ipAddress ?? t('fields.unknownIp')}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MonitorSmartphone className="h-4 w-4" />
                        {session.tenantName}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[360px]">
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">{t('fields.lastSeen')}</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatRelativeTime(session.lastSeenAt)}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatTimestamp(session.lastSeenAt)}
                      </p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-muted-foreground text-xs">{t('fields.lastLogin')}</p>
                      <p className="mt-1 text-sm font-medium">
                        {formatRelativeTime(session.lastLoginAt)}
                      </p>
                      <p className="text-muted-foreground mt-1 text-xs">
                        {formatTimestamp(session.lastLoginAt)}
                      </p>
                    </div>
                  </div>
                </div>

                {session.userAgent && (
                  <p className="text-muted-foreground mt-3 truncate text-xs">{session.userAgent}</p>
                )}
              </div>
            ))}

            {sessions.length === 0 && !loading && (
              <div className="rounded-xl border border-dashed p-8 text-center">
                <p className="font-medium">{t('sessions.emptyTitle')}</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  {t('sessions.emptyDescription')}
                </p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="pt-2">
          <Pagination
            page={pagination?.page ?? 1}
            totalPages={pagination?.totalPages ?? 1}
            total={pagination?.total ?? 0}
            onPageChange={onPageChange}
          />
        </div>

        <DialogFooter>
          {canForceLogoutUser && (
            <Button
              variant="destructive"
              disabled={!canManageTarget || isForceLogoutUserPending || user === null}
              onClick={onForceLogoutUser}
            >
              <LogOut className="h-4 w-4" />
              {t('forceLogoutUser')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
