'use client'

import { Building2, Pencil, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Button } from '@/components/ui'
import { UserRole } from '@/enums'
import { useTenantListTable } from '@/hooks'
import { formatRelativeTime } from '@/lib/utils'
import type { Tenant, Column, TenantListTableProps } from '@/types'

export function TenantListTable({
  tenants,
  loading,
  onTenantClick,
  onEditTenant,
  onDeleteTenant,
  userRole,
  sortBy,
  sortOrder,
  onSort,
}: TenantListTableProps) {
  const { t, tCommon } = useTenantListTable()

  const isGlobalAdmin = userRole === UserRole.GLOBAL_ADMIN

  const columns: Column<Tenant>[] = [
    {
      key: 'name',
      label: t('tenants.name'),
      sortable: true,
      render: value => <span className="font-medium">{String(value ?? '')}</span>,
    },
    {
      key: 'slug',
      label: t('tenants.slug'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground font-mono text-sm">{String(value ?? '')}</span>
      ),
    },
    {
      key: 'userCount',
      label: t('tenants.users'),
      sortable: true,
      render: value => <span className="text-muted-foreground text-sm">{String(value ?? 0)}</span>,
    },
    {
      key: 'alertCount',
      label: t('tenants.alerts'),
      sortable: true,
      render: value => <span className="text-muted-foreground text-sm">{String(value ?? 0)}</span>,
    },
    {
      key: 'caseCount',
      label: t('tenants.cases'),
      sortable: true,
      render: value => <span className="text-muted-foreground text-sm">{String(value ?? 0)}</span>,
    },
    {
      key: 'createdAt',
      label: t('tenants.createdAt'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground text-sm">
          {value ? formatRelativeTime(String(value)) : '-'}
        </span>
      ),
    },
  ]

  if (isGlobalAdmin) {
    columns.push({
      key: 'actions',
      label: tCommon('actions'),
      render: (_value, row) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={e => {
              e.stopPropagation()
              onEditTenant?.(row)
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive h-8 w-8 p-0"
            onClick={e => {
              e.stopPropagation()
              onDeleteTenant?.(row)
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    })
  }

  return (
    <DataTable
      columns={columns}
      data={tenants}
      loading={loading}
      onRowClick={onTenantClick}
      emptyMessage={t('tenants.noTenants')}
      emptyIcon={<Building2 className="h-6 w-6" />}
      emptyDescription={t('tenants.noTenantsDescription')}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  )
}
