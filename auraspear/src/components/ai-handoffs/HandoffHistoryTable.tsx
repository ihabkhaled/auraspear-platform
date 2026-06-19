import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiHandoffHistoryItem, Column, TranslationFn } from '@/types'

export function HandoffHistoryTable({
  t,
  data,
  loading,
}: {
  t: TranslationFn
  data: AiHandoffHistoryItem[]
  loading: boolean
}) {
  const columns: Column<AiHandoffHistoryItem>[] = [
    {
      key: 'findingTitle',
      label: t('table.finding'),
      render: (value) => (
        <span className="line-clamp-1 max-w-xs text-sm">{value as string}</span>
      ),
    },
    {
      key: 'findingType',
      label: t('table.type'),
      render: (value) => <Badge variant="secondary">{value as string}</Badge>,
    },
    {
      key: 'severity',
      label: t('table.severity'),
      render: (value) => {
        const sev = value as string | null
        if (!sev) {
          return '-'
        }
        return (
          <Badge variant={sev === 'critical' || sev === 'high' ? 'destructive' : 'secondary'}>
            {sev}
          </Badge>
        )
      },
    },
    {
      key: 'linkedModule',
      label: t('table.promotedTo'),
      render: (value) => <Badge variant="success">{value as string}</Badge>,
    },
    {
      key: 'linkedEntityId',
      label: t('table.entityId'),
      render: (value) => (
        <span className="font-mono text-xs">{(value as string).slice(0, 8)}</span>
      ),
    },
    {
      key: 'agentId',
      label: t('table.agent'),
      render: (value) => (value as string | null) ?? '-',
    },
    {
      key: 'createdAt',
      label: t('table.promotedAt'),
      render: (value) => formatTimestamp(value as string),
    },
  ]

  return <DataTable columns={columns} data={data} loading={loading} emptyMessage={t('noHistory')} />
}
