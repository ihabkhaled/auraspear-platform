'use client'

import { Globe } from 'lucide-react'
import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { useMispEventFeed } from '@/hooks'
import { getThreatLevelVariant, truncateInfo } from '@/lib/intel-utils'
import { formatRelativeTime } from '@/lib/utils'
import type { MISPEvent, MISPEventFeedProps, Column } from '@/types'
import { MispTagPill } from './MispTagPill'

export function MispEventFeed({
  events,
  loading = false,
  onEventClick,
  sortBy,
  sortOrder,
  onSort,
}: MISPEventFeedProps) {
  const { t } = useMispEventFeed()

  const columns: Column<MISPEvent>[] = [
    {
      key: 'mispEventId',
      label: t('misp.eventId'),
      className: 'font-mono text-xs',
    },
    {
      key: 'organization',
      label: t('misp.organization'),
      sortable: true,
    },
    {
      key: 'info',
      label: t('misp.info'),
      render: value => (
        <span className="text-sm" title={String(value ?? '')}>
          {truncateInfo(String(value ?? ''))}
        </span>
      ),
    },
    {
      key: 'threatLevel',
      label: t('misp.threatLevel'),
      sortable: true,
      render: value => (
        <Badge variant={getThreatLevelVariant(String(value ?? ''))}>{String(value ?? '')}</Badge>
      ),
    },
    {
      key: 'tags',
      label: t('misp.tags'),
      render: value => {
        const tags = value as string[] | undefined
        if (!tags || !Array.isArray(tags) || tags.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }
        return (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag, index) => (
              <MispTagPill key={tag + String(index)} name={tag} />
            ))}
            {tags.length > 3 && (
              <span className="text-muted-foreground text-xs">+{tags.length - 3}</span>
            )}
          </div>
        )
      },
    },
    {
      key: 'attributeCount',
      label: t('misp.attributes'),
      className: 'text-center',
      sortable: true,
      render: value => <span className="font-mono text-sm">{String(value ?? '0')}</span>,
    },
    {
      key: 'date',
      label: t('misp.lastUpdated'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground text-sm">
          {formatRelativeTime(String(value ?? ''))}
        </span>
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={events}
      loading={loading}
      onRowClick={onEventClick}
      emptyMessage={t('misp.noEvents')}
      emptyIcon={<Globe className="h-6 w-6" />}
      emptyDescription={t('misp.noEventsDescription')}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  )
}
