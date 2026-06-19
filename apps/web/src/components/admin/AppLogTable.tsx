'use client'

import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { useAppLogTable } from '@/hooks'
import { getLevelClasses } from '@/lib/admin.utils'
import { formatTimestamp } from '@/lib/utils'
import type { ApplicationLogEntry, AppLogTableProps, Column } from '@/types'

export function AppLogTable({
  logs,
  loading = false,
  sortBy,
  sortOrder,
  onSort,
  onRowClick,
}: AppLogTableProps) {
  const { t } = useAppLogTable()

  const columns: Column<ApplicationLogEntry>[] = [
    {
      key: 'createdAt',
      label: t('appLogs.timestamp'),
      sortable: true,
      render: value => (
        <span className="font-mono text-xs">{formatTimestamp(String(value ?? ''))}</span>
      ),
    },
    {
      key: 'level',
      label: t('appLogs.level'),
      sortable: true,
      render: value => {
        const level = String(value ?? '')
        return (
          <Badge variant="outline" className={`text-xs uppercase ${getLevelClasses(level)}`}>
            {level}
          </Badge>
        )
      },
    },
    {
      key: 'feature',
      label: t('appLogs.feature'),
      sortable: true,
      render: value => <span className="text-sm font-medium">{String(value ?? '')}</span>,
    },
    {
      key: 'action',
      label: t('appLogs.action'),
      sortable: true,
    },
    {
      key: 'message',
      label: t('appLogs.message'),
      className: 'max-w-xs truncate',
    },
    {
      key: 'actorEmail',
      label: t('appLogs.actorEmail'),
      sortable: true,
      className: 'text-xs',
    },
    {
      key: 'outcome',
      label: t('appLogs.outcome'),
      sortable: true,
      render: value => {
        if (!value) return <span className="text-muted-foreground">&mdash;</span>
        return <span className="text-xs">{String(value)}</span>
      },
    },
    {
      key: 'sourceType',
      label: t('appLogs.sourceType'),
      className: 'text-xs',
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={logs}
      loading={loading}
      emptyMessage={t('appLogs.noLogs')}
      emptyDescription={t('appLogs.noLogsDescription')}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      onRowClick={onRowClick}
    />
  )
}
