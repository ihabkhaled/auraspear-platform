'use client'

import {
  Ban,
  EyeOff,
  Pencil,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { DataTable } from '@/components/common'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
} from '@/components/ui'
import { UserRole, UserStatus } from '@/enums'
import { useTenantUserTable } from '@/hooks'
import { getStatusDotClass, getRoleBadgeClass } from '@/lib/admin-utils'
import { getInitials } from '@/lib/case.utils'
import { ROLE_HIERARCHY } from '@/lib/roles'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { TenantUser, TenantUserTableProps, Column } from '@/types'

export function TenantUserTable({
  users,
  loading = false,
  onUserClick,
  onEditUser,
  onRemoveUser,
  onBlockUser,
  onUnblockUser,
  onRestoreUser,
  onImpersonateUser,
  showActions = false,
  callerRole,
  currentUserId = '',
  sortBy,
  sortOrder,
  onSort,
}: TenantUserTableProps) {
  const { t, tCommon } = useTenantUserTable()

  const columns: Column<TenantUser>[] = [
    {
      key: 'name',
      label: t('users.name'),
      sortable: true,
      render: (_value, row) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {row.avatar && <AvatarImage src={row.avatar} alt={row.name} />}
            <AvatarFallback className="text-xs">{getInitials(row.name)}</AvatarFallback>
          </Avatar>
          <span className="font-medium">{row.name}</span>
        </div>
      ),
    },
    {
      key: 'email',
      label: t('users.email'),
      sortable: true,
      className: 'text-muted-foreground',
    },
    {
      key: 'role',
      label: t('users.role'),
      sortable: true,
      render: value => (
        <Badge variant="outline" className={cn('capitalize', getRoleBadgeClass(value as UserRole))}>
          {String(value ?? '')}
        </Badge>
      ),
    },
    {
      key: 'status',
      label: t('users.status'),
      sortable: true,
      render: value => {
        const status = value as UserStatus
        const isActive = status === UserStatus.ACTIVE
        const isBlocked = status === UserStatus.SUSPENDED
        const isDeleted = status === UserStatus.INACTIVE

        let statusLabel: string
        if (isBlocked) {
          statusLabel = t('users.statusBlocked')
        } else if (isDeleted) {
          statusLabel = t('users.statusDeleted')
        } else {
          statusLabel = String(status)
        }

        return (
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-block h-2 w-2 rounded-full',
                getStatusDotClass(isActive, isBlocked, isDeleted)
              )}
            />
            <span
              className={cn(
                'text-sm capitalize',
                isDeleted && 'text-muted-foreground line-through'
              )}
            >
              {statusLabel}
            </span>
          </div>
        )
      },
    },
    {
      key: 'lastLoginAt',
      label: t('users.lastLogin'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground text-sm">
          {value ? formatRelativeTime(String(value)) : t('users.never')}
        </span>
      ),
    },
    {
      key: 'mfaEnabled',
      label: t('users.mfa'),
      className: 'text-center',
      render: value =>
        value === true ? (
          <Shield className="text-status-success mx-auto h-4 w-4" />
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
  ]

  if (showActions) {
    columns.push({
      key: 'actions',
      label: tCommon('actions'),
      render: (_value, row) => {
        const isTargetGlobalAdmin = row.role === UserRole.GLOBAL_ADMIN
        const canManageThisUser = callerRole === UserRole.GLOBAL_ADMIN || !isTargetGlobalAdmin
        const isSelf = row.id === currentUserId
        const isDeleted = row.status === UserStatus.INACTIVE
        const isBlocked = row.status === UserStatus.SUSPENDED

        if (row.isProtected) {
          return (
            <div className="flex items-center gap-1">
              <ShieldAlert className="text-status-warning h-4 w-4" />
            </div>
          )
        }

        if (!canManageThisUser) {
          return null
        }

        const isActive = row.status === UserStatus.ACTIVE
        const callerIndex = callerRole ? ROLE_HIERARCHY.indexOf(callerRole) : -1
        const targetIndex = ROLE_HIERARCHY.indexOf(row.role)
        const canImpersonate =
          onImpersonateUser &&
          !isSelf &&
          isActive &&
          callerIndex !== -1 &&
          targetIndex !== -1 &&
          callerIndex < targetIndex

        return (
          <div className="flex items-center gap-1">
            {canImpersonate && (
              <Button
                variant="ghost"
                size="sm"
                className="text-status-info hover:text-status-info h-8 w-8 p-0"
                onClick={e => {
                  e.stopPropagation()
                  onImpersonateUser(row)
                }}
                title={t('users.impersonateUser')}
              >
                <EyeOff className="h-4 w-4" />
              </Button>
            )}

            {!isDeleted && !isSelf && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={e => {
                  e.stopPropagation()
                  onEditUser?.(row)
                }}
                title={t('users.editUser')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}

            {!isSelf &&
              !isDeleted &&
              (isBlocked ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-status-success hover:text-status-success h-8 w-8 p-0"
                  onClick={e => {
                    e.stopPropagation()
                    onUnblockUser?.(row)
                  }}
                  title={t('users.unblockUser')}
                >
                  <ShieldCheck className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-status-warning hover:text-status-warning h-8 w-8 p-0"
                  onClick={e => {
                    e.stopPropagation()
                    onBlockUser?.(row)
                  }}
                  title={t('users.blockUser')}
                >
                  <Ban className="h-4 w-4" />
                </Button>
              ))}

            {!isSelf &&
              (isDeleted ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-status-success hover:text-status-success h-8 w-8 p-0"
                  onClick={e => {
                    e.stopPropagation()
                    onRestoreUser?.(row)
                  }}
                  title={t('users.restoreUser')}
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive h-8 w-8 p-0"
                  onClick={e => {
                    e.stopPropagation()
                    onRemoveUser?.(row)
                  }}
                  title={t('users.removeUser')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              ))}
          </div>
        )
      },
    })
  }

  return (
    <DataTable
      columns={columns}
      data={users}
      loading={loading}
      onRowClick={onUserClick}
      emptyMessage={t('users.noUsers')}
      emptyIcon={<Users className="h-6 w-6" />}
      emptyDescription={t('users.noUsersDescription')}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  )
}
