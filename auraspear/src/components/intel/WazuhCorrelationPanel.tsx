'use client'

import { Link2 } from 'lucide-react'
import { DataTable, OsintEnrichButton, OsintFileUploadButton, SeverityBadge } from '@/components/common'
import type { AlertSeverity } from '@/enums'
import { useWazuhCorrelationPanel } from '@/hooks'
import { isFileOrHashType, normalizeIocType } from '@/lib/entity.utils'
import { formatRelativeTime } from '@/lib/utils'
import type { IOCCorrelation, WazuhCorrelationPanelProps, Column } from '@/types'

export function WazuhCorrelationPanel({
  correlations,
  loading = false,
  sortBy,
  sortOrder,
  onSort,
}: WazuhCorrelationPanelProps) {
  const { t, tCommon } = useWazuhCorrelationPanel()

  const columns: Column<IOCCorrelation>[] = [
    {
      key: 'iocValue',
      label: t('correlation.iocValue'),
      className: 'font-mono text-xs',
    },
    {
      key: 'iocType',
      label: t('correlation.type'),
      sortable: true,
      render: value => (
        <span className="text-sm tracking-wide uppercase">{String(value ?? '')}</span>
      ),
    },
    {
      key: 'source',
      label: t('correlation.source'),
      sortable: true,
    },
    {
      key: 'hitCount',
      label: t('correlation.hitCount'),
      className: 'text-center',
      sortable: true,
      render: value => (
        <span className="font-mono text-sm font-semibold">{String(value ?? '0')}</span>
      ),
    },
    {
      key: 'lastSeen',
      label: t('correlation.lastSeen'),
      sortable: true,
      render: value => (
        <span className="text-muted-foreground text-sm">
          {formatRelativeTime(String(value ?? ''))}
        </span>
      ),
    },
    {
      key: 'severity',
      label: t('correlation.severity'),
      sortable: true,
      render: value => <SeverityBadge severity={String(value ?? 'info') as AlertSeverity} />,
    },
    {
      key: 'osintEnrich',
      label: tCommon('enrichOsint'),
      render: (_value, row) => {
        const rawType = String(row.iocType ?? 'ip')
        const normalized = normalizeIocType(rawType)
        return (
          <div className="flex items-center gap-1">
            <OsintEnrichButton
              iocType={normalized}
              iocValue={String(row.iocValue ?? '')}
              t={tCommon}
            />
            {isFileOrHashType(rawType) && <OsintFileUploadButton t={tCommon} />}
          </div>
        )
      },
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={correlations}
      loading={loading}
      emptyMessage={t('correlation.noMatches')}
      emptyIcon={<Link2 className="h-6 w-6" />}
      emptyDescription={t('correlation.noMatchesDescription')}
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
    />
  )
}
