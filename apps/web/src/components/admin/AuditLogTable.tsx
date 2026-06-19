'use client'

import { ScrollText } from 'lucide-react'
import { DataTable } from '@/components/common'
import { useAuditLogTable } from '@/hooks'
import { formatTimestamp } from '@/lib/utils'
import type { AuditLogEntry, AuditLogTableProps, Column } from '@/types'

export function AuditLogTable({
  logs,
  loading = false,
  sortBy,
  sortOrder,
  onSort,
}: AuditLogTableProps) {
  const { t } = useAuditLogTable()

  const columns: Column<AuditLogEntry>[] = [
    {
      key: 'createdAt',
      label: t('audit.timestamp'),
      sortable: true,
      render: value => (
        <span className="font-mono text-xs">{formatTimestamp(String(value ?? ''))}</span>
      ),
    },
    {
      key: 'actor',
      label: t('audit.actor'),
    },
    {
      key: 'action',
      label: t('audit.action'),
      render: value => <span className="text-sm font-medium">{String(value ?? '')}</span>,
    },
    {
      key: 'resource',
      label: t('audit.resource'),
    },
    {
      key: 'resourceId',
      label: t('audit.resourceId'),
      className: 'font-mono text-xs',
    },
    {
      key: 'ipAddress',
      label: t('audit.ipAddress'),
      className: 'font-mono text-xs',
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={logs}
      loading={loading}
      emptyMessage={t('audit.noLogs')}
      emptyIcon={<ScrollText className="h-6 w-6" />}
      emptyDescription={t('audit.noLogsDescription')}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  )
}
