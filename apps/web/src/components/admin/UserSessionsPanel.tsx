'use client'

import { LogOut, MonitorSmartphone, ShieldAlert, Wifi } from 'lucide-react'
import { EmptyState, LoadingSpinner, Pagination } from '@/components/common'
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui'
import { UserSessionStatus } from '@/enums'
import {
  USERS_CONTROL_BROWSER_LABEL_KEYS,
  USERS_CONTROL_CLIENT_TYPE_LABEL_KEYS,
  USERS_CONTROL_OS_LABEL_KEYS,
} from '@/lib/constants/users-control'
import {
  getUsersControlPresenceClass,
  getUsersControlPresenceLabelKey,
  getUsersControlSessionStatusClass,
  getUsersControlSessionStatusLabelKey,
} from '@/lib/users-control'
import { formatRelativeTime, lookup } from '@/lib/utils'
import type { UsersControlSessionPanelProps } from '@/types'

export function UserSessionsPanel({
  user,
  sessions,
  loading = false,
  locale,
  canViewSessions,
  canForceLogoutUser,
  canManageTarget,
  onForceLogoutUser,
  onTerminateSession,
  terminatingSessionId,
  page,
  totalPages,
  total,
  onPageChange,
  t,
}: UsersControlSessionPanelProps) {
  if (!canViewSessions) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-6 w-6" />}
        title={t('sessionAccessDeniedTitle')}
        description={t('sessionAccessDeniedDescription')}
      />
    )
  }

  if (!user) {
    return (
      <EmptyState
        icon={<MonitorSmartphone className="h-6 w-6" />}
        title={t('selectUserTitle')}
        description={t('selectUserDescription')}
      />
    )
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (sessions.length === 0) {
    return (
      <EmptyState
        icon={<Wifi className="h-6 w-6" />}
        title={t('noSessions')}
        description={t('noSessionsDescription')}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{user.name}</p>
          <p className="text-muted-foreground text-sm">{user.email}</p>
        </div>

        {canForceLogoutUser && onForceLogoutUser && (
          <Button
            type="button"
            variant="outline"
            className="cursor-pointer"
            disabled={canManageTarget === false}
            onClick={() => onForceLogoutUser(user)}
          >
            <LogOut className="me-2 h-4 w-4" />
            {t('forceLogoutUser')}
          </Button>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {sessions.map(session => (
          <Card key={session.id} className="overflow-hidden">
            <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
              <div className="space-y-1">
                <CardTitle className="text-base">
                  {t(lookup(USERS_CONTROL_OS_LABEL_KEYS, session.osFamily))}
                </CardTitle>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>{t(lookup(USERS_CONTROL_CLIENT_TYPE_LABEL_KEYS, session.clientType))}</span>
                  <span>&middot;</span>
                  <span>{t(lookup(USERS_CONTROL_BROWSER_LABEL_KEYS, session.browser))}</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                {canForceLogoutUser &&
                  onTerminateSession &&
                  session.status === UserSessionStatus.ACTIVE && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive cursor-pointer"
                      disabled={canManageTarget === false || terminatingSessionId === session.id}
                      onClick={() => onTerminateSession(session)}
                    >
                      <LogOut className="me-2 h-4 w-4" />
                      {t('terminateSession')}
                    </Button>
                  )}
                <Badge variant="outline" className={getUsersControlPresenceClass(session.isOnline)}>
                  {t(getUsersControlPresenceLabelKey(session.isOnline))}
                </Badge>
                <Badge
                  variant="outline"
                  className={getUsersControlSessionStatusClass(session.status)}
                >
                  {t(getUsersControlSessionStatusLabelKey(session.status))}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">{t('fields.tenant')}</p>
                <p>{session.tenantName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">{t('fields.ipAddress')}</p>
                <p>{session.ipAddress ?? t('notAvailable')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">{t('fields.lastSeen')}</p>
                <p>{formatRelativeTime(session.lastSeenAt, locale)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-muted-foreground text-xs font-medium">{t('fields.lastLogin')}</p>
                <p>{formatRelativeTime(session.lastLoginAt, locale)}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <p className="text-muted-foreground text-xs font-medium">{t('fields.userAgent')}</p>
                <p className="break-all">{session.userAgent ?? t('notAvailable')}</p>
              </div>
              {session.revokeReason && (
                <div className="space-y-1 md:col-span-2">
                  <p className="text-muted-foreground text-xs font-medium">
                    {t('fields.revokeReason')}
                  </p>
                  <p>{session.revokeReason}</p>
                </div>
              )}
              <div className="space-y-1 md:col-span-2">
                <p className="text-muted-foreground text-xs font-medium">{t('fields.familyId')}</p>
                <p className="font-mono text-xs">{session.familyId}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={onPageChange}
          total={total ?? 0}
        />
      )}
    </div>
  )
}
