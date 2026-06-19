'use client'

import { LogOut, MonitorSmartphone, ShieldAlert, Users } from 'lucide-react'
import { DataTable } from '@/components/common'
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
} from '@/components/ui'
import { SortOrder, type UserRole } from '@/enums'
import { getRoleBadgeClass } from '@/lib/admin-utils'
import { getInitials } from '@/lib/case.utils'
import { USERS_CONTROL_OS_LABEL_KEYS } from '@/lib/constants/users-control'
import {
  getUsersControlMembershipStatusClass,
  getUsersControlMembershipStatusLabelKey,
  getUsersControlPresenceClass,
  getUsersControlPresenceLabelKey,
} from '@/lib/users-control'
import { formatRelativeTime, lookup } from '@/lib/utils'
import type { Column, UsersControlUser, UsersControlUsersTableProps } from '@/types'

export function UsersControlTable({
  users,
  loading = false,
  locale,
  sortBy,
  sortOrder,
  onSort,
  onUserSelect,
  onForceLogoutUser,
  canForceLogoutUser,
  canManageTarget,
  selectedUserId,
  t,
  tCommon,
  tRoleSettings,
}: UsersControlUsersTableProps) {
  const columns: Column<UsersControlUser>[] = [
    {
      key: 'name',
      label: t('columns.user'),
      sortable: true,
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarFallback>{getInitials(row.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{row.name}</span>
              {row.isProtected && <ShieldAlert className="text-status-warning h-4 w-4" />}
            </div>
            <p className="text-muted-foreground text-xs">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'tenantName',
      label: t('columns.scope'),
      sortable: true,
      render: (_value, row) => (
        <div className="space-y-1">
          <div className="text-sm font-medium">{row.tenantName ?? t('scope.system')}</div>
          <div className="text-muted-foreground text-xs">
            {t('tenantCount', { count: String(row.tenantCount) })}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      label: t('columns.role'),
      sortable: true,
      render: value =>
        value ? (
          <Badge variant="outline" className={getRoleBadgeClass(value as UserRole)}>
            {tRoleSettings(`roles.${String(value)}`)}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">{t('notAvailable')}</span>
        ),
    },
    {
      key: 'status',
      label: t('columns.status'),
      sortable: true,
      render: value => (
        <Badge
          variant="outline"
          className={getUsersControlMembershipStatusClass(value as UsersControlUser['status'])}
        >
          {t(getUsersControlMembershipStatusLabelKey(value as UsersControlUser['status']))}
        </Badge>
      ),
    },
    {
      key: 'sessionPlatforms',
      label: t('columns.platforms'),
      sortable: true,
      render: value => (
        <div className="flex flex-wrap gap-2">
          {(value as UsersControlUser['sessionPlatforms']).slice(0, 3).map(platform => (
            <Badge key={platform} variant="outline">
              {t(lookup(USERS_CONTROL_OS_LABEL_KEYS, platform))}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: 'lastSeenAt',
      label: t('columns.lastSeen'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: (_value, row) => (
        <div className="space-y-1">
          <Badge variant="outline" className={getUsersControlPresenceClass(row.isOnline)}>
            {t(getUsersControlPresenceLabelKey(row.isOnline))}
          </Badge>
          <p className="text-muted-foreground text-xs">
            {row.lastSeenAt ? formatRelativeTime(row.lastSeenAt, locale) : t('never')}
          </p>
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      label: t('columns.lastLogin'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: value =>
        value ? (
          <span className="text-sm">{formatRelativeTime(String(value), locale)}</span>
        ) : (
          <span className="text-muted-foreground text-sm">{t('never')}</span>
        ),
    },
    {
      key: 'activeSessionCount',
      label: t('columns.sessions'),
      sortable: true,
      defaultSortOrder: SortOrder.DESC,
      render: (_value, row) => (
        <div className="space-y-1">
          <p className="text-sm font-medium">
            {t('activeSessionCount', { count: String(row.activeSessionCount) })}
          </p>
          <p className="text-muted-foreground text-xs">
            {t('totalSessionCount', { count: String(row.totalSessionCount) })}
          </p>
        </div>
      ),
    },
  ]

  if (onUserSelect || onForceLogoutUser) {
    columns.push({
      key: 'actions',
      label: tCommon('actions'),
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          {onUserSelect && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={event => {
                event.stopPropagation()
                onUserSelect(row)
              }}
            >
              <MonitorSmartphone className="me-2 h-4 w-4" />
              {t('viewSessions')}
            </Button>
          )}

          {canForceLogoutUser && onForceLogoutUser && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive cursor-pointer"
              disabled={canManageTarget?.(row) === false}
              onClick={event => {
                event.stopPropagation()
                onForceLogoutUser(row)
              }}
            >
              <LogOut className="me-2 h-4 w-4" />
              {t('forceLogoutUser')}
            </Button>
          )}
        </div>
      ),
    })
  }

  return (
    <DataTable
      columns={columns}
      data={users}
      loading={loading}
      onRowClick={onUserSelect}
      emptyMessage={t('noUsers')}
      emptyDescription={t('noUsersDescription')}
      emptyIcon={<Users className="h-6 w-6" />}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      rowClassName={row => (row.id === selectedUserId ? 'bg-muted/40' : '')}
    />
  )
}
