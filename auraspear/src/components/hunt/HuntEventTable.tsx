'use client'

import { Crosshair } from 'lucide-react'
import { DataTable, Pagination, SeverityBadge } from '@/components/common'
import type { AlertSeverity } from '@/enums'
import { useHuntEventTable } from '@/hooks'
import { formatTimestamp } from '@/lib/utils'
import type { Column, HuntEvent, HuntEventTableProps } from '@/types'

export function HuntEventTable({
  events,
  loading = false,
  page,
  totalPages,
  total,
  onPageChange,
}: HuntEventTableProps) {
  const { t } = useHuntEventTable()

  const columns: Column<HuntEvent>[] = [
    {
      key: 'timestamp',
      label: t('columnTimestamp'),
      render: value => (
        <span className="text-muted-foreground font-mono text-xs">
          {formatTimestamp(value as string)}
        </span>
      ),
    },
    {
      key: 'severity',
      label: t('columnSeverity'),
      render: value => <SeverityBadge severity={value as AlertSeverity} />,
    },
    {
      key: 'eventId',
      label: t('columnEventId'),
      render: value => <span className="font-mono text-xs">{value as string}</span>,
    },
    {
      key: 'sourceIp',
      label: t('columnSourceIp'),
      render: value => <span className="font-mono text-xs">{(value as string | null) ?? '—'}</span>,
    },
    {
      key: 'user',
      label: t('columnUser'),
      render: value => <span>{(value as string | null) ?? '—'}</span>,
    },
    {
      key: 'description',
      label: t('columnDescription'),
      className: 'max-w-[300px] truncate',
    },
  ]

  const showPagination =
    page !== undefined && totalPages !== undefined && onPageChange !== undefined && totalPages > 1

  return (
    <div className="px-4 pb-4">
      <DataTable
        columns={columns}
        data={events}
        loading={loading}
        emptyMessage={t('noEvents')}
        emptyIcon={<Crosshair className="h-6 w-6" />}
      />
      {showPagination && (
        <div className="mt-4">
          <Pagination
            page={page ?? 1}
            totalPages={totalPages ?? 1}
            onPageChange={onPageChange ?? (() => {})}
            total={total ?? 0}
          />
        </div>
      )}
    </div>
  )
}
