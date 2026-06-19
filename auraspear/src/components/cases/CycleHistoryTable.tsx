'use client'

import { Pause, Pencil, Play, Trash2 } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Button } from '@/components/ui'
import { CaseCycleStatus } from '@/enums'
import { useCycleHistoryTable } from '@/hooks'
import { formatDate } from '@/lib/utils'
import type { CaseCycle, Column, CycleHistoryTableProps } from '@/types'
import { CycleBadge } from './CycleBadge'

export function CycleHistoryTable({
  cycles,
  onCycleClick,
  loading,
  sortBy,
  sortOrder,
  onSort,
  showActions = false,
  onEdit,
  onActivate,
  onClose,
  onDelete,
}: CycleHistoryTableProps) {
  const { t, tCommon } = useCycleHistoryTable()

  const columns: Column<CaseCycle>[] = [
    {
      key: 'name',
      label: t('name'),
      sortable: true,
    },
    {
      key: 'status',
      label: t('status'),
      sortable: true,
      render: (value: unknown) => <CycleBadge status={value as CaseCycleStatus} />,
    },
    {
      key: 'startDate',
      label: t('startDate'),
      sortable: true,
      render: (value: unknown) => (value ? formatDate(value as string) : '—'),
    },
    {
      key: 'endDate',
      label: t('endDate'),
      sortable: true,
      render: (value: unknown) => (value ? formatDate(value as string) : '—'),
    },
    {
      key: 'caseCount',
      label: t('caseCount'),
    },
    {
      key: 'openCount',
      label: t('openCount'),
    },
    {
      key: 'closedCount',
      label: t('closedCount'),
    },
    {
      key: 'createdAt',
      label: t('createdAt'),
      sortable: true,
      render: (value: unknown) => formatDate(value as string),
    },
  ]

  if (showActions) {
    columns.push({
      key: 'actions',
      label: tCommon('actions'),
      render: (_value, row) => {
        const isClosed = row.status === CaseCycleStatus.CLOSED

        return (
          <div className="flex items-center gap-1">
            {isClosed && onActivate && (
              <Button
                variant="ghost"
                size="sm"
                className="text-status-success hover:text-status-success h-8 w-8 p-0"
                onClick={e => {
                  e.stopPropagation()
                  onActivate(row)
                }}
                title={t('activateCycle')}
              >
                <Play className="h-4 w-4" />
              </Button>
            )}

            {!isClosed && onClose && (
              <Button
                variant="ghost"
                size="sm"
                className="text-status-warning hover:text-status-warning h-8 w-8 p-0"
                onClick={e => {
                  e.stopPropagation()
                  onClose(row)
                }}
                title={t('closeCycle')}
              >
                <Pause className="h-4 w-4" />
              </Button>
            )}

            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={e => {
                  e.stopPropagation()
                  onEdit(row)
                }}
                title={t('editCycle')}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            )}

            {isClosed && onDelete && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-8 w-8 p-0"
                onClick={e => {
                  e.stopPropagation()
                  onDelete(row)
                }}
                title={t('deleteCycle')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        )
      },
    })
  }

  return (
    <DataTable
      columns={columns}
      data={cycles}
      emptyMessage={t('noCycles')}
      loading={loading ?? false}
      onRowClick={onCycleClick}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  )
}
