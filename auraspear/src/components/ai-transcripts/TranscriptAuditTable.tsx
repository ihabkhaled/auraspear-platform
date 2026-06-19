import { DataTable } from '@/components/common'
import { Badge } from '@/components/ui'
import { formatTimestamp } from '@/lib/dayjs'
import type { AiAuditLogEntry, Column, TranslationFn } from '@/types'

export function TranscriptAuditTable({
  t,
  data,
  loading,
}: {
  t: TranslationFn
  data: AiAuditLogEntry[]
  loading: boolean
}) {
  const columns: Column<AiAuditLogEntry>[] = [
    { key: 'actor', label: t('audit.actor') },
    {
      key: 'action',
      label: t('audit.action'),
      render: (value) => <Badge variant="secondary">{value as string}</Badge>,
    },
    { key: 'model', label: t('audit.model') },
    {
      key: 'inputTokens',
      label: t('audit.inputTokens'),
      render: (value) => Number(value ?? 0).toLocaleString(),
    },
    {
      key: 'outputTokens',
      label: t('audit.outputTokens'),
      render: (value) => Number(value ?? 0).toLocaleString(),
    },
    {
      key: 'durationMs',
      label: t('audit.duration'),
      render: (value) => {
        const ms = Number(value ?? 0)
        return ms > 0 ? `${String(ms)}ms` : '-'
      },
    },
    {
      key: 'createdAt',
      label: t('audit.date'),
      render: (value) => formatTimestamp(value as string),
    },
  ]

  return <DataTable columns={columns} data={data} loading={loading} emptyMessage={t('noAuditLogs')} />
}
