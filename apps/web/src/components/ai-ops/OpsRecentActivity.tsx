import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiOpsRecentItem, Column, TranslationFn } from '@/types'

export function OpsRecentActivity({
  t,
  data,
}: {
  t: TranslationFn
  data: AiOpsRecentItem[]
}) {
  const columns: Column<AiOpsRecentItem>[] = [
    {
      key: 'type',
      label: t('recent.type'),
      render: (value) => <Badge variant="secondary">{value as string}</Badge>,
    },
    { key: 'title', label: t('recent.title') },
    {
      key: 'status',
      label: t('recent.status'),
      render: (value) => {
        const status = value as string
        const variant =
          status === 'completed' || status === 'applied'
            ? 'success'
            : status === 'failed'
              ? 'destructive'
              : 'secondary'
        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      key: 'agentId',
      label: t('recent.agent'),
      render: (value) => (value as string | null) ?? '-',
    },
    {
      key: 'sourceModule',
      label: t('recent.module'),
      render: (value) => (value as string | null) ?? '-',
    },
    {
      key: 'createdAt',
      label: t('recent.time'),
      render: (value) => formatTimestamp(value as string),
    },
  ]

  return (
    <DataTable columns={columns} data={data} loading={false} emptyMessage={t('recent.empty')} />
  )
}
